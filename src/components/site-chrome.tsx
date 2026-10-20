import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./logo";
import { ButtonLink } from "./ui";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

async function AuthButtons() {
  const user = isSupabaseConfigured() ? await getSessionUser() : null;
  if (user) {
    return (
      <ButtonLink href="/dashboard" size="sm">
        Open dashboard
      </ButtonLink>
    );
  }
  return <SignedOutButtons />;
}

function SignedOutButtons() {
  return (
    <>
      <ButtonLink href="/login" variant="ghost" size="sm">
        Log in
      </ButtonLink>
      <ButtonLink href="/signup" size="sm">
        Sign up free
      </ButtonLink>
    </>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="PeerNote home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/#how-it-works" className="hover:text-ink">
            How it works
          </Link>
          <Link href="/about" className="hover:text-ink">
            About
          </Link>
          <Link href="/integrity" className="hover:text-ink">
            Academic integrity
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={<SignedOutButtons />}>
            <AuthButtons />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="space-y-2">
          <Logo />
          <p className="text-muted">Class notes and study partners, for every course you take.</p>
        </div>
        <nav aria-label="Product" className="space-y-2">
          <h2 className="font-medium">Product</h2>
          <ul className="space-y-1.5 text-muted">
            <li><Link href="/#features" className="hover:text-ink">Features</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-ink">How it works</Link></li>
            <li><Link href="/signup" className="hover:text-ink">Create an account</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company" className="space-y-2">
          <h2 className="font-medium">About</h2>
          <ul className="space-y-1.5 text-muted">
            <li><Link href="/about" className="hover:text-ink">Our story and team</Link></li>
            <li><Link href="/integrity" className="hover:text-ink">Academic integrity</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
          </ul>
        </nav>
        <div className="space-y-2 text-muted">
          <h2 className="font-medium text-ink">Built at Tulane</h2>
          <p>A student project by Amelia, Avi, Emily, Amarya, Miles, and Danny.</p>
        </div>
      </div>
    </footer>
  );
}
