import type { Metadata } from "next";
import Link from "next/link";
import { CreateCourseForm, JoinByCodeForm } from "@/components/course-forms";
import { SemesterCourseFolders } from "@/components/semester-course-folders";
import { Alert, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { suggestedTerms } from "@/lib/constants";
import { getMyCourses } from "@/lib/data";

export const metadata: Metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  const { profile, supabase } = await getViewer();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const myCourses = await getMyCourses();
  const mine = new Set(myCourses.map((c) => c.id));

  type CourseMatch = { id: string; code: string; title: string; term: string; instructor: string; school: string; members_count: number };
  let results: CourseMatch[] = [];
  if (q) {
    const { data } = await supabase.rpc("search_courses", { p_query: q, p_limit: 20 });
    results = data ?? [];
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Courses" description="Join the classes you're taking to see notes, classmates, and study groups." />

      {params.left === "1" && <Alert tone="success">You left the course.</Alert>}

      <section aria-labelledby="find-heading" className="space-y-4">
        <h2 id="find-heading" className="font-display text-xl font-semibold">Find a course</h2>
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">
            Search by course code, name, or professor
          </label>
          <input id="q" name="q" defaultValue={q} className={inputClass} placeholder="Search by code, name, or professor (e.g. ECON 3010)" />
          <button type="submit" className="h-10 shrink-0 rounded-lg bg-brand px-4 text-sm font-medium text-on-brand hover:bg-brand-strong">
            Search
          </button>
        </form>
        {q &&
          (results.length === 0 ? (
            <EmptyState title={`No courses match “${q}”`}>Be the first: add it below so your classmates can join.</EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {results.map((course) => (
                <li key={course.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {course.code}: {course.title}
                    </p>
                    <p className="text-sm text-muted">
                      {[course.term, course.instructor, course.school].filter(Boolean).join(" · ")} · {course.members_count} student
                      {course.members_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  {mine.has(course.id) ? (
                    <Link href={`/courses/${course.id}`} className="text-sm font-medium text-brand hover:underline">
                      Open
                    </Link>
                  ) : (
                    <a href="#join-with-code" className="text-sm font-medium text-brand hover:underline">
                      Join with invite code
                    </a>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </section>

      <section aria-labelledby="mine-heading" className="space-y-4">
        <h2 id="mine-heading" className="font-display text-xl font-semibold">Your courses</h2>
        {myCourses.length === 0 ? (
          <EmptyState title="No courses yet">Search above, join with a code, or add a course below.</EmptyState>
        ) : (
          <SemesterCourseFolders courses={myCourses} currentTerm={suggestedTerms()[0]} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">Add a course</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Can&apos;t find your class? Add it and you&apos;ll get a join code to share.</p>
          <CreateCourseForm terms={suggestedTerms()} defaultSchool={profile?.school ?? "Tulane University"} />
        </Card>
        <Card className="h-fit">
          <h2 id="join-with-code" className="scroll-mt-20 font-display text-xl font-semibold">Have an invite code?</h2>
          <p className="mb-4 mt-1 text-sm text-muted">Ask a classmate for its 12-character invite code. Finding a class does not grant access to notes.</p>
          <JoinByCodeForm />
        </Card>
      </div>
    </div>
  );
}
