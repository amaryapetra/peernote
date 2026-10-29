import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyAiError, isAiConfigured } from "@/lib/ai/client";
import { transcribeNotes } from "@/lib/ai/transcribe";
import { checkAndRecordUsage } from "@/lib/ai/usage";
import { prepareNoteImport } from "@/lib/note-import";

// Vercel's request body limit is about 4.5 MB, so stay under it.
const MAX_BYTES = 4 * 1024 * 1024;

export const maxDuration = 60;

/**
 * Turns an uploaded file of notes into Markdown the student can edit before sharing.
 * Documents, slides, spreadsheets, and text files are read directly; photos and
 * PDFs are transcribed with AI.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 4 MB. Try a smaller file." }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer());
  const prepared = prepareNoteImport(data, file.name);
  if (prepared.kind === "unsupported") return NextResponse.json({ error: prepared.message }, { status: 415 });
  if (prepared.kind === "text") {
    if (!prepared.text.trim()) return NextResponse.json({ error: "We didn't find any text in that file." }, { status: 422 });
    return NextResponse.json({ text: prepared.text });
  }

  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Reading photos and PDFs needs AI, which isn't set up on this server yet." }, { status: 503 });
  }
  const supabase = await createClient();
  const limited = await checkAndRecordUsage(supabase, user.id, "transcribe");
  if (limited) return NextResponse.json({ error: limited }, { status: 429 });

  try {
    const text = await transcribeNotes(data, prepared.mediaType);
    if (text === "NOT_NOTES" || text.length < 5) {
      return NextResponse.json({ error: "That doesn't look like class notes." }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (error) {
    console.error("transcribe failed", error);
    return NextResponse.json({ error: friendlyAiError(error) }, { status: 502 });
  }
}
