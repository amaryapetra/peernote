import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth-forms";
import { ButtonLink } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

async function PasswordResetContent() {
  const user = await getSessionUser();
  if (!user) return <>
    <h1 className="font-display text-2xl font-semibold">Request a password reset</h1>
    <p className="mb-6 mt-1 text-sm text-muted">Open the newest reset link from your email to choose a new password. If it has expired, request another below.</p>
    <ButtonLink href="/forgot-password" className="w-full">Get a reset link</ButtonLink>
  </>;
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Choose a new password, then enter it again to confirm.</p>
      <ResetPasswordForm />
    </>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p className="text-sm text-muted">Checking your reset link…</p>}><PasswordResetContent /></Suspense>;
}
