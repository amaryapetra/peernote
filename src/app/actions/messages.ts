"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/form";

const MessageSchema = z.object({
  connectionId: z.uuid("Choose a study partner."),
  body: z.string().trim().min(1, "Write a message first.").max(2000, "Keep messages under 2,000 characters."),
});

export async function sendDirectMessage(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = { body: String(formData.get("body") ?? "") };
  const parsed = MessageSchema.safeParse({ connectionId: formData.get("connectionId"), body: values.body });
  if (!parsed.success) return { values, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  // RLS rechecks the accepted connection at insertion, including direct API calls.
  const { error } = await supabase.from("direct_messages").insert({
    connection_id: parsed.data.connectionId,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { values, error: "Couldn't send. Check your connection and make sure you're still accepted study partners." };
  refresh();
  return { success: "Message sent." };
}
