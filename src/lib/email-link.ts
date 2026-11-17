// Shared rules for links in Supabase emails (sign-up confirmation, password reset).

/** Where to send someone after an email link works, and where to send them if it doesn't. */
export function emailLinkDestinations(type: string | null, nextParam: string | null) {
  const next = nextParam ?? "/dashboard";
  const isRecovery = type === "recovery" || next === "/reset-password";
  const success = isRecovery
    ? "/reset-password"
    : next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/dashboard";
  const failure = isRecovery ? "/forgot-password?error=link" : "/login?error=link";
  return { isRecovery, success, failure };
}
