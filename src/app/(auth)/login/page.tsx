import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth-forms";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to PeerNote to see your classes, notes, and study partners.",
  alternates: { canonical: "/login" },
};

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  return <LoginForm next={next} linkError={params.error === "link"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Pick up right where you left off.</p>
      <Suspense fallback={<LoginForm />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <section aria-labelledby="login-help-heading" className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
        <h2 id="login-help-heading" className="font-medium">Trouble logging in?</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Forgot your password? Get an email link to choose a new one.</p>
        <ButtonLink href="/forgot-password" variant="secondary" className="w-full">Forgot password?</ButtonLink>
      </section>
      <p className="mt-6 text-center text-sm text-muted">
        New to PeerNote?{" "}
        <Link href="/signup" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
