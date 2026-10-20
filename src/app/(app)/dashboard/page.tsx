import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { getMyCourses } from "@/lib/data";
import { firstName, formatDate, formatLectureDate } from "@/lib/format";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user, profile, supabase } = await getViewer();
  const courses = await getMyCourses();
  const courseIds = courses.map((c) => c.id);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  // Fall back to the newest course if they left the one they last opened.
  const lastCourse = (profile?.last_course_id && courseById.get(profile.last_course_id)) || courses[0];

  const [recentNotes, lastCourseNotes, requests, groups, insights, myNoteCount] = await Promise.all([
    courseIds.length
      ? supabase
          .from("notes")
          .select("id, title, topic, lecture_date, course_id, helpful_count, author:profiles!notes_author_id_fkey(id, full_name)")
          .in("course_id", courseIds)
          .neq("author_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    lastCourse
      ? supabase
          .from("notes")
          .select("id, title, lecture_date")
          .eq("course_id", lastCourse.id)
          .order("lecture_date", { ascending: false })
          .limit(3)
          .then((r) => r.data ?? [])
      : Promise.resolve([]),
    supabase
      .from("connections")
      .select("id, message, requester:profiles!connections_requester_id_fkey(id, full_name)")
      .eq("addressee_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3)
      .then((r) => r.data ?? []),
    supabase
      .from("group_members")
      .select("group:study_groups(id, name, meeting_time, course_id, members_count, capacity)")
      .eq("user_id", user.id)
      .limit(6)
      .then((r) => (r.data ?? []).flatMap((row) => (row.group ? [row.group] : []))),
    supabase
      .from("ai_insights")
      .select("id, kind, question, lecture_date, course_id, note_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .then((r) => r.data ?? []),
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id)
      .then((r) => r.count ?? 0),
  ]);

  const profileDone = Boolean(profile && profile.availability.length && profile.study_styles.length);
  const setupSteps = [
    { done: profileDone, label: "Add your study style and free times", href: "/profile" },
    { done: courses.length > 0, label: "Join your first course", href: "/courses" },
    { done: myNoteCount > 0, label: "Share notes from a lecture", href: lastCourse ? `/courses/${lastCourse.id}/notes/new` : "/courses" },
  ];
  const showSetup = setupSteps.some((s) => !s.done);

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Hi, ${firstName(profile?.full_name ?? "")}`}
        description={courses.length ? "Here's what's new in your classes." : "Let's get you set up."}
        actions={
          lastCourse && (
            <ButtonLink href={`/courses/${lastCourse.id}/notes/new`}>Share notes</ButtonLink>
          )
        }
      />

      {showSetup && (
        <Card className="bg-brand-soft/60">
          <h2 className="font-display text-lg font-semibold">Getting started</h2>
          <ol className="mt-3 space-y-2">
            {setupSteps.map((step, i) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done ? "bg-success text-white" : "border border-line bg-surface text-muted"
                  }`}
                  aria-hidden
                >
                  {step.done ? "✓" : i + 1}
                </span>
                {step.done ? (
                  <span className="text-muted line-through">{step.label}</span>
                ) : (
                  <Link href={step.href} className="font-medium text-brand hover:underline">
                    {step.label}
                  </Link>
                )}
                <span className="sr-only">{step.done ? "(done)" : "(to do)"}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {lastCourse && (
        <section aria-labelledby="continue-heading">
          <h2 id="continue-heading" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Pick up where you left off
          </h2>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted">{lastCourse.code} · {lastCourse.term}</p>
              <Link href={`/courses/${lastCourse.id}`} className="font-display text-xl font-semibold hover:underline">
                {lastCourse.title}
              </Link>
              {lastCourseNotes.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {lastCourseNotes.map((n) => (
                    <li key={n.id}>
                      <Link href={`/notes/${n.id}`} className="text-ink hover:text-brand">
                        {n.title}
                      </Link>{" "}
                      <span className="text-muted">· {formatDate(n.lecture_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={`/courses/${lastCourse.id}/catch-up`} variant="secondary" size="sm">
                Catch up on a class
              </ButtonLink>
              <ButtonLink href={`/courses/${lastCourse.id}/ask`} variant="secondary" size="sm">
                Ask the notes
              </ButtonLink>
            </div>
          </Card>
        </section>
      )}

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <section aria-labelledby="new-notes-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="new-notes-heading" className="font-display text-xl font-semibold">New from classmates</h2>
            </div>
            {recentNotes.length === 0 ? (
              <EmptyState title="No classmate notes yet">
                {courses.length
                  ? "When classmates share notes in your courses, they'll show up here."
                  : "Join a course to see notes from your classmates."}
              </EmptyState>
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {recentNotes.map((note) => {
                  const course = courseById.get(note.course_id);
                  return (
                    <li key={note.id}>
                      <Link href={`/notes/${note.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <Avatar name={note.author?.full_name ?? "?"} id={note.author?.id ?? note.id} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{note.title}</p>
                          <p className="truncate text-sm text-muted">
                            {note.author?.full_name || "A classmate"} · {course?.code} · {formatLectureDate(note.lecture_date)}
                          </p>
                        </div>
                        {note.helpful_count > 0 && <Badge>{note.helpful_count} helpful</Badge>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="courses-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="courses-heading" className="font-display text-xl font-semibold">Your courses</h2>
              <Link href="/courses" className="text-sm font-medium text-brand hover:underline">
                Manage courses
              </Link>
            </div>
            {courses.length === 0 ? (
              <EmptyState title="You haven't joined any courses" action={<ButtonLink href="/courses">Find your courses</ButtonLink>}>
                Search for a class you&apos;re taking, or add it if you&apos;re the first one here.
              </EmptyState>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {courses.map((course) => (
                  <li key={course.id}>
                    <Link href={`/courses/${course.id}`} className="block rounded-xl border border-line bg-surface p-4 hover:border-brand/40">
                      <p className="text-sm font-medium text-brand">{course.code}</p>
                      <p className="mt-0.5 font-display text-lg font-semibold">{course.title}</p>
                      <p className="mt-2 text-sm text-muted">
                        {course.members_count} student{course.members_count === 1 ? "" : "s"} · {course.notes_count} note
                        {course.notes_count === 1 ? "" : "s"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="requests-heading">
            <h2 id="requests-heading" className="mb-3 font-display text-xl font-semibold">Study partner requests</h2>
            {requests.length === 0 ? (
              <p className="text-sm text-muted">
                No new requests.{" "}
                <Link href="/partners" className="font-medium text-brand hover:underline">
                  Find a study partner
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {requests.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                    <Avatar name={r.requester?.full_name ?? "?"} id={r.requester?.id ?? r.id} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium">{r.requester?.full_name || "A classmate"}</span> wants to study together
                    </p>
                  </li>
                ))}
                <li>
                  <Link href="/partners#requests" className="text-sm font-medium text-brand hover:underline">
                    Respond to requests
                  </Link>
                </li>
              </ul>
            )}
          </section>

          <section aria-labelledby="groups-heading">
            <h2 id="groups-heading" className="mb-3 font-display text-xl font-semibold">Your study groups</h2>
            {groups.length === 0 ? (
              <p className="text-sm text-muted">You&apos;re not in any groups yet. Open a course to start or join one.</p>
            ) : (
              <ul className="space-y-2">
                {groups.map((g) => (
                  <li key={g.id}>
                    <Link href={`/groups/${g.id}`} className="block rounded-xl border border-line bg-surface p-3 hover:border-brand/40">
                      <p className="font-medium">{g.name}</p>
                      <p className="text-sm text-muted">
                        {courseById.get(g.course_id)?.code} · {g.meeting_time || "Time TBD"} · {g.members_count}/{g.capacity}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="ai-heading">
            <h2 id="ai-heading" className="mb-3 font-display text-xl font-semibold">Your AI study help</h2>
            {insights.length === 0 ? (
              <p className="text-sm text-muted">Gap checks, catch-up guides, and answers you generate are saved here.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {insights.map((i) => {
                  const course = courseById.get(i.course_id);
                  const href =
                    i.kind === "gap_fill" && i.note_id
                      ? `/notes/${i.note_id}#gaps`
                      : i.kind === "catch_up"
                        ? `/courses/${i.course_id}/catch-up?date=${i.lecture_date}&guide=${i.id}`
                        : `/courses/${i.course_id}/ask#${i.id}`;
                  const label =
                    i.kind === "gap_fill"
                      ? "Gap check"
                      : i.kind === "catch_up"
                        ? `Catch-up guide for ${i.lecture_date ? formatDate(i.lecture_date) : "a class"}`
                        : `“${i.question}”`;
                  return (
                    <li key={i.id}>
                      <Link href={href} className="block rounded-lg px-2 py-1.5 hover:bg-surface-2">
                        <span className="line-clamp-1 font-medium">{label}</span>
                        <span className="text-muted">{course?.code} · {formatDate(i.created_at)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
