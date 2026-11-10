"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 2000;

/** Send a direct message. RLS only allows it between accepted study partners. */
export async function sendDirectMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const recipientId = String(formData.get("recipientId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!UUID.test(recipientId) || recipientId === user.id) return { error: "Choose a study partner to message." };
  if (!body) return { error: "Write a message first." };
  if (body.length > MAX_MESSAGE_LENGTH) return { values: { body }, error: "Keep messages under 2,000 characters." };

  const supabase = await createClient();
  const { error } = await supabase.from("direct_messages").insert({ sender_id: user.id, recipient_id: recipientId, body });
  if (error) {
    console.error("sendDirectMessage failed", error.code, error.message);
    let message = "Couldn't send your message. Try again in a moment.";
    // 54000: our flood limit. 42501: RLS refused it (not partners).
    // 42P01 / PGRST205: the direct_messages table hasn't been created in this database yet.
    if (error.code === "54000") message = "You're sending messages too quickly. Wait a minute and try again.";
    else if (error.code === "42501") message = "You can only message people who are your study partners.";
    else if (error.code === "42P01" || error.code === "PGRST205")
      message = "Messaging isn't set up on PeerNote yet. Ask your team to run the direct messages database update in Supabase.";
    return { values: { body }, error: message };
  }
  refresh();
  return undefined;
}

/** Mark everything a partner sent you as read, plus the matching notification. */
export async function markConversationRead(partnerId: string) {
  const user = await requireUser();
  if (!UUID.test(partnerId)) return;
  const supabase = await createClient();
  const now = new Date().toISOString();
  await Promise.all([
    supabase.from("direct_messages").update({ read_at: now }).eq("recipient_id", user.id).eq("sender_id", partnerId).is("read_at", null),
    supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", user.id)
      .eq("actor_id", partnerId)
      .eq("kind", "direct_message")
      .is("read_at", null),
  ]);
  refresh();
}
