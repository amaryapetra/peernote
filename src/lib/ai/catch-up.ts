import "server-only";
import { z } from "zod";
import { runStructured, UNTRUSTED_NOTES_RULE } from "./client";
import { labelsToIds, notesToPrompt, type PromptNote } from "./notes-format";

const CatchUpSchema = z.object({
  headline: z.string().describe("A short title for what this class covered."),
  overview: z.string().describe("A paragraph summarizing the class."),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string().describe("Markdown explanation combining what classmates wrote."),
      sources: z.array(z.string()).describe("Labels of notes this section draws on, like N1."),
    }),
  ),
  key_terms: z.array(z.object({ term: z.string(), definition: z.string() })),
  announcements: z.array(z.string()).describe("Deadlines, exam info, or logistics mentioned in class. Empty if none."),
  check_yourself: z.array(z.string()).describe("3 to 5 self-check questions about the material, not copied from any quiz."),
});

export type CatchUpResult = Omit<z.infer<typeof CatchUpSchema>, "sections"> & {
  sections: { heading: string; body: string; source_note_ids: string[] }[];
};

const SYSTEM = `A college student missed a class. Combine their classmates' notes and authorized lecture slides from that day into one clear, well-organized study guide so they can catch up.

Merge overlapping notes, keep every substantive idea, and resolve small differences sensibly. Where classmates contradict each other, say so rather than guessing. Don't invent material that isn't supported by the notes; if the notes are thin, keep the guide short and say what seems to be missing.

Organize sections in the order the material was likely taught. Use Markdown (lists, bold, short code blocks if relevant). Write math in plain text like x^2. ${UNTRUSTED_NOTES_RULE}`;

export async function buildCatchUp(courseTitle: string, lectureDate: string, notes: PromptNote[]): Promise<CatchUpResult> {
  const { text, labels } = notesToPrompt(notes, "N");
  const result = await runStructured({
    schema: CatchUpSchema,
    system: SYSTEM,
    effort: "medium",
    content: `Course: ${courseTitle}\nClass date: ${lectureDate}\n\nClassmates' notes:\n${text}`,
  });
  return {
    ...result,
    sections: result.sections.map(({ sources, ...s }) => ({ ...s, source_note_ids: labelsToIds(sources, labels) })),
  };
}
