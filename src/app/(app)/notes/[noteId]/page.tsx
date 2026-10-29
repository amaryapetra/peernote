import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteNote, toggleHelpful } from "@/app/actions/notes";
import { GapCheckForm } from "@/components/ai-forms";
import { DraftCleanup } from "@/components/draft-cleanup";
import { GapResultView } from "@/components/ai-results";
import { SubmitButton } from "@/components/form";
import { Markdown } from "@/components/markdown";
import { Alert, Avatar, Badge, ButtonLink, Card, cx } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai/client";
import type { GapResult } from "@/lib/ai/gaps";
import { requireUser } from "@/lib/auth";
import { getSourceNotes } from "@/lib/data";
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
  const [{ data: reaction }, { data: sameDay }, { data: insight }] = await Promise.all([
    supabase.from("note_reactions").select("note_id").eq("note_id", note.id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("notes")
      .select("id, title, author_id, author:profiles!notes_author_id_fkey(full_name)")
      .eq("course_id", note.course_id)
      .eq("lecture_date", note.lecture_date)
      .neq("id", note.id)
      .order("helpful_count", { ascending: false })
      .limit(8),
    isAuthor
      ? supabase
          .from("ai_insights")
          .select("id, content, created_at, source_note_ids")
          .eq("note_id", note.id)
          .eq("user_id", user.id)
          .eq("kind", "gap_fill")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const gap = insight ? (insight.content as unknown as GapResult) : null;
  const sources = gap ? await getSourceNotes(insight?.source_note_ids ?? []) : new Map();
  const otherNotesSameDay = sameDay ?? [];
  const peersSameDay = otherNotesSameDay.filter((n) => n.author_id !== user.id);

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

        {isAuthor && (
          <section id="gaps" aria-labelledby="gaps-heading" className="mt-12 scroll-mt-24 rounded-2xl border border-line bg-surface-2/60 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="gaps-heading" className="font-display text-xl font-semibold">Fill the gaps</h2>
              <Badge tone="brand">AI</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              Compare your notes with {peersSameDay.length} classmate{peersSameDay.length === 1 ? "'s" : "s'"} notes from this lecture to see
              what you might have missed.
            </p>
            {!isAiConfigured() ? (
              <p className="mt-4 text-sm text-muted">AI features aren&apos;t set up on this server yet.</p>
            ) : peersSameDay.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No classmates have shared notes for {formatDate(note.lecture_date)} yet. Check back after they do.
              </p>
            ) : (
              <div className="mt-4">
                <GapCheckForm noteId={note.id} hasResult={Boolean(gap)} />
              </div>
            )}
            {gap && insight && (
              <div className="mt-6 border-t border-line pt-6">
                <p className="mb-4 text-xs text-muted">Last checked {formatDate(insight.created_at)}</p>
                <GapResultView result={gap} notes={sources} />
              </div>
            )}
          </section>
        )}
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
        <Card className={cx(!isAuthor ? "" : "hidden")}>
          <h2 className="text-sm font-semibold">Were you in this class?</h2>
          <p className="mt-1 text-sm text-muted">Share your notes too, then compare them with everyone else&apos;s.</p>
          <ButtonLink href={`/courses/${note.course_id}/notes/new?date=${note.lecture_date}`} size="sm" className="mt-3">
            Share my notes
          </ButtonLink>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Missed this class?</h2>
          <p className="mt-1 text-sm text-muted">Get one study guide built from every classmate&apos;s notes.</p>
          <ButtonLink href={`/courses/${note.course_id}/catch-up?date=${note.lecture_date}`} variant="secondary" size="sm" className="mt-3">
            Catch up on this class
          </ButtonLink>
        </Card>
      </aside>
    </div>
  );
}
