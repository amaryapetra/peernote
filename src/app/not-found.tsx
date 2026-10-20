import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main id="main" className="ruled flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Link href="/" aria-label="PeerNote home">
        <Logo />
      </Link>
      <h1 className="mt-10 font-display text-4xl font-semibold">This page isn&apos;t in anyone&apos;s notes</h1>
      <p className="mt-3 max-w-md text-muted">
        It may have been deleted, or it belongs to a course you haven&apos;t joined.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </main>
  );
}
