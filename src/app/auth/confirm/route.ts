import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing spot for links in Supabase emails (sign-up confirmation, password reset).
// Supports both the token_hash style and the PKCE `code` style.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const isRecovery = type === "recovery" || nextParam === "/reset-password";
  const next = isRecovery ? "/reset-password" : nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.includes("\\") ? nextParam : "/dashboard";

  let ok = false;
  try {
    const supabase = await createClient();
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      ok = !error;
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    }
  } catch {
    // Show a usable retry page if the auth service cannot be reached.
  }

  const destination = request.nextUrl.clone();
  destination.search = "";
  if (ok) {
    const [path, query] = next.split("?");
    destination.pathname = path;
    if (query) destination.search = `?${query}`;
  } else {
    destination.pathname = isRecovery ? "/forgot-password" : "/login";
    destination.searchParams.set("error", "link");
  }
  return NextResponse.redirect(destination);
}
