import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAiConfigured, friendlyAiError } from "@/lib/ai/client";
import { extractMaterialTextForAi, MATERIAL_TEXT_LIMIT } from "@/lib/material-text";
import { INLINE_TYPES, fileExtension, isExecutable, isInlineType } from "@/lib/material-files";
import { prepareNoteImport } from "@/lib/note-import";
import { screenNoteHeuristically } from "@/lib/integrity";
import { checkAndRecordUsage } from "@/lib/ai/usage";

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024;
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
    return fail("Confirm that you have permission to share this material and it is not exam material.", 400);
  }
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.", 400);
  if (file.size > MAX_BYTES) return fail("Files must be 4 MB or smaller.", 413);
  const supabase = await createClient();
  const { data: member } = await supabase.from("enrollments").select("course_id")
    .eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("Join this course before sharing materials.", 403);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (isExecutable(file.name, bytes)) return fail("Programs and installers can't be shared. Upload the class material itself.", 415);

  // Read the file's text for the preview and (if allowed) the AI study tools.
  // Documents, slides, and spreadsheets are read locally; PDFs and photos need AI.
  const prepared = prepareNoteImport(bytes, file.name);
  let text = prepared.kind === "text" ? prepared.text.slice(0, MATERIAL_TEXT_LIMIT) : "";
  try {
    if (prepared.kind === "ai" && wantsAi) {
      if (!isAiConfigured()) return fail("AI reading isn't set up yet. Uncheck the AI box to upload this file.", 503);
      const usageError = await checkAndRecordUsage(supabase, user.id, "transcribe");
      if (usageError) return fail(usageError, 429);
      text = await extractMaterialTextForAi(bytes, prepared.mediaType);
      if (text === "NOT_LECTURE_MATERIAL") return fail("Assessments or answer keys can't be shared.", 422);
    }
  } catch (error) {
    console.error("material text extraction failed", error);
    return fail(friendlyAiError(error), 422);
  }
  if (text && screenNoteHeuristically({ title, topic: "Class material", content: text }).level === "block") {
    return fail("This file appears to include assessment material and cannot be shared.", 422);
  }

  // Only real PDFs and images are stored with a type browsers display. Everything
  // else is stored as a generic download, so an uploaded web page or script can
  // never run in a classmate's browser.
  let fileType = fileExtension(file.name);
  if (prepared.kind === "ai") {
    fileType = prepared.mediaType === "application/pdf" ? "pdf" : prepared.mediaType.slice("image/".length).replace("jpeg", "jpg");
  } else if (isInlineType(fileType)) {
    fileType = "file"; // named like a PDF or image, but it isn't one
  }
  const contentType = isInlineType(fileType) ? INLINE_TYPES[fileType] : "application/octet-stream";

  const safeFileName = file.name.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9_. ()-]/g, "_").slice(0, 180) || "file";
  const path = `${courseId}/${user.id}/${randomUUID()}.${fileType}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("course-materials").upload(path, bytes, {
    contentType, upsert: false, cacheControl: "60",
  });
  if (uploadError) {
    console.error("material storage failed", uploadError);
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
