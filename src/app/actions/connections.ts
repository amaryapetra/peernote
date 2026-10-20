"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function sendConnectionRequest(formData: FormData) {
  const user = await requireUser();
  const addresseeId = String(formData.get("userId") ?? "");
  const courseId = String(formData.get("courseId") ?? "") || null;
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  if (!addresseeId || addresseeId === user.id) return;
  const supabase = await createClient();
  // RLS only allows requests to classmates; the unique index blocks duplicates.
  await supabase.from("connections").insert({ requester_id: user.id, addressee_id: addresseeId, course_id: courseId, message });
  refresh();
}

export async function respondToConnection(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("connectionId") ?? "");
  const accept = formData.get("decision") === "accept";
  const supabase = await createClient();
  await supabase
    .from("connections")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("addressee_id", user.id);
  refresh();
}

export async function removeConnection(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("connectionId") ?? "");
  const supabase = await createClient();
  await supabase.from("connections").delete().eq("id", id).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  refresh();
}
