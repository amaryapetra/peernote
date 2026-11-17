import type { Metadata } from "next";
import { Suspense } from "react";
import { confirmEmailLink } from "@/app/actions/auth";
import { SubmitButton } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Continue",
  robots: { index: false },
};

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

// Email links land here first. Nothing happens until the student presses the button,
// so an email scanner opening the link can't use up the one-time token.
async function ConfirmLinkContent({ searchParams }: { searchParams: PageProps<"/confirm-link">["searchParams"] }) {
  const params = await searchParams;
  const tokenHash = one(params.token_hash);
  const type = one(params.type);
  const next = one(params.next);
  const isRecovery = type === "recovery";

  if (!tokenHash || !type) {
    return (
      <>
        <h1 className="font-display text-2xl font-semibold">That link is incomplete</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Open the newest link from your email, or request a new one.</p>
        <ButtonLink href="/forgot-password" className="w-full">Get a new reset link</ButtonLink>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl font-semibold">{isRecovery ? "Reset your password" : "Confirm your email"}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {isRecovery ? "Press continue to choose a new password." : "Press continue to finish setting up your PeerNote account."}
      </p>
      <form action={confirmEmailLink}>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        {next && <input type="hidden" name="next" value={next} />}
        <SubmitButton className="w-full" pendingText="Checking…">Continue</SubmitButton>
      </form>
    </>
  );
}

export default function ConfirmLinkPage({ searchParams }: PageProps<"/confirm-link">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <ConfirmLinkContent searchParams={searchParams} />
    </Suspense>
  );
}
