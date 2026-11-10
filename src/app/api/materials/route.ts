import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateClassMaterial, verifyExternalMalwareScan } from "@/lib/upload-security";
import { MATERIAL_TEXT_LIMIT } from "@/lib/material-text";
import { INLINE_TYPES, MAX_MATERIAL_BYTES, fileExtension, isInlineType } from "@/lib/material-files";
import { prepareNoteImport } from "@/lib/note-import";
import { screenNoteHeuristically } from "@/lib/integrity";
import { MATERIALS_BUCKET, UUID, stagingPath } from "@/lib/material-upload";

export const maxDuration = 60;

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

/**
 * Step 2 of an upload: the file is already in the student's staging folder.
 * Check it, store it where classmates can open it, and save its details.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Log in before uploading.", 401);
  const form = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const field = (key: string) => (typeof form?.[key] === "string" ? (form[key] as string).trim() : "");
  const courseId = field("courseId");
  const uploadId = field("uploadId");
  const fileName = field("fileName");
  const title = field("title");
  const description = field("description");
  const date = field("lectureDate");
  const kind = field("kind") === "notes" ? "notes" : "material";
  if (!UUID.test(courseId) || !UUID.test(uploadId) || !fileName) return fail("Upload the file again.", 400);
  if (title.length < 2 || title.length > 140 || description.length > 600) return fail("Enter a title (2 to 140 characters).", 400);
  if (date ? !/^\d{4}-\d{2}-\d{2}$/.test(date) : kind === "notes") return fail("Pick the lecture date.", 400);
  if (form?.permission !== true) {
    return fail("Confirm that you have permission to share this file and it is not exam material.", 400);
  }

  const admin = createAdminClient();
  const staged = stagingPath(user.id, uploadId);
  try {
    const supabase = await createClient();
    const { data: member } = await supabase.from("enrollments").select("course_id")
      .eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
    if (!member) return fail("Join this course before sharing files.", 403);

    const { data: blob, error: downloadError } = await admin.storage.from(MATERIALS_BUCKET).download(staged);
    if (downloadError || !blob) return fail("The upload didn't finish. Try again.", 400);
    if (blob.size > MAX_MATERIAL_BYTES) return fail("That file is too large.", 413);
    const bytes = Buffer.from(await blob.arrayBuffer());

    const unsafeReason = validateClassMaterial(fileName, bytes);
    if (unsafeReason) return fail(unsafeReason, 415);
    try { await verifyExternalMalwareScan(bytes, fileName); }
    catch (error) {
      console.error("malware scan rejected or failed", error);
      return fail(error instanceof Error ? error.message : "File scanning failed.", 422);
    }

    // Read the text of documents, slides, and spreadsheets for the preview and integrity check.
    let prepared: ReturnType<typeof prepareNoteImport>;
    try { prepared = prepareNoteImport(bytes, fileName); }
    catch { return fail("Could not read this file. Try exporting it as a PDF.", 422); }
    const text = prepared.kind === "text" ? prepared.text.slice(0, MATERIAL_TEXT_LIMIT) : "";
    if (text && screenNoteHeuristically({ title, topic: "", content: text }).level === "block") {
      return fail("This file appears to include quiz or exam material and can't be shared.", 422);
    }

    // Only real PDFs and images are stored with a type browsers display. Everything
    // else is stored as a generic download, so an uploaded web page or script can
    // never run in a classmate's browser.
    let fileType = fileExtension(fileName);
    if (prepared.kind === "media") {
      fileType = prepared.mediaType === "application/pdf" ? "pdf" : prepared.mediaType.slice("image/".length).replace("jpeg", "jpg");
    } else if (isInlineType(fileType)) {
      fileType = "file"; // named like a PDF or image, but it isn't one
    }
    const contentType = isInlineType(fileType) ? INLINE_TYPES[fileType] : "application/octet-stream";

    const safeFileName = fileName.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9_. ()-]/g, "_").slice(0, 180) || "file";
    const path = `${courseId}/${user.id}/${randomUUID()}.${fileType}`;
    const { error: uploadError } = await admin.storage.from(MATERIALS_BUCKET).upload(path, bytes, {
      contentType, upsert: false, cacheControl: "60",
    });
    if (uploadError) {
      console.error("material storage failed", uploadError);
      return fail("Couldn't save this file. Please try again.", 502);
    }

    const { error: saveError } = await admin.from("course_materials").insert({
      course_id: courseId, uploaded_by: user.id, title, description, kind,
      lecture_date: date || null, source_type: "file", file_type: fileType,
      file_name: safeFileName, storage_path: path, extracted_text: text,
    });
    if (saveError) {
      console.error("material metadata insert failed", saveError);
      await admin.storage.from(MATERIALS_BUCKET).remove([path]);
      return fail("Couldn't save the file details. Please try again.", 502);
    }
    return NextResponse.json({ success: true });
  } finally {
    await admin.storage.from(MATERIALS_BUCKET).remove([staged]).catch(() => {});
  }
}
