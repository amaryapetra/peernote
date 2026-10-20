import type { Metadata } from "next";
import Link from "next/link";
import { joinCourse } from "@/app/actions/courses";
import { CreateCourseForm, JoinByCodeForm } from "@/components/course-forms";
import { SubmitButton } from "@/components/form";
import { Alert, Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/ui";
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

  let results: typeof myCourses = [];
  if (q) {
    // Strip characters that have meaning in PostgREST filter syntax.
    const term = q.replace(/[%_,()*\\]/g, " ").trim();
    const { data } = await supabase
      .from("courses")
      .select("*")
      .or(`code.ilike.%${term}%,title.ilike.%${term}%,instructor.ilike.%${term}%`)
      .order("members_count", { ascending: false })
      .limit(20);
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
                    <form action={joinCourse}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <SubmitButton size="sm" pendingText="Joining…">
                        Join course
                      </SubmitButton>
                    </form>
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
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myCourses.map((course) => (
              <li key={course.id}>
                <Link href={`/courses/${course.id}`} className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-brand/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-brand">{course.code}</p>
                    <Badge>{course.term}</Badge>
                  </div>
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
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl font-semibold">Add a course</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Can&apos;t find your class? Add it and you&apos;ll get a join code to share.</p>
          <CreateCourseForm terms={suggestedTerms()} defaultSchool={profile?.school ?? "Tulane University"} />
        </Card>
        <Card className="h-fit">
          <h2 className="font-display text-xl font-semibold">Have a join code?</h2>
          <p className="mb-4 mt-1 text-sm text-muted">A classmate can share their course&apos;s 6-character code with you.</p>
          <JoinByCodeForm />
        </Card>
      </div>
    </div>
  );
}
