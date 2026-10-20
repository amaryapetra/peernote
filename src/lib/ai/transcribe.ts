import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { runText } from "./client";

export const TRANSCRIBE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"] as const;
export type TranscribeType = (typeof TRANSCRIBE_TYPES)[number];

const SYSTEM = `You turn photos or PDFs of class notes into clean, faithful Markdown.

Transcribe what's there, including handwriting, in reading order. Keep the student's structure: headings, bullet points, numbered steps, and emphasis. Write math in plain text (x^2, sqrt(x), integral from 0 to 1 of f(x) dx). Describe diagrams briefly in brackets, like [Diagram: supply and demand curves crossing at equilibrium]. Mark words you can't read as [illegible].

Output only the Markdown notes, with no introduction or commentary. If the file isn't class notes, output exactly: NOT_NOTES`;

export async function transcribeNotes(data: Buffer, mediaType: TranscribeType): Promise<string> {
  const base64 = data.toString("base64");
  const block: Anthropic.Beta.BetaContentBlockParam =
    mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  return runText({
    system: SYSTEM,
    effort: "low",
    content: [block, { type: "text", text: "Transcribe these notes." }],
  });
}
