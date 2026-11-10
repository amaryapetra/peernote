import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free PeerNote account to share class notes and find study partners in your courses.",
  alternates: { canonical: "/signup" },
};

/** Where to go after signing up, such as a course invite link. */
async function nextParam(searchParams: PageProps<"/signup">["searchParams"]) {
  const { next } = await searchParams;
  return typeof next === "string" ? next : undefined;
}

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  return <SignupForm next={await nextParam(searchParams)} />;
}

async function LoginLink({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const next = await nextParam(searchParams);
  return <AuthSwitchLink href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} />;
}

function AuthSwitchLink({ href }: { href: string }) {
  return (
    <Link href={href} className="font-medium text-brand hover:underline">
      Log in
    </Link>
  );
}

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-muted">For Tulane students with an @tulane.edu email address.</p>
      <Suspense fallback={<SignupForm />}>
        <Form searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Suspense fallback={<AuthSwitchLink href="/login" />}>
          <LoginLink searchParams={searchParams} />
        </Suspense>
      </p>
    </>
  );
}
