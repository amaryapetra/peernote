import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

// Browsers upload files straight to Supabase Storage (Vercel caps request bodies
// at about 4.5 MB). Each upload lands in a private staging folder for its
// uploader. The server then checks it and copies it to its final place, so
// nothing reaches classmates without passing the same checks as before.

export const MATERIALS_BUCKET = "course-materials";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Staging path for one upload. Scoped to the uploader so no one can claim another student's file. */
export function stagingPath(userId: string, uploadId: string): string {
  return `staging/${userId}/${uploadId}`;
}

/** Removes this student's abandoned uploads (signed upload links expire after 2 hours). */
export async function clearOldStaging(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.storage.from(MATERIALS_BUCKET).list(`staging/${userId}`, { limit: 100 });
  const cutoff = Date.now() - 3 * 3600 * 1000;
  const old = (data ?? [])
    .filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff)
    .map((f) => `staging/${userId}/${f.name}`);
  if (old.length) await admin.storage.from(MATERIALS_BUCKET).remove(old);
}
