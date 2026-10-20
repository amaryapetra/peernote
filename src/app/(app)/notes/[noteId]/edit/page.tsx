import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { NoteEditor } from "@/components/note-editor";
import { isAiConfigured } from "@/lib/ai/client";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit notes" };

export default async function EditNotePage({ params }: PageProps<"/notes/[noteId]/edit">) {
  const { noteId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(noteId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const { data: note } = await supabase
    .from("notes")
    .select("id, course_id, author_id, title, lecture_date, topic, content, course:courses(code)")
    .eq("id", noteId)
    .maybeSingle();
  if (!note) notFound();
  if (note.author_id !== user.id) redirect(`/notes/${note.id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Edit notes</h1>
      <p className="mb-6 mt-1 text-sm text-muted">{note.course?.code}</p>
      <NoteEditor
        courseId={note.course_id}
        noteId={note.id}
        initial={{ title: note.title, lecture_date: note.lecture_date, topic: note.topic, content: note.content }}
        aiEnabled={isAiConfigured()}
        cancelHref={`/notes/${note.id}`}
      />
    </div>
  );
}
