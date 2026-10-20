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
    meeting_time: formData.get("meeting_time") ?? "",
    location: formData.get("location") ?? "",
    capacity: formData.get("capacity") || 6,
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_groups")
    .insert({ ...parsed.data, course_id: courseId, created_by: user.id })
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
