import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppNavLinks, StaticNavLinks } from "@/components/app-nav";
import { LogoMark } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { Skeleton } from "@/components/ui";

// Signed-in pages are private to each student, so keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2" aria-label="PeerNote dashboard">
              <LogoMark />
              <span className="hidden font-display text-lg font-semibold sm:inline">PeerNote</span>
            </Link>
            <nav aria-label="App" className="hidden items-center gap-1 md:flex">
              <Suspense fallback={<StaticNavLinks />}>
                <AppNavLinks />
              </Suspense>
            </nav>
          </div>
          <Suspense fallback={<Skeleton className="h-7 w-32" />}>
            <UserMenu />
          </Suspense>
        </div>
        <nav aria-label="App" className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
          <Suspense fallback={<StaticNavLinks />}>
            <AppNavLinks />
          </Suspense>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </>
  );
}
