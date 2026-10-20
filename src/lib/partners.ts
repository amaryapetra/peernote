import "server-only";
import { getViewer } from "@/lib/auth";
import { getMyCourses } from "@/lib/data";
import { rankMatches, scoreMatch, type MatchResult } from "@/lib/matching";
import type { Tables } from "@/lib/database.types";

export type ConnectionState =
  | { kind: "none" }
  | { kind: "sent"; id: string }
  | { kind: "received"; id: string; message: string }
  | { kind: "connected"; id: string }
  | { kind: "declined"; id: string };

export type Classmate = {
  profile: Pick<Tables<"profiles">, "id" | "full_name" | "major" | "grad_year" | "bio" | "study_styles" | "availability">;
  name: string;
  result: MatchResult;
  sharedCourseIds: string[];
  connection: ConnectionState;
};

/**
 * Classmates ranked by how well they'd study with the viewer.
 * Pass a courseId to limit to one course's roster.
 */
export async function getClassmates(courseId?: string): Promise<{ classmates: Classmate[]; me: Tables<"profiles"> | null }> {
  const { user, profile, supabase } = await getViewer();
  const courses = await getMyCourses();
  const courseIds = courseId ? [courseId] : courses.map((c) => c.id);
  if (!courseIds.length) return { classmates: [], me: profile };
  const allMyCourseIds = courses.map((c) => c.id);
  const codeById = new Map(courses.map((c) => [c.id, c.code]));

  const [{ data: roster }, { data: sharedRows }, { data: noteRows }, { data: connections }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("user_id, profile:profiles!enrollments_user_id_fkey(id, full_name, major, grad_year, bio, study_styles, availability)")
      .in("course_id", courseIds)
      .neq("user_id", user.id),
    // Every enrollment in any of my courses, to count shared classes.
    supabase.from("enrollments").select("user_id, course_id").in("course_id", allMyCourseIds).neq("user_id", user.id),
    supabase.from("notes").select("author_id").in("course_id", courseIds).neq("author_id", user.id).limit(2000),
    supabase
      .from("connections")
      .select("id, requester_id, addressee_id, status, message")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const shared = new Map<string, string[]>();
  for (const row of sharedRows ?? []) {
    const list = shared.get(row.user_id) ?? [];
    list.push(row.course_id);
    shared.set(row.user_id, list);
  }
  const noteCounts = new Map<string, number>();
  for (const row of noteRows ?? []) noteCounts.set(row.author_id, (noteCounts.get(row.author_id) ?? 0) + 1);

  const connectionByUser = new Map<string, ConnectionState>();
  for (const c of connections ?? []) {
    const other = c.requester_id === user.id ? c.addressee_id : c.requester_id;
    let state: ConnectionState;
    if (c.status === "accepted") state = { kind: "connected", id: c.id };
    else if (c.status === "declined") state = { kind: "declined", id: c.id };
    else if (c.requester_id === user.id) state = { kind: "sent", id: c.id };
    else state = { kind: "received", id: c.id, message: c.message };
    connectionByUser.set(other, state);
  }

  const me = {
    id: user.id,
    study_styles: profile?.study_styles ?? [],
    availability: profile?.availability ?? [],
  };

  const seen = new Set<string>();
  const classmates: Classmate[] = [];
  for (const row of roster ?? []) {
    if (!row.profile || seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    const sharedCourseIds = [...new Set(shared.get(row.user_id) ?? [])];
    classmates.push({
      profile: row.profile,
      name: row.profile.full_name || "Classmate",
      sharedCourseIds,
      connection: connectionByUser.get(row.user_id) ?? { kind: "none" },
      result: scoreMatch({
        me,
        them: row.profile,
        sharedCourses: sharedCourseIds.map((id) => codeById.get(id) ?? "a class"),
        theirNoteCount: noteCounts.get(row.user_id) ?? 0,
      }),
    });
  }
  return { classmates: rankMatches(classmates), me: profile };
}
