"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyAiError, isAiConfigured } from "@/lib/ai/client";
import { findGaps } from "@/lib/ai/gaps";
import { buildCatchUp } from "@/lib/ai/catch-up";
import { answerFromNotes } from "@/lib/ai/ask";
import { checkAndRecordUsage } from "@/lib/ai/usage";
import type { PromptNote } from "@/lib/ai/notes-format";
import type { Json } from "@/lib/database.types";

export type AiFormState = { error?: string } | undefined;

const MAX_PEER_NOTES = 8;

function notReady(): AiFormState | null {
  return isAiConfigured() ? null : { error: "AI features aren't set up on this server yet." };
}

/** Compare one of my notes with classmates' notes from the same lecture. */
export async function runGapCheck(_prev: AiFormState, formData: FormData): Promise<AiFormState> {
  const user = await requireUser();
  const off = notReady();
  if (off) return off;
  const noteId = String(formData.get("noteId") ?? "");
  const supabase = await createClient();

  const { data: mine } = await supabase
    .from("notes")
    .select("id, course_id, author_id, title, topic, lecture_date, content")
    .eq("id", noteId)
    .maybeSingle();
  if (!mine || mine.author_id !== user.id) return { error: "You can only check your own notes." };

  const { data: peers } = await supabase
    .from("notes")
    .select("id, title, topic, lecture_date, content, helpful_count")
    .eq("course_id", mine.course_id)
    .eq("lecture_date", mine.lecture_date)
    .neq("author_id", user.id)
    .order("helpful_count", { ascending: false })
    .limit(MAX_PEER_NOTES);
  if (!peers?.length) {
    return { error: "No classmates have shared notes for this lecture yet. Check back later." };
  }

  const limited = await checkAndRecordUsage(supabase, user.id, "gap_fill");
  if (limited) return { error: limited };

  try {
    const result = await findGaps(mine, peers as PromptNote[]);
    const { error: saveError } = await supabase.from("ai_insights").insert({
      user_id: user.id,
      course_id: mine.course_id,
      note_id: mine.id,
      lecture_date: mine.lecture_date,
      kind: "gap_fill",
      content: result as unknown as Json,
      source_note_ids: peers.map((p) => p.id),
    });
    if (saveError) {
      console.error("gap check save failed", saveError);
      return { error: "The comparison finished, but we couldn't save it. Try again." };
    }
  } catch (error) {
    console.error("gap check failed", error);
    return { error: friendlyAiError(error) };
  }
  refresh();
  return undefined;
}

/** Build a study guide for a lecture from everyone's notes. */
export async function runCatchUp(_prev: AiFormState, formData: FormData): Promise<AiFormState> {
  const user = await requireUser();
  const off = notReady();
  if (off) return off;
  const courseId = String(formData.get("courseId") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a class date." };
  const supabase = await createClient();

  const [{ data: course }, { data: notes }] = await Promise.all([
    supabase.from("courses").select("code, title").eq("id", courseId).maybeSingle(),
    // RLS returns nothing unless the student is enrolled.
    supabase
      .from("notes")
      .select("id, title, topic, lecture_date, content, helpful_count")
      .eq("course_id", courseId)
      .eq("lecture_date", date)
      .order("helpful_count", { ascending: false })
      .limit(MAX_PEER_NOTES),
  ]);
  if (!course) return { error: "Course not found." };
  if (!notes?.length) return { error: "Nobody has shared notes for that day yet." };

  const limited = await checkAndRecordUsage(supabase, user.id, "catch_up");
  if (limited) return { error: limited };

  let insightId: string | undefined;
  try {
    const result = await buildCatchUp(`${course.code} ${course.title}`, date, notes as PromptNote[]);
    const { data, error: saveError } = await supabase
      .from("ai_insights")
      .insert({
        user_id: user.id,
        course_id: courseId,
        lecture_date: date,
        kind: "catch_up",
        content: result as unknown as Json,
        source_note_ids: notes.map((n) => n.id),
      })
      .select("id")
      .single();
    if (saveError || !data) {
      console.error("catch-up save failed", saveError);
      return { error: "The guide finished, but we couldn't save it. Try again." };
    }
    insightId = data.id;
  } catch (error) {
    console.error("catch-up failed", error);
    return { error: friendlyAiError(error) };
  }
  redirect(`/courses/${courseId}/catch-up?date=${date}${insightId ? `&guide=${insightId}` : ""}`);
}

/** Answer a question from the course's shared notes. */
export async function askNotes(_prev: AiFormState, formData: FormData): Promise<AiFormState> {
  const user = await requireUser();
  const off = notReady();
  if (off) return off;
  const courseId = String(formData.get("courseId") ?? "");
  const question = String(formData.get("question") ?? "").trim();
  if (question.length < 5) return { error: "Ask a full question." };
  if (question.length > 500) return { error: "Keep your question under 500 characters." };
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("code, title").eq("id", courseId).maybeSingle();
  if (!course) return { error: "Course not found." };

  // Find the most relevant notes with Postgres full-text search. If nothing
  // matches, fall back to the latest notes so the AI can say it's not covered.
  let { data: notes } = await supabase.rpc("search_course_notes", { p_course: courseId, p_query: question, p_limit: 8 });
  if (!notes?.length) {
    const { data: recent } = await supabase
      .from("notes")
      .select("id, title, topic, lecture_date, content")
      .eq("course_id", courseId)
      .order("lecture_date", { ascending: false })
      .limit(6);
    notes = (recent ?? []).map((n) => ({ ...n, author_id: "", rank: 0 }));
  }
  if (!notes.length) return { error: "This course doesn't have any notes yet. Share some first!" };

  const limited = await checkAndRecordUsage(supabase, user.id, "ask");
  if (limited) return { error: limited };

  try {
    const result = await answerFromNotes(`${course.code} ${course.title}`, question, notes);
    const { error: saveError } = await supabase.from("ai_insights").insert({
      user_id: user.id,
      course_id: courseId,
      kind: "ask",
      question,
      content: result as unknown as Json,
      source_note_ids: result.source_note_ids,
    });
    if (saveError) {
      console.error("ask save failed", saveError);
      return { error: "The answer finished, but we couldn't save it. Try again." };
    }
  } catch (error) {
    console.error("ask failed", error);
    return { error: friendlyAiError(error) };
  }
  refresh();
  return undefined;
}

export async function deleteInsight(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("insightId") ?? "");
  const supabase = await createClient();
  await supabase.from("ai_insights").delete().eq("id", id).eq("user_id", user.id);
  refresh();
}
