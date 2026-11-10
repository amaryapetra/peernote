import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkMaterialName } from "@/lib/upload-security";
import { MAX_MATERIAL_BYTES, MAX_MATERIAL_LABEL } from "@/lib/material-files";
import { MATERIALS_BUCKET, UUID, clearOldStaging, stagingPath } from "@/lib/material-upload";

function fail(error: string, status: number) { return NextResponse.json({ error }, { status }); }

/** Step 1 of an upload: checks the student and file name, then returns a one-time upload link. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Log in before uploading.", 401);
  const body = (await request.json().catch(() => null)) as { courseId?: unknown; fileName?: unknown; size?: unknown } | null;
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const fileName = typeof body?.fileName === "string" ? body.fileName : "";
  const size = typeof body?.size === "number" ? body.size : 0;
  if (!UUID.test(courseId) || !fileName) return fail("Choose a file to upload.", 400);
  if (size <= 0) return fail("That file is empty.", 400);
  if (size > MAX_MATERIAL_BYTES) return fail(`Files must be ${MAX_MATERIAL_LABEL} or smaller.`, 413);
  const nameError = checkMaterialName(fileName);
  if (nameError) return fail(nameError, 415);

  const supabase = await createClient();
  const { data: member } = await supabase.from("enrollments").select("course_id")
    .eq("course_id", courseId).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("Join this course before sharing files.", 403);
  const { data: reserved, error: quotaError } = await supabase.rpc("reserve_material_upload", { p_course: courseId });
  if (quotaError || !reserved) {
    return fail(quotaError ? "Couldn't verify your upload allowance." : "You've uploaded 12 files in the last 24 hours. Try again later.", 429);
  }

  const admin = createAdminClient();
  await clearOldStaging(admin, user.id).catch((error) => console.error("staging cleanup failed", error));
  const uploadId = randomUUID();
  const { data, error } = await admin.storage.from(MATERIALS_BUCKET).createSignedUploadUrl(stagingPath(user.id, uploadId));
  if (error || !data) {
    console.error("signed upload url failed", error);
    return fail("Couldn't start the upload. Please try again.", 502);
  }
  return NextResponse.json({ uploadId, uploadUrl: data.signedUrl });
}
