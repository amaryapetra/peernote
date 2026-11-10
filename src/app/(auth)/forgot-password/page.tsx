import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false },
};

async function Form({ searchParams }: { searchParams: PageProps<"/forgot-password">["searchParams"] }) {
  const params = await searchParams;
  return <ForgotPasswordForm linkError={params.error === "link"} />;
}

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-muted">We&apos;ll email you a link to choose a new one.</p>
      <Suspense fallback={<ForgotPasswordForm />}><Form searchParams={searchParams} /></Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
