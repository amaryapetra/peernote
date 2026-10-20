"use client";

import { useActionState } from "react";
import { createCourse, joinByCode } from "@/app/actions/courses";
import { FormMessage, SubmitButton, echoed } from "./form";
import { Field, inputClass } from "./ui";

export function CreateCourseForm({ terms, defaultSchool }: { terms: string[]; defaultSchool: string }) {
  const [state, action] = useActionState(createCourse, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course code" htmlFor="code" error={state?.fieldErrors?.code} hint="Like ECON 3010">
          <input id="code" name="code" required maxLength={20} defaultValue={echoed(state, "code")} className={inputClass} placeholder="MATH 3090" />
        </Field>
        <Field label="Term" htmlFor="term" error={state?.fieldErrors?.term}>
          <select id="term" name="term" className={inputClass} defaultValue={echoed(state, "term", terms[0])}>
            {terms.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Course name" htmlFor="title" error={state?.fieldErrors?.title}>
        <input id="title" name="title" required maxLength={120} defaultValue={echoed(state, "title")} className={inputClass} placeholder="Linear Algebra" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Professor" htmlFor="instructor" hint="Optional. Helps classmates find the right section.">
          <input id="instructor" name="instructor" maxLength={80} defaultValue={echoed(state, "instructor")} className={inputClass} placeholder="Prof. Rivera" />
        </Field>
        <Field label="School" htmlFor="school" error={state?.fieldErrors?.school}>
          <input id="school" name="school" maxLength={120} className={inputClass} defaultValue={echoed(state, "school", defaultSchool)} />
        </Field>
      </div>
      <SubmitButton pendingText="Adding…">Add course</SubmitButton>
    </form>
  );
}

export function JoinByCodeForm() {
  const [state, action] = useActionState(joinByCode, undefined);
  return (
    <form action={action} className="space-y-3" noValidate>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <label htmlFor="join-code" className="sr-only">
          Join code
        </label>
        <input
          id="join-code"
          name="code"
          defaultValue={echoed(state, "code")}
          required
          maxLength={6}
          autoCapitalize="characters"
          className={`${inputClass} font-mono uppercase tracking-widest`}
          placeholder="A1B2C3"
        />
        <SubmitButton variant="secondary" pendingText="Joining…">
          Join
        </SubmitButton>
      </div>
    </form>
  );
}
