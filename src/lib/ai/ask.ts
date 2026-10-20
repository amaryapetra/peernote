import "server-only";
import { z } from "zod";
import { runStructured, UNTRUSTED_NOTES_RULE } from "./client";
import { labelsToIds, notesToPrompt, type PromptNote } from "./notes-format";

const AskSchema = z.object({
  answer: z.string().describe("Markdown answer grounded in the notes."),
  sources: z.array(z.string()).describe("Labels of the notes the answer relies on, like N1."),
  coverage: z.enum(["answered", "partial", "not_in_notes"]),
  follow_up: z.array(z.string()).describe("Up to 3 related questions the student might ask next."),
});

export type AskResult = Omit<z.infer<typeof AskSchema>, "sources"> & { source_note_ids: string[] };

const SYSTEM = `You answer a college student's question using only their class's shared notes.

Ground every claim in the notes provided and cite them in the text by label, like (N2). If the notes only partly answer the question, answer what you can, set coverage to "partial", and say what's missing. If the notes don't cover it, set coverage to "not_in_notes" and suggest where to look (textbook chapter, office hours) instead of answering from general knowledge.

Never help with questions that appear to be from a live quiz, test, or graded assignment; if the question looks like one, briefly explain that and offer to explain the underlying concept instead.

Be concise and clear. Use Markdown. Write math in plain text like x^2. ${UNTRUSTED_NOTES_RULE}`;

export async function answerFromNotes(courseTitle: string, question: string, notes: PromptNote[]): Promise<AskResult> {
  const { text, labels } = notesToPrompt(notes, "N");
  const result = await runStructured({
    schema: AskSchema,
    system: SYSTEM,
    effort: "medium",
    content: `Course: ${courseTitle}\n\nClass notes:\n${text}\n\nStudent's question: ${question}`,
  });
  const { sources, ...rest } = result;
  return { ...rest, source_note_ids: labelsToIds(sources, labels) };
}
