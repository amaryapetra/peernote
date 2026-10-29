import "server-only";
import { z } from "zod";
import { runStructured, UNTRUSTED_NOTES_RULE } from "./client";
import { labelsToIds, notesToPrompt, type PromptNote } from "./notes-format";

const GapSchema = z.object({
  summary: z.string().describe("Two or three sentences on how complete the student's notes are compared with classmates'."),
  missing: z.array(
    z.object({
      concept: z.string().describe("Short name of the missing idea."),
      explanation: z.string().describe("A clear explanation of the idea, written so the student could add it to their notes. Markdown allowed."),
      importance: z.enum(["key", "helpful", "minor"]),
      sources: z.array(z.string()).describe("Labels of classmate notes that mention it, like P1 or P2."),
    }),
  ),
  covered_well: z.array(z.string()).describe("Things the student's notes cover well, briefly."),
  questions_to_ask: z.array(z.string()).describe("Questions worth bringing to office hours or a study group, where classmates disagree or the notes are unclear."),
});

export type GapResult = Omit<z.infer<typeof GapSchema>, "missing"> & {
  missing: (Omit<z.infer<typeof GapSchema>["missing"][number], "sources"> & { source_note_ids: string[] })[];
};

const SYSTEM = `You help a college student fill gaps in their class notes by comparing them with classmates' notes and authorized lecture slides from the same lecture.

Find ideas, definitions, examples, formulas, or announcements that appear in classmates' notes but are missing or wrong in the student's notes. Focus on what would matter for understanding the material and doing well in the course. Skip trivial wording differences. If a classmate seems to have something wrong, don't present it as fact; mention the disagreement in questions_to_ask instead.

Order missing items from most to least important. Write explanations in your own words, accurate and concise, using Markdown and LaTeX-free plain math (like x^2) when needed. If nothing important is missing, return an empty missing list and say so in the summary.

The student's notes are labeled MINE. Classmates' notes are labeled P1, P2, and so on. ${UNTRUSTED_NOTES_RULE}`;

export async function findGaps(mine: PromptNote, peers: PromptNote[]): Promise<GapResult> {
  const myPart = notesToPrompt([mine], "MINE").text.replace('label="MINE1"', 'label="MINE"');
  const { text: peerPart, labels } = notesToPrompt(peers, "P");
  const result = await runStructured({
    schema: GapSchema,
    system: SYSTEM,
    effort: "medium",
    content: `My notes:\n${myPart}\n\nClassmates' notes from the same lecture:\n${peerPart}`,
  });
  return {
    ...result,
    missing: result.missing.map(({ sources, ...item }) => ({ ...item, source_note_ids: labelsToIds(sources, labels) })),
  };
}
