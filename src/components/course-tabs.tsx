"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recordCourseVisit } from "@/app/actions/courses";
import { cx } from "./ui";

export function CourseTabs({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/courses/${courseId}`;
  const tabs = [
    { href: base, label: "Notes" },
    { href: `${base}/materials`, label: "Class materials" },
    { href: `${base}/catch-up`, label: "Catch up" },
    { href: `${base}/ask`, label: "Ask the notes" },
    { href: `${base}/classmates`, label: "Classmates" },
    { href: `${base}/groups`, label: "Study groups" },
  ];
  return (
    <nav aria-label="Course sections" className="-mb-px flex gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === base || pathname.startsWith(`${base}/notes`) : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Saves this course as the student's most recent, for "pick up where you left off". */
export function TrackCourseVisit({ courseId }: { courseId: string }) {
  useEffect(() => {
    recordCourseVisit(courseId).catch(() => {});
  }, [courseId]);
  return null;
}
