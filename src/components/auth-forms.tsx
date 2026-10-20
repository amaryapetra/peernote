"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, requestPasswordReset, signUp, updatePassword } from "@/app/actions/auth";
import { FormMessage, SubmitButton, echoed } from "./form";
import { Field, inputClass } from "./ui";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action] = useActionState(logIn, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state && (
        <FormMessage state={{ error: "That link didn't work or has expired. Log in or request a new one." }} />
      )}
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={echoed(state, "email")} className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <div className="flex justify-end text-sm">
        <Link href="/forgot-password" className="text-brand hover:underline">
          Forgot password?
        </Link>
      </div>
      <SubmitButton className="w-full" pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  if (state?.success) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Full name" htmlFor="fullName" error={state?.fieldErrors?.fullName}>
        <input id="fullName" name="fullName" autoComplete="name" required defaultValue={echoed(state, "fullName")} className={inputClass} />
      </Field>
      <Field label="School email" htmlFor="email" error={state?.fieldErrors?.email} hint="Use your .edu address so classmates know it's you.">
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={echoed(state, "email")} className={inputClass} />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
      <p className="text-xs text-muted">
        By signing up you agree to share only your own notes and follow our{" "}
        <Link href="/integrity" className="text-brand hover:underline">
          academic integrity rules
        </Link>
        .
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  if (state?.success) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={echoed(state, "email")} className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="New password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
