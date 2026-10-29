"use client";

import { useActionState, useState } from "react";
import { sendDirectMessage } from "@/app/actions/messages";
import { FormMessage, SubmitButton, type FormState } from "./form";
import { inputClass } from "./ui";

export function MessageForm({ connectionId }: { connectionId: string }) {
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (prev: FormState, data: FormData) => {
    try {
      const result = await sendDirectMessage(prev, data);
      if (result?.success) setBody("");
      return result;
    } catch {
      return { error: "Couldn't send your message. Your draft is still here; please try again." };
    }
  }, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="connectionId" value={connectionId} />
      <label htmlFor="message-body" className="block text-sm font-medium">Your message</label>
      <textarea id="message-body" name="body" rows={3} required maxLength={2000} disabled={pending}
        value={body} onChange={(event) => setBody(event.target.value)} className={inputClass}
        placeholder="Say hi or suggest a time to study…" aria-describedby="message-limit" />
      <div className="flex items-center justify-between gap-3">
        <p id="message-limit" className="text-xs text-muted">{body.length}/2,000 characters</p>
        <SubmitButton pendingText="Sending…">Send message</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
