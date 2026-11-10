"use client";

import { useActionState, useState } from "react";
import { scheduleMeeting } from "@/app/actions/groups";
import { FormMessage, SubmitButton } from "@/components/form";
import { inputClass } from "@/components/ui";

/** Organizer-only form to set or change a group's meeting time. */
export function MeetingEditor({ groupId, scheduled }: { groupId: string; scheduled: boolean }) {
  const [state, action] = useActionState(scheduleMeeting, undefined);
  const [local, setLocal] = useState("");
  // datetime-local has no timezone; convert it in the browser so the server stores the right moment.
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <details className="mt-4 rounded-lg border border-line p-3" open={!scheduled}>
      <summary className="cursor-pointer text-sm font-medium">
        {scheduled ? "Reschedule meeting (organizer)" : "Schedule a meeting (organizer)"}
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <FormMessage state={state} />
        <div className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="groupId" value={groupId} />
          <input type="hidden" name="starts_at_iso" value={iso} />
          <label className="text-xs">
            Date and time
            <input type="datetime-local" required value={local} onChange={(e) => setLocal(e.target.value)} className={inputClass} />
          </label>
          <label className="text-xs">
            Duration
            <select name="duration_minutes" defaultValue="60" className={inputClass}>
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="90">90 min</option>
              <option value="120">2 hours</option>
              <option value="180">3 hours</option>
            </select>
          </label>
          <SubmitButton size="sm" pendingText="Saving…">
            {scheduled ? "Update time" : "Set time"}
          </SubmitButton>
        </div>
      </form>
    </details>
  );
}
