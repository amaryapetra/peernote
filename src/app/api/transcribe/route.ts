import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyAiError, isAiConfigured } from "@/lib/ai/client";
import { TRANSCRIBE_TYPES, transcribeNotes, type TranscribeType } from "@/lib/ai/transcribe";
import { checkAndRecordUsage } from "@/lib/ai/usage";

// Vercel's request body limit is about 4.5 MB, so stay under it.
const MAX_BYTES = 4 * 1024 * 1024;

export const maxDuration = 60;

/** Turns a photo or PDF of notes into Markdown the student can edit before sharing. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  if (!isAiConfigured()) return NextResponse.json({ error: "AI features aren't set up on this server yet." }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!(TRANSCRIBE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, WebP, GIF, or PDF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 4 MB. Try a smaller photo." }, { status: 413 });

  const supabase = await createClient();
  const limited = await checkAndRecordUsage(supabase, user.id, "transcribe");
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const text = await transcribeNotes(Buffer.from(await file.arrayBuffer()), file.type as TranscribeType);
    if (text === "NOT_NOTES" || text.length < 5) {
      return NextResponse.json({ error: "That doesn't look like class notes." }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("transcribe failed", error);
    return NextResponse.json({ error: friendlyAiError(error) }, { status: 502 });
  }
}
