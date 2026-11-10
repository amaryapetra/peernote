"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormState } from "@/components/form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireCourseOwner(courseId: string, userId: string) {
  if (!UUID.test(courseId)) throw new Error("Invalid course");
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select("id,created_by").eq("id", courseId).maybeSingle();
  if (!data || data.created_by !== userId) throw new Error("Only the course creator can moderate this course.");
  return supabase;
}

export async function submitContentReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  const targetType = String(formData.get("targetType") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim();
  if (!UUID.test(courseId) || !UUID.test(targetId) ||
      !["note","material","post"].includes(targetType) ||
      !["copyright","exam","harassment","spam","other"].includes(reason) || details.length > 600) {
    return { error: "Select a valid reason and try again." };
  }
  const supabase = await createClient();
  const { data: member } = await supabase.from("enrollments").select("course_id")
    .eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
  if (!member) return { error: "Only course members can report content." };
  const admin = createAdminClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin.from("course_reports").select("id", { head: true, count: "exact" })
    .eq("reporter_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= 8) return { error: "You have reached today's report limit." };
  // Confirm target belongs to this course (not simply that a UUID exists).
  let belongs = false;
  if (targetType === "note") {
    const { data } = await supabase.from("notes").select("course_id").eq("id", targetId).maybeSingle();
    belongs = data?.course_id === courseId;
  } else if (targetType === "material") {
    const { data } = await supabase.from("course_materials").select("course_id").eq("id", targetId).maybeSingle();
    belongs = data?.course_id === courseId;
  } else {
    const { data } = await supabase.from("group_posts").select("group:study_groups(course_id)").eq("id", targetId).maybeSingle();
    belongs = data?.group?.course_id === courseId;
  }
  if (!belongs) return { error: "That item is unavailable or no longer in this course." };
  const { error } = await admin.from("course_reports").insert({
    course_id: courseId, reporter_id: user.id,
    target_type: targetType as "note" | "material" | "post", target_id: targetId,
    reason: reason as "copyright" | "exam" | "harassment" | "spam" | "other", details,
  });
  if (error) {
    console.error("report submission failed", error);
    return { error: "Couldn't submit the report. Try again." };
  }
  return { success: "Report submitted to the course moderator. Thank you." };
}

export async function moderateReport(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const reportId = String(formData.get("reportId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  await requireCourseOwner(courseId, user.id);
  if (!UUID.test(reportId) || !["dismissed","removed"].includes(decision)) return;
  const admin = createAdminClient();
  const { data: report } = await admin.from("course_reports").select("*")
    .eq("id", reportId).eq("course_id", courseId).eq("status", "open").maybeSingle();
  if (!report) return;
  if (decision === "removed") {
    if (report.target_type === "note") {
      const { error } = await admin.from("notes").delete().eq("id", report.target_id).eq("course_id", courseId);
      if (error) throw new Error("Couldn't remove the notes.");
    } else if (report.target_type === "material") {
      const { data: material } = await admin.from("course_materials").select("storage_path")
        .eq("id", report.target_id).eq("course_id", courseId).maybeSingle();
      if (material?.storage_path) {
        const { error: storageError } = await admin.storage.from("course-materials").remove([material.storage_path]);
        if (storageError) throw new Error("Couldn't remove stored material.");
      }
      const { error } = await admin.from("course_materials").delete().eq("id", report.target_id).eq("course_id", courseId);
      if (error) throw new Error("Couldn't remove the material.");
    } else {
      const { data: post } = await admin.from("group_posts").select("group_id,group:study_groups(course_id)")
        .eq("id", report.target_id).maybeSingle();
      if (post?.group?.course_id === courseId) {
        const { error } = await admin.from("group_posts").delete().eq("id", report.target_id);
        if (error) throw new Error("Couldn't remove the message.");
      }
    }
  }
  // Removed content closes every open report about it, not just this one.
  let update = admin.from("course_reports").update({
    status: decision as "dismissed" | "removed", reviewed_at: new Date().toISOString(),
  }).eq("course_id", courseId).eq("status", "open");
  update = decision === "removed"
    ? update.eq("target_type", report.target_type).eq("target_id", report.target_id)
    : update.eq("id", reportId);
  const { error } = await update;
  if (error) throw new Error("Couldn't update the report.");
  redirect(`/courses/${courseId}/moderation?reviewed=1`);
}

export async function removeCourseMember(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  await requireCourseOwner(courseId, user.id);
  if (!UUID.test(memberId) || memberId === user.id) return;
  const admin = createAdminClient();
  const { error } = await admin.rpc("moderate_course_member", { p_course: courseId, p_member: memberId, p_actor: user.id });
  if (error) throw new Error("Couldn't remove this member.");
  redirect(`/courses/${courseId}/moderation?member_removed=1`);
}

export async function unbanCourseMember(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  await requireCourseOwner(courseId, user.id);
  if (!UUID.test(memberId)) return;
  const admin = createAdminClient();
  const { error } = await admin.from("course_bans").delete().eq("course_id", courseId).eq("user_id", memberId);
  if (error) throw new Error("Couldn't lift the ban.");
  redirect(`/courses/${courseId}/moderation?unbanned=1`);
}

export async function rotateCourseCode(formData: FormData) {
  const user = await requireUser();
  const courseId = String(formData.get("courseId") ?? "");
  const supabase = await requireCourseOwner(courseId, user.id);
  const { error } = await supabase.rpc("rotate_course_invite", { p_course: courseId });
  if (error) throw new Error("Couldn't regenerate the invite code.");
  redirect(`/courses/${courseId}?rotated=1`);
}

export async function acceptCourseInvite(formData: FormData) {
  await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(code)) redirect("/courses?invite_invalid=1");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_course_by_code", { p_code: code });
  if (!data || error) redirect("/courses?invite_invalid=1");
  redirect(`/courses/${data}?joined=1`);
}

/** Marks a notification read; with open=1, also goes to the page it's about. */
export async function markNotificationRead(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("notificationId") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").update({read_at: new Date().toISOString()})
    .eq("id", id).eq("user_id", user.id).select("href").maybeSingle();
  // href is always a site-relative path (enforced by a database check).
  if (formData.get("open") === "1" && data?.href) redirect(data.href);
  refresh();
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({read_at: new Date().toISOString()})
    .eq("user_id", user.id).is("read_at", null);
  refresh();
}
