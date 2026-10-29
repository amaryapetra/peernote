import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiConfigured, friendlyAiError } from "@/lib/ai/client";
import { extractPdfTextForAi, extractPptxText } from "@/lib/material-text";
import { screenNoteHeuristically } from "@/lib/integrity";
import { checkAndRecordUsage } from "@/lib/ai/usage";

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = {
  pdf: "application/pdf",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Log in before uploading materials.", 401);
  const form = await request.formData().catch(() => null);
  if (!form) return fail("Invalid upload form.", 400);
  const courseId = String(form.get("courseId") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const date = String(form.get("lectureDate") ?? "");
  const file = form.get("file");
  const wantsAi = form.get("aiAllowed") === "on";
  if (!UUID.test(courseId) || title.length < 2 || title.length > 140 ||
      description.length > 600 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return fail("Enter a title and valid lecture date.", 400);
  }
  if (form.get("permission") !== "on") {
    return fail("Confirm that you have permission to share these slides and they are not exam materials.", 400);
  }
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or PowerPoint file.", 400);
  if (file.size > MAX_BYTES) return fail("Files must be 4 MB or smaller.", 413);
  const fileType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : file.name.toLowerCase().endsWith(".pptx") ? "pptx" : null;
  if (!fileType || ![TYPES[fileType], "application/octet-stream", ""].includes(file.type)) {
    return fail("Only .pdf and .pptx slides are supported.", 400);
  }
  const supabase = await createClient();
  const { data: member } = await supabase.from("enrollments").select("course_id")
    .eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("Join this course before sharing slides.", 403);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (fileType === "pdf" && bytes.toString("ascii", 0, 5) !== "%PDF-") return fail("That PDF file is invalid.", 400);
  if (fileType === "pptx" && (bytes.length < 4 || bytes.readUInt32LE(0) !== 0x04034b50)) return fail("That PowerPoint file is invalid.", 400);
  let text = "";
  try {
    if (fileType === "pptx") text = extractPptxText(bytes);
    if (fileType === "pdf" && wantsAi) {
      if (!isAiConfigured()) return fail("AI extraction isn't configured. Uncheck AI analysis to upload this PDF.", 503);
      const usageError = await checkAndRecordUsage(supabase, user.id, "transcribe");
      if (usageError) return fail(usageError, 429);
      text = await extractPdfTextForAi(bytes);
      if (text === "NOT_LECTURE_MATERIAL") return fail("Assessments or answer keys can't be shared.", 422);
    }
    if (text && screenNoteHeuristically({ title, topic: "Lecture slides", content: text }).level === "block") {
      return fail("These slides appear to include assessment material and cannot be shared.", 422);
    }
  } catch (error) {
    console.error("slide text extraction failed", error);
    return fail(fileType === "pptx" ? "Could not read this PowerPoint file." : friendlyAiError(error), 422);
  }

  const safeFileName = file.name.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9_. -]/g, "_").slice(0, 180);
  const path = `${courseId}/${user.id}/${randomUUID()}.${fileType}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("course-materials").upload(path, bytes, {
    contentType: TYPES[fileType], upsert: false, cacheControl: "60",
  });
  if (uploadError) {
    console.error("slide storage failed", uploadError);
    return fail("Couldn't save this file. Please try again.", 502);
  }

  const { error: saveError } = await admin.from("course_materials").insert({
    course_id: courseId, uploaded_by: user.id, title, description,
    lecture_date: date, source_type: "file", file_type: fileType,
    file_name: safeFileName, storage_path: path, extracted_text: text,
    ai_allowed: wantsAi && Boolean(text),
  });
  if (saveError) {
    console.error("material metadata insert failed", saveError);
    await admin.storage.from("course-materials").remove([path]);
    return fail("Couldn't save the file details. Please try again.", 502);
  }
  return NextResponse.json({ success: true });
}
