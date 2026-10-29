import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a free PeerNote account to share class notes and find study partners in your courses.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-muted">For Tulane students with an @tulane.edu email address.</p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
