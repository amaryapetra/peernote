"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import type { FormState } from "@/components/form";

/** Only allow redirects to our own pages, never to another site. */
function safeNext(value: FormDataEntryValue | null, fallback = "/dashboard"): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** Supabase errors without an HTTP status mean the auth service couldn't be reached. */
function authErrorMessage(error: { status?: number; code?: string; message: string }, fallback: string): string {
  if (!error.status || error.status >= 500) return "We couldn't reach the sign-in service. Try again in a moment.";
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return fallback;
}

async function siteOrigin(): Promise<string> {
  const origin = (await headers()).get("origin");
  return origin ?? SITE_URL;
}

const SignupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { fullName: String(formData.get("fullName") ?? ""), email: String(formData.get("email") ?? "") };
  const parsed = SignupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent("/profile?welcome=1")}`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { values, error: "That email already has an account. Try logging in." };
    if (error.code === "weak_password") return { values, error: "Pick a stronger password." };
    return { values, error: authErrorMessage(error, "We couldn't create your account. Check your details and try again.") };
  }

  // With email confirmation turned on, there's no session until they click the link.
  if (!data.session) {
    return { success: `Almost there! We sent a confirmation link to ${parsed.data.email}.` };
  }
  redirect("/profile?welcome=1");
}

const LoginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password."),
});

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = LoginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { values, error: "Confirm your email first. Check your inbox for the link." };
    return { values, error: authErrorMessage(error, "That email and password don't match.") };
  }
  redirect(safeNext(formData.get("next")));
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { fieldErrors: { email: "Enter a valid email address." } };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });
  // Same message either way, so this form can't be used to find out who has an account.
  return { success: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { fieldErrors: { password: "Use at least 8 characters." } };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Your reset link may have expired. Request a new one." };
  redirect("/dashboard");
}
