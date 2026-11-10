"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { markConversationRead, sendDirectMessage } from "@/app/actions/messages";
import { FormMessage, SubmitButton, echoed } from "./form";
import { inputClass } from "./ui";

/** Message box at the bottom of a conversation. Enter sends; Shift+Enter adds a new line. */
export function MessageComposer({ recipientId, firstName }: { recipientId: string; firstName: string }) {
  const [state, action] = useActionState(sendDirectMessage, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="recipientId" value={recipientId} />
      <label htmlFor="message-body" className="sr-only">
        Message {firstName}
      </label>
      <textarea
        id="message-body"
        name="body"
        rows={2}
        maxLength={2000}
        required
        defaultValue={echoed(state, "body")}
        className={inputClass}
        placeholder={`Message ${firstName}, like “Want to review chapter 5 Thursday at 4?”`}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {state?.error && <FormMessage state={state} />}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Enter to send · Shift+Enter for a new line</p>
        <SubmitButton size="sm" pendingText="Sending…">
          Send
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * Keeps an open conversation current: marks the partner's messages read,
 * and checks for new ones every few seconds while the tab is visible.
 */
export function ConversationLive({ partnerId, unread }: { partnerId: string; unread: number }) {
  const router = useRouter();
  useEffect(() => {
    if (unread > 0) void markConversationRead(partnerId);
  }, [partnerId, unread]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [router]);
  return null;
}

/** A timestamp in the reader's own timezone ("Tue 4:05 PM"). */
export function LocalTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const sameDay = new Date().toDateString() === date.toDateString();
  const label = date.toLocaleString(
    "en-US",
    sameDay ? { hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  );
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  );
}
