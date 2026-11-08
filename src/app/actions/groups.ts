"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/form";

const GroupSchema = z.object({
  name: z.string().trim().min(2, "Name your group.").max(80),
  description: z.string().trim().max(600),
  meeting_time: z.string().trim().max(120),
  starts_at_iso: z.string().trim().max(40),
  duration_minutes: z.coerce.number().int().min(30).max(240),
  location: z.string().trim().max(120),
  capacity: z.coerce.number().int().min(2, "Groups need at least 2 people.").max(30, "Keep groups to 30 or fewer."),
});

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const values = Object.fromEntries(["name", "description", "meeting_time", "location", "capacity"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = GroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    meeting_time: "",
    starts_at_iso: formData.get("starts_at_iso") ?? "",
    duration_minutes: formData.get("duration_minutes") ?? "60",
    location: formData.get("location") ?? "",
    capacity: formData.get("capacity") || 6,
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { starts_at_iso, duration_minutes, ...fields } = parsed.data;
  const starts = starts_at_iso ? new Date(starts_at_iso) : null;
  if (starts && (!Number.isFinite(starts.getTime()) || starts.getTime() < Date.now() - 60000 || starts.getTime() > Date.now() + 2*365*86400000)) {
    return { values, error: "Choose a future meeting date within two years." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_groups")
    .insert({ ...fields, course_id: courseId, created_by: user.id,
      meeting_starts_at: starts?.toISOString() ?? null,
      meeting_ends_at: starts ? new Date(starts.getTime()+duration_minutes*60000).toISOString() : null })
    .select("id")
    .single();
  if (error || !data) return { values, error: "Couldn't create the group. Make sure you've joined this course." };
  redirect(`/groups/${data.id}?created=1`);
}

export async function joinGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
  redirect(`/groups/${groupId}${error ? (error.message.includes("full") ? "?full=1" : "?error=1") : "?joined=1"}`);
}

export async function leaveGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const supabase = await createClient();
  await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
  refresh();
}

export async function deleteGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await createClient();
  await supabase.from("study_groups").delete().eq("id", groupId).eq("created_by", user.id);
  redirect(`/courses/${courseId}/groups`);
}

export async function postToGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write a message first." };
  if (body.length > 2000) return { values: { body }, error: "Keep messages under 2,000 characters." };
  const supabase = await createClient();
  const { error } = await supabase.from("group_posts").insert({ group_id: groupId, author_id: user.id, body });
  if (error) return { values: { body }, error: "Only group members can post here." };
  refresh();
  return { success: "Posted." };
}

export async function rsvpToGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(groupId) || !["going","maybe","not_going"].includes(status)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("group_rsvps").upsert({
    group_id: groupId, user_id: user.id, status: status as "going"|"maybe"|"not_going",
    updated_at: new Date().toISOString(),
  }, { onConflict: "group_id,user_id" });
  if (error) throw new Error("Join this group before responding.");
  refresh();
}

export async function rescheduleGroup(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const iso = String(formData.get("starts_at_iso") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 60);
  const starts = new Date(iso);
  if (!/^[a-f0-9-]{36}$/i.test(groupId) || !Number.isFinite(starts.getTime()) ||
      starts.getTime() <= Date.now() || ![30,60,90,120,180].includes(duration)) return;
  const supabase = await createClient();
  const { data, error } = await supabase.from("study_groups").update({
    meeting_starts_at: starts.toISOString(),
    meeting_ends_at: new Date(starts.getTime()+duration*60000).toISOString(),
  }).eq("id",groupId).eq("created_by",user.id).select("id").maybeSingle();
  if(error || !data) throw new Error("Only the group organizer can reschedule.");
  // Notify current members via the group message trigger.
  await supabase.from("group_posts").insert({group_id:groupId,author_id:user.id,body:"Our study group meeting has been rescheduled. See the updated time above."});
  refresh();
}
