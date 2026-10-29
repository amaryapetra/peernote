import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type UsageKind = "integrity" | "gap_fill" | "catch_up" | "ask" | "transcribe";

/**
 * Reserve a call atomically in Postgres. The SQL function takes the caller's
 * identity from auth.uid(), locks that user + feature, checks the rolling
 * hourly limit, and records usage in the same transaction.
 *
 * The user ID is retained for backwards compatibility with existing actions,
 * but deliberately never sent to the database as an authorization claim.
 */
export async function checkAndRecordUsage(
  supabase: SupabaseClient<Database>,
  _userId: string,
  kind: UsageKind,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("consume_ai_quota", { p_kind: kind });
  // Fail closed on errors: never run a billable AI request without a recorded reservation.
  if (error || data === null) {
    console.error("AI usage reservation failed", error);
    return "Couldn't check your AI usage. Try again.";
  }
  return data ? null : "You've hit the hourly limit for this AI feature. Try again in a bit.";
}
