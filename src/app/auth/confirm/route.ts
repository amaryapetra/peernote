import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { emailLinkDestinations } from "@/lib/email-link";

// Landing spot for links in Supabase emails (sign-up confirmation, password reset).
// Supports both the token_hash style and the PKCE `code` style.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const { success, failure } = emailLinkDestinations(type, searchParams.get("next"));

  const destination = request.nextUrl.clone();
  destination.search = "";

  // Email security scanners (like Microsoft's at Tulane) open every link in an
  // email before the student does. If opening the link used up the one-time token,
  // the student's own click would fail. So token_hash links only show a page with a
  // button, and the token is used when a person presses it (see /confirm-link).
  if (tokenHash && type) {
    destination.pathname = "/confirm-link";
    destination.searchParams.set("token_hash", tokenHash);
    destination.searchParams.set("type", type);
    const next = searchParams.get("next");
    if (next) destination.searchParams.set("next", next);
    return NextResponse.redirect(destination);
  }

  let ok = false;
  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      ok = !error;
    } catch {
      // Show a usable retry page if the auth service cannot be reached.
    }
  }

  const target = new URL(ok ? success : failure, request.nextUrl.origin);
  destination.pathname = target.pathname;
  destination.search = target.search;
  return NextResponse.redirect(destination);
}
