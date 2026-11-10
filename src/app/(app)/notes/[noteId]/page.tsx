import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNote, toggleHelpful } from "@/app/actions/notes";
import { DraftCleanup } from "@/components/draft-cleanup";
import { ReportContentForm } from "@/components/report-content-form";
import { SubmitButton } from "@/components/form";
import { Markdown } from "@/components/markdown";
import { Alert, Avatar, ButtonLink, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatLectureDate, wordCount } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notes" };

export default async function NotePage({ params, searchParams }: PageProps<"/notes/[noteId]">) {
  const { noteId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(noteId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  // RLS hides notes from courses the student hasn't joined.
  const { data: note } = await supabase
    .from("notes")
    .select("*, author:profiles!notes_author_id_fkey(id, full_name, major), course:courses(id, code, title)")
    .eq("id", noteId)
    .maybeSingle();
  if (!note || !note.course) notFound();

  const isAuthor = note.author_id === user.id;
  const [{ data: reaction }, { data: sameDay }] = await Promise.all([
    supabase.from("note_reactions").select("note_id").eq("note_id", note.id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("notes")
      .select("id, title, author_id, author:profiles!notes_author_id_fkey(full_name)")
      .eq("course_id", note.course_id)
      .eq("lecture_date", note.lecture_date)
      .neq("id", note.id)
      .order("helpful_count", { ascending: false })
      .limit(8),
  ]);

  const otherNotesSameDay = sameDay ?? [];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_18rem]">
      <article className="min-w-0">
        {isAuthor && sp.shared === "1" && <DraftCleanup courseId={note.course_id} />}
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
          <Link href={`/courses/${note.course.id}`} className="hover:text-ink">
            {note.course.code}
          </Link>{" "}
          / {formatLectureDate(note.lecture_date)}
        </nav>

        {sp.shared === "1" && <div className="mb-5"><Alert tone="success">Shared with your class. Nice work!</Alert></div>}
        {sp.saved === "1" && <div className="mb-5"><Alert tone="success">Changes saved.</Alert></div>}

        <header className="border-b border-line pb-6">
          {note.topic && <p className="text-sm font-medium text-brand">{note.topic}</p>}
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{note.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
            <Avatar name={note.author?.full_name ?? "?"} id={note.author?.id ?? note.id} size="sm" />
            <span>
              <span className="font-medium text-ink">{isAuthor ? "You" : note.author?.full_name || "A classmate"}</span>
              {note.author?.major && !isAuthor ? ` · ${note.author.major}` : ""}
            </span>
            <span>· {wordCount(note.content)} words</span>
            {note.updated_at !== note.created_at && <span>· edited {formatDate(note.updated_at)}</span>}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form action={toggleHelpful}>
              <input type="hidden" name="noteId" value={note.id} />
              <SubmitButton variant={reaction ? "primary" : "secondary"} size="sm">
                <span aria-hidden>★</span> {reaction ? "Marked helpful" : "Helpful"} · {note.helpful_count}
              </SubmitButton>
            </form>
            {!isAuthor && <ReportContentForm courseId={note.course_id} targetId={note.id} targetType="note" />}
            {isAuthor && (
              <>
                <ButtonLink href={`/notes/${note.id}/edit`} variant="secondary" size="sm">
                  Edit
                </ButtonLink>
                <details className="relative">
                  <summary className="flex h-8 cursor-pointer list-none items-center rounded-lg px-3 text-sm text-danger hover:bg-danger-soft">
                    Delete
                  </summary>
                  <div className="absolute z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg">
                    <p className="mb-3">Delete these notes for everyone? This can&apos;t be undone.</p>
                    <form action={deleteNote}>
                      <input type="hidden" name="noteId" value={note.id} />
                      <input type="hidden" name="courseId" value={note.course_id} />
                      <SubmitButton variant="danger" size="sm" pendingText="Deleting…">
                        Yes, delete
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              </>
            )}
          </div>
        </header>

        <Markdown className="mt-8">{note.content}</Markdown>
      </article>

      <aside className="space-y-6">
        <Card>
          <h2 className="text-sm font-semibold">Other notes from this class</h2>
          {otherNotesSameDay.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {otherNotesSameDay.map((n) => (
                <li key={n.id}>
                  <Link href={`/notes/${n.id}`} className="block rounded-md hover:text-brand">
                    <span className="font-medium">{n.title}</span>
                    <span className="block text-muted">{n.author_id === user.id ? "You" : n.author?.full_name || "A classmate"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {!isAuthor && (
          <Card>
            <h2 className="text-sm font-semibold">Were you in this class?</h2>
            <p className="mt-1 text-sm text-muted">Share your notes too, then compare them with everyone else&apos;s.</p>
            <ButtonLink href={`/courses/${note.course_id}/notes/new?date=${note.lecture_date}`} size="sm" className="mt-3">
              Share my notes
            </ButtonLink>
          </Card>
        )}
      </aside>
    </div>
  );
}
