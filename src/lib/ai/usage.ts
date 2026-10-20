import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Per-student hourly caps so one account can't run up the team's AI bill.
const HOURLY_LIMITS: Record<string, number> = {
  integrity: 40,
  gap_fill: 15,
  catch_up: 15,
  ask: 30,
  transcribe: 15,
};

export type UsageKind = keyof typeof HOURLY_LIMITS;

/** Returns an error message if the student is over their limit, otherwise records the use. */
export async function checkAndRecordUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: UsageKind,
): Promise<string | null> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) return "Couldn't check your AI usage. Try again.";
  if ((count ?? 0) >= HOURLY_LIMITS[kind]) {
    return "You've hit the hourly limit for this AI feature. Try again in a bit.";
  }
  await supabase.from("ai_usage").insert({ user_id: userId, kind });
  return null;
}
