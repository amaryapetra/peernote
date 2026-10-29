import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Short-lived private URL, generated only for enrolled course members. */
export async function GET(_request: NextRequest, context: RouteContext<"/api/materials/[materialId]">) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Log in first.", { status: 401 });
  const { materialId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(materialId)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: item } = await supabase.from("course_materials")
    .select("course_id, storage_path, source_type, file_type, file_name")
    .eq("id", materialId).maybeSingle();
  if (!item || item.source_type !== "file" || !item.storage_path) return new NextResponse("Not found", { status: 404 });
  // RLS protects metadata and storage independently. Check membership again.
  const { data: enrollment } = await supabase.from("enrollments")
    .select("course_id").eq("course_id", item.course_id).eq("user_id", user.id).maybeSingle();
  if (!enrollment) return new NextResponse("Not found", { status: 404 });
  const { data, error } = await supabase.storage.from("course-materials").createSignedUrl(
    item.storage_path, 60, item.file_type === "pptx" ? { download: item.file_name ?? true } : undefined,
  );
  if (error || !data?.signedUrl) return new NextResponse("Couldn't open the file.", { status: 502 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
