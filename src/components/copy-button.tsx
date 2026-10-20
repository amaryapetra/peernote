"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard can be blocked; the code is visible anyway.
        }
      }}
      className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs tracking-widest hover:bg-surface-2"
      aria-label={label}
    >
      {copied ? "Copied!" : value}
    </button>
  );
}
