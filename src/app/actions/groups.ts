"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/form";

const MEETING_DURATIONS = [30, 60, 90, 120, 180];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A meeting start time between now and two years out, or an error message. */
function meetingStart(iso: string): Date | string {
  const starts = new Date(iso);
  const t = starts.getTime();
  if (!Number.isFinite(t) || t < Date.now() - 60_000 || t > Date.now() + 2 * 365 * 86_400_000) {
    return "Choose a future meeting date within two years.";
  }
  return starts;
}

const GroupSchema = z.object({
  name: z.string().trim().min(2, "Name your group.").max(80),
  description: z.string().trim().max(600),
  starts_at_iso: z.string().trim().max(40),
  duration_minutes: z.coerce.number().int().refine((d) => MEETING_DURATIONS.includes(d), "Pick a meeting length."),
  location: z.string().trim().max(120),
  capacity: z.coerce.number().int().min(2, "Groups need at least 2 people.").max(30, "Keep groups to 30 or fewer."),
});

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const values = Object.fromEntries(["name", "description", "duration_minutes", "location", "capacity"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = GroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    starts_at_iso: formData.get("starts_at_iso") ?? "",
    duration_minutes: formData.get("duration_minutes") ?? "60",
    location: formData.get("location") ?? "",
    capacity: formData.get("capacity") || 6,
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { starts_at_iso, duration_minutes, ...fields } = parsed.data;
  const starts = starts_at_iso ? meetingStart(starts_at_iso) : null;
  if (typeof starts === "string") return { values, error: starts };
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
  const {data: prior} = await supabase.from("group_rsvps").select("group_id")
    .eq("group_id", groupId).eq("user_id", user.id).maybeSingle();
  const nextStatus = status as "going" | "maybe" | "not_going";
  const result = prior
    ? await supabase.from("group_rsvps").update({status:nextStatus,updated_at:new Date().toISOString()})
        .eq("group_id",groupId).eq("user_id",user.id)
    : await supabase.from("group_rsvps").insert({group_id:groupId,user_id:user.id,status:nextStatus});
  if(result.error) throw new Error("Join this group before responding.");
  refresh();
}

/** Organizer sets or changes the meeting time; members get a group message about it. */
export async function scheduleMeeting(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 60);
  if (!UUID.test(groupId)) return { error: "Group not found." };
  if (!MEETING_DURATIONS.includes(duration)) return { error: "Pick a meeting length." };
  const starts = meetingStart(String(formData.get("starts_at_iso") ?? ""));
  if (typeof starts === "string") return { error: starts };
  const supabase = await createClient();
  const { data: before } = await supabase.from("study_groups").select("meeting_starts_at")
    .eq("id", groupId).eq("created_by", user.id).maybeSingle();
  if (!before) return { error: "Only the group organizer can schedule meetings." };
  const { error } = await supabase.from("study_groups").update({
    meeting_starts_at: starts.toISOString(),
    meeting_ends_at: new Date(starts.getTime() + duration * 60_000).toISOString(),
  }).eq("id", groupId).eq("created_by", user.id);
  if (error) return { error: "Couldn't save the meeting time. Try again." };
  // Posting to the board notifies every member through the group message trigger.
  await supabase.from("group_posts").insert({
    group_id: groupId,
    author_id: user.id,
    body: before.meeting_starts_at
      ? "Our study group meeting has been rescheduled. See the updated time above."
      : "Our study group meeting is scheduled. See the time above and RSVP.",
  });
  refresh();
  return { success: "Meeting time saved." };
}
