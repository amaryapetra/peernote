"use client";

import { useActionState } from "react";
import { createGroup, postToGroup } from "@/app/actions/groups";
import { FormMessage, SubmitButton, echoed } from "./form";
import { Field, inputClass } from "./ui";

export function CreateGroupForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(createGroup, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="courseId" value={courseId} />
      <Field label="Group name" htmlFor="name" error={state?.fieldErrors?.name}>
        <input id="name" name="name" required maxLength={80} defaultValue={echoed(state, "name")} className={inputClass} placeholder="Midterm 2 review crew" />
      </Field>
      <Field label="What's the plan?" htmlFor="description" hint="Optional">
        <textarea id="description" name="description" rows={2} maxLength={600} defaultValue={echoed(state, "description")} className={inputClass} placeholder="Working through practice problems from chapters 5 and 6." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="When" htmlFor="meeting_time" hint="Optional">
          <input id="meeting_time" name="meeting_time" maxLength={120} defaultValue={echoed(state, "meeting_time")} className={inputClass} placeholder="Thursdays 7pm" />
        </Field>
        <Field label="Where" htmlFor="location" hint="Optional">
          <input id="location" name="location" maxLength={120} defaultValue={echoed(state, "location")} className={inputClass} placeholder="Howard-Tilton, 3rd floor" />
        </Field>
      </div>
      <Field label="Max size" htmlFor="capacity" error={state?.fieldErrors?.capacity}>
        <input id="capacity" name="capacity" type="number" min={2} max={30} defaultValue={echoed(state, "capacity", "6")} className={`${inputClass} w-28`} />
      </Field>
      <SubmitButton pendingText="Creating…">Create group</SubmitButton>
    </form>
  );
}

export function GroupPostForm({ groupId }: { groupId: string }) {
  const [state, action] = useActionState(postToGroup, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="groupId" value={groupId} />
      <label htmlFor="body" className="sr-only">
        Message
      </label>
      <textarea id="body" name="body" rows={3} maxLength={2000} required defaultValue={echoed(state, "body")} className={inputClass} placeholder="Post an update, like “Moving to room 202 tonight”" />
      {state?.error && <FormMessage state={state} />}
      <SubmitButton size="sm" pendingText="Posting…">
        Post
      </SubmitButton>
    </form>
  );
}
