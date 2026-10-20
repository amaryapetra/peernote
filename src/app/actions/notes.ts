"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { screenNoteHeuristically } from "@/lib/integrity";
import { isAiConfigured } from "@/lib/ai/client";
import { screenNoteWithAi } from "@/lib/ai/integrity";
import { checkAndRecordUsage } from "@/lib/ai/usage";
import { todayISO } from "@/lib/format";

export type NoteFormState =
  | {
      error?: string;
      integrity?: { reason: string };
      fieldErrors?: Record<string, string>;
    }
  | undefined;

const NoteSchema = z.object({
  title: z.string().trim().min(2, "Give your notes a title.").max(140),
  lecture_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the lecture date.")
    .refine((d) => d >= "2000-01-01" && d <= nextDay(todayISO()), "That date is in the future."),
  topic: z.string().trim().max(140),
  content: z.string().trim().min(20, "Notes need at least a couple of sentences.").max(60000, "That's too long. Split it into two notes."),
});

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Creates or updates a note. Notes are written with the service-role client
 * only after (1) the student is confirmed to be in the course, (2) they own
 * the note when editing, and (3) it passes the academic-integrity check.
 */
export async function saveNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const noteId = String(formData.get("noteId") ?? "") || null;

  const parsed = NoteSchema.safeParse({
    title: formData.get("title"),
    lecture_date: formData.get("lecture_date"),
    topic: formData.get("topic") ?? "",
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }

  const supabase = await createClient();
  const [{ data: enrollment }, { data: course }] = await Promise.all([
    supabase.from("enrollments").select("course_id").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
    supabase.from("courses").select("code, title").eq("id", courseId).maybeSingle(),
  ]);
  if (!enrollment || !course) return { error: "Join this course before sharing notes in it." };

  if (noteId) {
    const { data: existing } = await supabase.from("notes").select("author_id, course_id").eq("id", noteId).maybeSingle();
    if (!existing || existing.author_id !== user.id || existing.course_id !== courseId) {
      return { error: "You can only edit your own notes." };
    }
  }

  // Academic-integrity screening.
  const heuristic = screenNoteHeuristically(parsed.data);
  let integrityNote = "";
  if (isAiConfigured()) {
    const limited = await checkAndRecordUsage(supabase, user.id, "integrity");
    if (limited) return { error: limited };
    try {
      const verdict = await screenNoteWithAi(
        { ...parsed.data, courseTitle: `${course.code} ${course.title}` },
        heuristic,
      );
      if (!verdict.allowed) return { integrity: { reason: verdict.reason } };
      integrityNote = `ai:${verdict.category}`;
    } catch (error) {
      console.error("AI integrity check failed; falling back to keyword scan", error);
      if (heuristic.level === "block") return { integrity: { reason: blockReason(heuristic.reasons) } };
      integrityNote = `scan:${heuristic.level}`;
    }
  } else {
    if (heuristic.level === "block") return { integrity: { reason: blockReason(heuristic.reasons) } };
    integrityNote = `scan:${heuristic.level}`;
  }

  const admin = createAdminClient();
  if (noteId) {
    const { error } = await admin
      .from("notes")
      .update({ ...parsed.data, integrity_note: integrityNote })
      .eq("id", noteId)
      .eq("author_id", user.id);
    if (error) return { error: "Couldn't save your changes. Try again." };
    redirect(`/notes/${noteId}?saved=1`);
  }

  const { data: created, error } = await admin
    .from("notes")
    .insert({ ...parsed.data, course_id: courseId, author_id: user.id, integrity_note: integrityNote })
    .select("id")
    .single();
  if (error || !created) return { error: "Couldn't share your notes. Try again." };
  redirect(`/notes/${created.id}?shared=1`);
}

function blockReason(reasons: string[]): string {
  return `This looks like it may contain quiz or exam material (${reasons.join("; ")}). PeerNote only accepts class notes and your own study materials. If that's what this is, edit the wording and try again.`;
}

export async function deleteNote(formData: FormData) {
  const user = await requireUser();
  const noteId = String(formData.get("noteId") ?? "");
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", noteId).eq("author_id", user.id);
  redirect(`/courses/${courseId}?deleted=1`);
}

export async function toggleHelpful(formData: FormData) {
  const user = await requireUser();
  const noteId = String(formData.get("noteId") ?? "");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("note_reactions")
    .select("note_id")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    await supabase.from("note_reactions").delete().eq("note_id", noteId).eq("user_id", user.id);
  } else {
    await supabase.from("note_reactions").insert({ note_id: noteId, user_id: user.id });
  }
  refresh();
}
