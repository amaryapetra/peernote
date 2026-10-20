import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

/** Courses the signed-in student has joined, newest first. */
export const getMyCourses = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("joined_at, course:courses(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });
  return (data ?? []).flatMap((row) => (row.course ? [row.course] : []));
});

/**
 * A course plus whether the viewer has joined it. Every signed-in student can
 * see a course's basic info; notes and rosters need enrollment (enforced by RLS).
 */
export const getCourse = cache(async (courseId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(courseId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: course }, { data: enrollment }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase.from("enrollments").select("joined_at").eq("course_id", courseId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!course) notFound();
  return { course, enrolled: Boolean(enrollment), user, supabase };
});

export function courseLabel(course: { code: string; title: string }): string {
  return `${course.code}: ${course.title}`;
}

/** Titles and authors for notes an AI result cites, keyed by note ID. */
export async function getSourceNotes(ids: string[]) {
  const map = new Map<string, { id: string; title: string; author: string }>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id, title, author:profiles!notes_author_id_fkey(full_name)").in("id", unique);
  for (const n of data ?? []) {
    map.set(n.id, { id: n.id, title: n.title, author: n.author?.full_name?.split(" ")[0] || "A classmate" });
  }
  return map;
}
