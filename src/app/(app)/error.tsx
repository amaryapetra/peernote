"use client";

import { buttonClass } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">We couldn&apos;t load this page. It&apos;s probably temporary.</p>
      <button type="button" onClick={reset} className={`${buttonClass("primary")} mt-6`}>
        Try again
      </button>
    </div>
  );
}
