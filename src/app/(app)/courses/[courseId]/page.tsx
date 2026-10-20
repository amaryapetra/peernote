import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Avatar, Badge, ButtonLink, EmptyState, inputClass } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { formatLectureDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]">): Promise<Metadata> {
  const { courseId } = await params;
  const { course } = await getCourse(courseId);
  return { title: `${course.code} notes` };
}

/** Plain-text preview of Markdown for list views. */
function preview(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-[\]()|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export default async function CourseNotesPage({ params, searchParams }: PageProps<"/courses/[courseId]">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const { course, user, supabase } = await getCourse(courseId);

  let query = supabase
    .from("notes")
    .select("id, title, topic, lecture_date, content, helpful_count, author_id, author:profiles!notes_author_id_fkey(id, full_name)")
    .eq("course_id", course.id)
    .order("lecture_date", { ascending: false })
    .order("helpful_count", { ascending: false })
    .limit(150);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  const { data: notes } = await query;

  const byDate = new Map<string, NonNullable<typeof notes>>();
  for (const note of notes ?? []) {
    const list = byDate.get(note.lecture_date) ?? [];
    list.push(note);
    byDate.set(note.lecture_date, list);
  }

  return (
    <div className="space-y-6">
      {sp.created === "1" && (
        <Alert tone="success">
          Course added! Share the join code <strong className="font-mono">{course.join_code}</strong> with classmates so they can find it.
        </Alert>
      )}
      {sp.joined === "1" && <Alert tone="success">You joined {course.code}. Welcome to the class!</Alert>}
      {sp.deleted === "1" && <Alert tone="success">Your note was deleted.</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-md gap-2" role="search">
          <label htmlFor="note-search" className="sr-only">
            Search notes in this course
          </label>
          <input id="note-search" name="q" defaultValue={q} className={inputClass} placeholder="Search notes, like “eigenvalues”" />
          {q && (
            <Link href={`/courses/${course.id}`} className="flex items-center px-2 text-sm text-muted hover:text-ink">
              Clear
            </Link>
          )}
        </form>
        <ButtonLink href={`/courses/${course.id}/notes/new`}>Share notes</ButtonLink>
      </div>

      {byDate.size === 0 ? (
        q ? (
          <EmptyState title={`No notes match “${q}”`}>Try a different word, or ask the AI on the Ask the notes tab.</EmptyState>
        ) : (
          <EmptyState
            title="No notes yet"
            action={<ButtonLink href={`/courses/${course.id}/notes/new`}>Share the first notes</ButtonLink>}
          >
            Be the first to share notes for {course.code}. Your classmates will thank you.
          </EmptyState>
        )
      ) : (
        <div className="space-y-8">
          {[...byDate.entries()].map(([date, list]) => {
            const iHaveNotes = list.some((n) => n.author_id === user.id);
            return (
              <section key={date} aria-labelledby={`d-${date}`}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`d-${date}`} className="font-display text-lg font-semibold">
                    {formatLectureDate(date)}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {list.length} note{list.length === 1 ? "" : "s"}
                    </span>
                  </h2>
                  {!iHaveNotes && (
                    <Link href={`/courses/${course.id}/catch-up?date=${date}`} className="text-sm font-medium text-brand hover:underline">
                      Missed this class? Get a catch-up guide
                    </Link>
                  )}
                </div>
                <ul className="grid gap-3 md:grid-cols-2">
                  {list.map((note) => (
                    <li key={note.id}>
                      <Link
                        href={`/notes/${note.id}`}
                        className="flex h-full flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand/40"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium">{note.title}</h3>
                          {note.author_id === user.id && <Badge tone="brand">Yours</Badge>}
                        </div>
                        {note.topic && <p className="text-sm text-brand">{note.topic}</p>}
                        <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{preview(note.content)}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                          <Avatar name={note.author?.full_name ?? "?"} id={note.author?.id ?? note.id} size="sm" />
                          <span className="truncate">{note.author?.full_name || "A classmate"}</span>
                          {note.helpful_count > 0 && <span className="ml-auto">★ {note.helpful_count} helpful</span>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
