"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export const APP_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/partners", label: "Study partners" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
] as const;

export function AppNavLinks() {
  const pathname = usePathname();
  return (
    <>
      {APP_LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`) ||
          (link.href === "/courses" && (pathname.startsWith("/notes/") || pathname.startsWith("/groups/")));
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function StaticNavLinks() {
  return (
    <>
      {APP_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink">
          {link.label}
        </Link>
      ))}
    </>
  );
}
