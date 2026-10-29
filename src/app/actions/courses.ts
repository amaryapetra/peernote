"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/components/form";

const CourseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Enter the course code, like MATH 3090.")
    .max(20)
    .transform((v) => v.replace(/\s+/g, " ").replace(/^([A-Z]+)(\d)/, "$1 $2")),
  title: z.string().trim().min(2, "Enter the course name.").max(120),
  term: z.string().trim().min(2, "Pick a term.").max(40),
  instructor: z.string().trim().max(80),
  school: z.string().trim().min(2).max(120),
});

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = Object.fromEntries(["code", "title", "term", "instructor", "school"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = CourseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    term: formData.get("term"),
    instructor: formData.get("instructor") ?? "",
    school: formData.get("school") || "Tulane University",
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...parsed.data, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { values, error: "This class already exists. Ask an enrolled classmate for its invite code, then join below." };
    }
    return { values, error: "Couldn't create that course. Try again." };
  }
  redirect(`/courses/${data.id}?created=1`);
}

export async function joinByCode(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(code)) return { values: { code }, error: "Invite codes are 12 letters (A-F) and numbers." };
  const supabase = await createClient();
  const { data: courseId, error } = await supabase.rpc("join_course_by_code", { p_code: code });
  if (error) return { values: { code }, error: "Couldn't join right now. Please try again." };
  if (!courseId) return { values: { code }, error: "Invalid invite code. Ask an enrolled classmate for the current code." };
  redirect(`/courses/${courseId}?joined=1`);
}

export async function leaveCourse(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await createClient();
  await supabase.from("enrollments").delete().eq("user_id", user.id).eq("course_id", courseId);
  redirect("/courses?left=1");
}

/** Remembers the last course the student opened, for "pick up where you left off". */
export async function recordCourseVisit(courseId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ last_course_id: courseId, last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
