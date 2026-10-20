export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="3" y="4" width="20" height="24" rx="3" fill="var(--brand)" />
      <rect x="9" y="4" width="20" height="24" rx="3" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M13 12h12M13 16h12M13 20h8" stroke="var(--line)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12.5 15.5h9" stroke="var(--highlight)" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M13 16h12" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">PeerNote</span>
    </span>
  );
}
