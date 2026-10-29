"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/components/form";

const LinkSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(600),
  lectureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  link: z.string().trim().max(2000).url().refine((value) => {
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }, "Use a secure https:// link."),
});

export async function shareMaterialLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = Object.fromEntries(["title", "description", "lectureDate", "link"].map((key) => [key, String(formData.get(key) ?? "")]));
  if (formData.get("permission") !== "on") {
    return { values, error: "Confirm that you have permission to share this link and that it isn't an assessment." };
  }
  const parsed = LinkSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    lectureDate: formData.get("lectureDate"),
    link: formData.get("link"),
  });
  if (!parsed.success) return { values, error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: member } = await supabase.from("enrollments").select("course_id")
    .eq("course_id", parsed.data.courseId).eq("user_id", user.id).maybeSingle();
  if (!member) return { values, error: "Join this course before sharing materials." };
  const admin = createAdminClient();
  const { error } = await admin.from("course_materials").insert({
    course_id: parsed.data.courseId, uploaded_by: user.id,
    title: parsed.data.title, description: parsed.data.description,
    lecture_date: parsed.data.lectureDate, source_type: "link", link_url: parsed.data.link,
  });
  if (error) {
    console.error("material link insert failed", error);
    return { values, error: "Couldn't save that link. Please try again." };
  }
  redirect(`/courses/${parsed.data.courseId}/materials?added=1`);
}

export async function deleteCourseMaterial(formData: FormData) {
  const user = await requireUser();
  const materialId = String(formData.get("materialId") ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(materialId)) return;
  const supabase = await createClient();
  const { data: item } = await supabase.from("course_materials")
    .select("id, course_id, uploaded_by, storage_path").eq("id", materialId).maybeSingle();
  if (!item || item.uploaded_by !== user.id) return;
  const admin = createAdminClient();
  if (item.storage_path) {
    const { error } = await admin.storage.from("course-materials").remove([item.storage_path]);
    if (error) {
      console.error("material file deletion failed", error);
      return;
    }
  }
  const { error } = await admin.from("course_materials").delete()
    .eq("id", item.id).eq("uploaded_by", user.id);
  if (error) console.error("material row deletion failed", error);
  redirect(`/courses/${item.course_id}/materials?deleted=1`);
}
