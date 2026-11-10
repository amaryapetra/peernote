import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourseMaterial } from "@/app/actions/materials";
import { ReportContentForm } from "@/components/report-content-form";
import { Alert, Avatar, Badge, ButtonLink, EmptyState, inputClass } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { formatLectureDate } from "@/lib/format";
import { fileKindLabel, isInlineImage } from "@/lib/material-files";

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
  const page = Math.min(10000, Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1));
  const pageSize = 24;
  const searchArgs = new URLSearchParams(q ? { q } : {});
  const pageHref = (next: number) => {
    const params = new URLSearchParams(searchArgs);
    params.set("page", String(next));
    return `/courses/${courseId}?${params.toString()}`;
  };
  const { course, user, supabase } = await getCourse(courseId);

  let query = supabase
    .from("notes")
    .select("id, title, topic, lecture_date, content, helpful_count, author_id, author:profiles!notes_author_id_fkey(id, full_name)", {count:"exact"})
    .eq("course_id", course.id)
    .order("lecture_date", { ascending: false })
    .order("helpful_count", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (q) query = query.textSearch("search", q, { type: "websearch", config: "english" });
  const { data: notes, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  // Files of notes (PDFs, photos...) for the same span of dates as this page of typed notes.
  const pageNotes = notes ?? [];
  let filesQuery = supabase
    .from("course_materials")
    .select("id, title, description, lecture_date, file_type, file_name, uploaded_by, uploader:profiles!course_materials_uploaded_by_fkey(id, full_name)")
    .eq("course_id", course.id)
    .eq("kind", "notes")
    .order("lecture_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) filesQuery = filesQuery.ilike("title", `%${q.replace(/[%_,()*\\]/g, " ")}%`);
  if (pageNotes.length) {
    if (page > 1) filesQuery = filesQuery.lte("lecture_date", pageNotes[0].lecture_date);
    if (page < totalPages) filesQuery = filesQuery.gte("lecture_date", pageNotes[pageNotes.length - 1].lecture_date);
  }
  const { data: noteFiles } = page > 1 && !pageNotes.length ? { data: null } : await filesQuery;

  type Day = { notes: typeof pageNotes; files: NonNullable<typeof noteFiles> };
  const byDate = new Map<string, Day>();
  const day = (date: string) => byDate.get(date) ?? byDate.set(date, { notes: [], files: [] }).get(date)!;
  for (const note of pageNotes) day(note.lecture_date).notes.push(note);
  for (const file of noteFiles ?? []) if (file.lecture_date) day(file.lecture_date).files.push(file);
  const days = [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {sp.created === "1" && (
        <Alert tone="success">
          Course added! Share the join code <strong className="font-mono">{course.join_code}</strong> or the invite link above with trusted classmates so they can join.
        </Alert>
      )}
      {sp.joined === "1" && <Alert tone="success">You joined {course.code}. Welcome to the class!</Alert>}
      {sp.rotated === "1" && <Alert tone="success">Invite regenerated. Old codes and links no longer work.</Alert>}
      {sp.creator_cannot_leave === "1" && <Alert tone="error">Course creators cannot leave without transferring ownership.</Alert>}
      {sp.deleted === "1" && <Alert tone="success">Your note was deleted.</Alert>}
      {sp.shared_file === "1" && <Alert tone="success">Your notes file is shared with the class. Nice work!</Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-md gap-2" role="search">
          <label htmlFor="note-search" className="sr-only">
            Search notes in this course
          </label>
          <input id="note-search" name="q" defaultValue={q} className={inputClass} placeholder="Search notes, like “eigenvalues”" />
          <button type="submit" className="rounded-lg bg-brand px-3 text-sm font-medium text-on-brand">Search</button>
          {q && (
            <Link href={`/courses/${course.id}`} className="flex items-center px-2 text-sm text-muted hover:text-ink">
              Clear
            </Link>
          )}
        </form>
        <ButtonLink href={`/courses/${course.id}/notes/new`}>Share notes</ButtonLink>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm text-muted">
        <span>{count ?? 0} note{count === 1 ? "" : "s"} · page {page} of {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link href={pageHref(page - 1)} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">Previous</Link>}
          {page < totalPages && <Link href={pageHref(page + 1)} className="rounded-md border border-line px-3 py-1 hover:bg-surface-2">Next</Link>}
        </div>
      </div>
      {days.length === 0 ? (
        q ? (
          <EmptyState title={`No notes match “${q}”`}>Try a different word.</EmptyState>
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
          {days.map(([date, { notes: list, files }]) => {
            const iHaveNotes = list.some((n) => n.author_id === user.id) || files.some((f) => f.uploaded_by === user.id);
            const total = list.length + files.length;
            return (
              <section key={date} aria-labelledby={`d-${date}`}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id={`d-${date}`} className="font-display text-lg font-semibold">
                    {formatLectureDate(date)}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {total} note{total === 1 ? "" : "s"}
                    </span>
                  </h2>
                  {!iHaveNotes && (
                    <Link href={`/courses/${course.id}/notes/new?date=${date}`} className="text-sm font-medium text-brand hover:underline">
                      Were you there? Share your notes
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
                  {files.map((file) => (
                    <li key={file.id} id={`file-${file.id}`} className="flex scroll-mt-24 flex-col rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-2">
                        <a href={`/api/materials/${file.id}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-brand hover:underline">
                          {file.title}
                        </a>
                        <span className="flex shrink-0 gap-1.5">
                          {file.uploaded_by === user.id && <Badge tone="brand">Yours</Badge>}
                          <Badge>{fileKindLabel(file.file_type)}</Badge>
                        </span>
                      </div>
                      {file.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{file.description}</p>}
                      <p className="mt-2 flex-1 text-sm">
                        <a href={`/api/materials/${file.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
                          {file.file_type === "pdf" ? "Open PDF" : isInlineImage(file.file_type) ? "Open photo" : `Download ${file.file_name ?? "file"}`}
                        </a>
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                        <Avatar name={file.uploader?.full_name ?? "?"} id={file.uploader?.id ?? file.id} size="sm" />
                        <span className="truncate">{file.uploader?.full_name || "A classmate"}</span>
                        <span className="ml-auto">
                          {file.uploaded_by === user.id ? (
                            <form action={deleteCourseMaterial}>
                              <input type="hidden" name="materialId" value={file.id} />
                              <button type="submit" className="hover:text-danger" aria-label={`Remove ${file.title}`}>Remove</button>
                            </form>
                          ) : (
                            <ReportContentForm courseId={course.id} targetId={file.id} targetType="material" />
                          )}
                        </span>
                      </div>
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
