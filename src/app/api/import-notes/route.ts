import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prepareNoteImport } from "@/lib/note-import";

// Vercel's request body limit is about 4.5 MB, so stay under it.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Turns an uploaded file of notes into Markdown the student can edit before
 * sharing. Documents, slides, spreadsheets, and text files are supported.
 */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 4 MB. Try a smaller file." }, { status: 413 });

  const prepared = prepareNoteImport(Buffer.from(await file.arrayBuffer()), file.name);
  if (prepared.kind === "unsupported") return NextResponse.json({ error: prepared.message }, { status: 415 });
  if (prepared.kind === "media") {
    return NextResponse.json(
      { error: "Photos and PDFs can't be turned into text. To share one as a file, use “Upload a file of your notes” on the Share notes page." },
      { status: 415 },
    );
  }
  if (!prepared.text.trim()) return NextResponse.json({ error: "We didn't find any text in that file." }, { status: 422 });
  return NextResponse.json({ text: prepared.text });
}
