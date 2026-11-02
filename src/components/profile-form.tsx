"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { AVAILABILITY, STUDY_STYLES } from "@/lib/constants";
import { FormMessage, SubmitButton, echoed, echoedList } from "./form";
import { Field, inputClass } from "./ui";

type ProfileValues = {
  full_name: string;
  school: string;
  major: string;
  grad_year: number | null;
  bio: string;
  study_styles: string[];
  availability: string[];
  contact: string;
  phone: string;
};

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
  hint,
}: {
  legend: string;
  name: string;
  options: readonly { id: string; label: string }[];
  selected: string[];
  hint: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="mb-2 text-xs text-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className="cursor-pointer rounded-full border border-line bg-surface px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-brand-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]"
          >
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="full_name" error={state?.fieldErrors?.full_name}>
          <input id="full_name" name="full_name" defaultValue={echoed(state, "full_name", initial.full_name)} required maxLength={80} className={inputClass} />
        </Field>
        <Field label="School" htmlFor="school" error={state?.fieldErrors?.school}>
          <input id="school" name="school" defaultValue={echoed(state, "school", initial.school)} required maxLength={120} className={inputClass} />
        </Field>
        <Field label="Major" htmlFor="major" hint="Optional">
          <input id="major" name="major" defaultValue={echoed(state, "major", initial.major)} maxLength={120} className={inputClass} placeholder="Mathematics and Economics" />
        </Field>
        <Field label="Graduation year" htmlFor="grad_year" error={state?.fieldErrors?.grad_year} hint="Optional">
          <input id="grad_year" name="grad_year" inputMode="numeric" defaultValue={echoed(state, "grad_year", initial.grad_year ? String(initial.grad_year) : "")} maxLength={4} className={inputClass} placeholder="2027" />
        </Field>
      </div>
      <Field label="About you" htmlFor="bio" error={state?.fieldErrors?.bio} hint="A sentence or two classmates will see. What are you working on?">
        <textarea id="bio" name="bio" defaultValue={echoed(state, "bio", initial.bio)} rows={3} maxLength={600} className={inputClass} />
      </Field>
      <CheckboxGroup
        legend="How you like to study"
        name="study_styles"
        options={STUDY_STYLES}
        selected={echoedList(state, "study_styles", initial.study_styles)}
        hint="Pick any that fit. Used to match you with study partners."
      />
      <CheckboxGroup
        legend="When you're usually free to study"
        name="availability"
        options={AVAILABILITY}
        selected={echoedList(state, "availability", initial.availability)}
        hint="Partners with overlapping times rank higher."
      />
      <Field
        label="Other contact info (optional)"
        htmlFor="contact"
        error={state?.fieldErrors?.contact}
        hint="Email, Instagram, or GroupMe. Shown only after you both agree to connect."
      >
        <input id="contact" name="contact" defaultValue={echoed(state, "contact", initial.contact)} maxLength={200} className={inputClass} />
      </Field>
      <Field
        label="Phone number (optional)"
        htmlFor="phone"
        error={state?.fieldErrors?.phone}
        hint="Only accepted study partners can see this. Leave blank or clear it to stop sharing your number. You can also use Messages without sharing a phone number."
      >
        <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={echoed(state, "phone", initial.phone)} maxLength={40} className={inputClass} placeholder="e.g. +1 (504) 555-0123" />
      </Field>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
