"use client";

import Link from "next/link";
import { useActionState } from "react";
import { logIn, requestPasswordReset, signUp, updatePassword } from "@/app/actions/auth";
import { FormMessage, SubmitButton, echoed } from "./form";
import { ButtonLink, Field, inputClass } from "./ui";

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
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email} hint="A Tulane University email (@tulane.edu) is required. Check that inbox for your confirmation link.">
        <input id="email" name="email" type="email" autoComplete="email" required placeholder="you@tulane.edu" defaultValue={echoed(state, "email")} className={inputClass} />
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

export function ForgotPasswordForm({ linkError = false }: { linkError?: boolean }) {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state && <FormMessage state={{ error: "That reset link has expired or couldn't be verified. Enter your email below to request a new one." }} />}
      <FormMessage state={state} />
      {state?.success && <p className="text-sm text-muted">Check your inbox and spam folder. Open the newest link in the same browser where you requested it. You can correct your email below and try again if needed.</p>}
      <Field label="Account email" htmlFor="email" error={state?.fieldErrors?.email} hint="Use the email address you used to sign up.">
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={echoed(state, "email")} className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">
        {state?.success ? "Send another reset link" : "Send reset link"}
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  if (state?.success) return <div className="space-y-4"><FormMessage state={state} /><ButtonLink href="/dashboard" className="w-full">Continue to PeerNote</ButtonLink></div>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="New password" htmlFor="password" error={state?.fieldErrors?.password} hint="At least 8 characters.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={state?.fieldErrors?.confirmPassword}>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
      </Field>
      <SubmitButton className="w-full" pendingText="Saving…">
        Save new password
      </SubmitButton>
      <p className="text-center text-sm"><Link href="/forgot-password" className="text-brand hover:underline">Request a new reset link</Link></p>
    </form>
  );
}
