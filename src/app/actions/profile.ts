"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AVAILABILITY_IDS, STUDY_STYLE_IDS } from "@/lib/constants";
import type { FormState } from "@/components/form";

const ProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name.").max(80),
  school: z.string().trim().min(2, "Enter your school.").max(120),
  major: z.string().trim().max(120),
  grad_year: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 2000 && v <= 2100), "Enter a year like 2027."),
  bio: z.string().trim().max(600, "Keep your bio under 600 characters."),
  study_styles: z.array(z.string()).transform((list) => list.filter((s) => STUDY_STYLE_IDS.includes(s))),
  availability: z.array(z.string()).transform((list) => list.filter((s) => AVAILABILITY_IDS.includes(s))),
  contact: z.string().trim().max(200),
  phone: z.string().trim().max(40, "Keep your phone number under 40 characters.")
    .refine((v) => !v || (/^\+?[0-9().\s-]+$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15), "Enter a phone number with 7–15 digits, or leave it blank.")
    .transform((v) => v || null),
});

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values: Record<string, string | string[]> = {
    ...Object.fromEntries(["full_name", "school", "major", "grad_year", "bio", "contact", "phone"].map((k) => [k, String(formData.get(k) ?? "")])),
    study_styles: formData.getAll("study_styles").map(String),
    availability: formData.getAll("availability").map(String),
  };
  const parsed = ProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    school: formData.get("school"),
    major: formData.get("major") ?? "",
    grad_year: formData.get("grad_year") ?? "",
    bio: formData.get("bio") ?? "",
    study_styles: formData.getAll("study_styles").map(String),
    availability: formData.getAll("availability").map(String),
    contact: formData.get("contact") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { values, fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) };
  }
  const { contact, phone, ...profile } = parsed.data;
  const supabase = await createClient();
  const [profileResult, contactResult] = await Promise.all([
    supabase.from("profiles").update(profile).eq("id", user.id),
    supabase.from("contact_cards").update({ contact, phone }).eq("user_id", user.id),
  ]);
  if (profileResult.error || contactResult.error) return { values, error: "Couldn't save your profile. Try again." };
  refresh();
  return { values, success: "Profile saved." };
}
