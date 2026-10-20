import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">You&apos;re signed in from the reset link. Pick something you&apos;ll remember.</p>
      <ResetPasswordForm />
    </>
  );
}
