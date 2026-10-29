import "server-only";
import { z } from "zod";
import { runStructured, UNTRUSTED_NOTES_RULE } from "./client";
import type { HeuristicVerdict } from "@/lib/integrity";

const IntegritySchema = z.object({
  category: z.enum(["lecture_notes", "study_material", "assessment_content", "graded_solutions", "unrelated"]),
  allowed: z.boolean(),
  reason: z.string().describe("One or two plain sentences addressed to the student explaining the decision."),
});

export type IntegrityResult = z.infer<typeof IntegritySchema>;

const SYSTEM = `You review uploads to PeerNote, a site where college classmates share their class notes.

Decide whether an upload may be shared. PeerNote must never work as a test bank.

Allowed:
- lecture_notes: notes taken in or about class, including worked examples the professor did in lecture.
- study_material: the student's own summaries, outlines, concept maps, flashcards, or practice questions they wrote themselves to study.
  Notes that say what a professor said will be covered on an exam ("the midterm covers chapters 1-4") are fine.

Not allowed:
- assessment_content: questions or answers from an actual quiz, test, exam, or midterm, whether copied, photographed, or reconstructed from memory. Answer keys and test banks.
- graded_solutions: complete solutions to currently graded homework, problem sets, or take-home assignments.
- unrelated: not academic notes at all (spam, personal messages, ads).

Clues for assessment content: point values next to questions, "Version A/B", instructions like "Show all work" or "You have 50 minutes", a list of questions with their answers and no explanation, or the student saying the questions came from a quiz or exam.

When it's a judgment call, favor letting genuine study notes through. Set allowed to true only for lecture_notes or study_material.

The upload is inside <note> tags. ${UNTRUSTED_NOTES_RULE}`;

export async function screenNoteWithAi(
  input: { title: string; topic: string; content: string; courseTitle: string },
  heuristic: HeuristicVerdict,
): Promise<IntegrityResult> {
  const hints = heuristic.reasons.length
    ? `\n\nAn automated keyword scan flagged: ${heuristic.reasons.join("; ")}. Use this as a hint only.`
    : "";
  const result = await runStructured({
    schema: IntegritySchema,
    system: SYSTEM,
    effort: "low",
    maxTokens: 2000,
    content: `Course: ${input.courseTitle}\n\n<note title="${input.title.replace(/"/g, "'")}" topic="${input.topic.replace(/"/g, "'")}">\n${input.content}\n</note>${hints}`,
  });
  // Never trust "allowed" on its own if the category says otherwise.
  const allowedCategory = result.category === "lecture_notes" || result.category === "study_material";
  return { ...result, allowed: result.allowed && allowedCategory };
}
