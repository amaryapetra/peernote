import Link from "next/link";
import type { Tables } from "@/lib/database.types";
import { groupCoursesBySemester } from "@/lib/course-semesters";

type Course = Tables<"courses">;

/** Expandable term folders; existing enrollments are grouped without moving data. */
export function SemesterCourseFolders({ courses, currentTerm }: { courses: Course[]; currentTerm: string }) {
  const folders = groupCoursesBySemester(courses);
  const hasCurrent = folders.some(({ term }) => term === currentTerm);

  return (
    <div className="space-y-3">
      {folders.map(({ term, courses: items }, index) => (
        <details
          key={term}
          open={term === currentTerm || (!hasCurrent && index === 0)}
          className="group overflow-hidden rounded-xl border border-line bg-surface"
        >
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand sm:px-5 [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-6 shrink-0 text-brand">
              <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2.3 2.5h6.2A2.5 2.5 0 0 1 21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5Z" />
            </svg>
            <span className="min-w-0 flex-1 font-display text-lg font-semibold">{term}</span>
            <span className="text-sm text-muted">{items.length} course{items.length === 1 ? "" : "s"}</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <ul className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
            {items.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`} className="block h-full rounded-lg border border-line bg-surface p-4 transition-colors hover:border-brand/40 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-brand">
                  <p className="text-sm font-medium text-brand">{course.code}</p>
                  <p className="mt-1 font-display text-lg font-semibold">{course.title}</p>
                  {course.instructor && <p className="text-sm text-muted">{course.instructor}</p>}
                  <p className="mt-3 text-sm text-muted">
                    {course.members_count} student{course.members_count === 1 ? "" : "s"} · {course.notes_count} note
                    {course.notes_count === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
