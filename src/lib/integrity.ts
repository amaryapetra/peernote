// Fast, local pre-check for academic-integrity problems in uploaded notes.
// The AI screen (src/lib/ai/integrity.ts) makes the final call; this catches
// obvious cases for free and keeps the app safe when no AI key is configured.

export type HeuristicVerdict = {
  level: "clear" | "suspicious" | "block";
  reasons: string[];
};

const BLOCK_PHRASES: [RegExp, string][] = [
  [/\banswer\s*key\b/i, "mentions an answer key"],
  [/\btest\s*bank\b/i, "mentions a test bank"],
  [/\b(exam|midterm|final|quiz|test)\s+(questions?|answers?|solutions?)\b(?![^\n]{0,40}\b(might|may|could|will)\b)/i, "looks like exam or quiz questions/answers"],
  [/\b(solutions?|answers?)\s+(to|for)\s+(the\s+)?(exam|midterm|final|quiz|test)\b/i, "looks like solutions to an assessment"],
];

const SUSPICIOUS_PHRASES: [RegExp, string][] = [
  [/\b(quiz|exam|midterm|test)\s*#?\d+\b/i, "references a specific numbered quiz or exam"],
  [/\b(take-?home|graded)\s+(exam|quiz|assignment)\b/i, "references graded work"],
  [/\bversion\s+[A-D]\b/i, "mentions an exam version"],
];

/** Counts lines like "1. (5 points)" or "Question 3 [10 pts]". */
function pointValueQuestions(text: string): number {
  return (text.match(/^\s*(q(uestion)?\s*)?\d+[.)]?.{0,60}[([]\s*\d+\s*(points?|pts?)\s*[)\]]/gim) ?? []).length;
}

/** Counts multiple-choice blocks: a line, then at least three "a) / B. / (c)" options. */
function multipleChoiceBlocks(text: string): number {
  const optionLine = /^\s*\(?[a-eA-E][.)]\s+\S/;
  let blocks = 0;
  let run = 0;
  for (const line of text.split("\n")) {
    if (optionLine.test(line)) {
      run += 1;
      if (run === 3) blocks += 1;
    } else if (line.trim() !== "") {
      run = 0;
    }
  }
  return blocks;
}

export function screenNoteHeuristically(input: { title: string; topic: string; content: string }): HeuristicVerdict {
  const text = `${input.title}\n${input.topic}\n${input.content}`;
  const reasons: string[] = [];
  let level: HeuristicVerdict["level"] = "clear";

  for (const [pattern, reason] of BLOCK_PHRASES) {
    if (pattern.test(text)) {
      reasons.push(reason);
      level = "block";
    }
  }

  const graded = pointValueQuestions(text);
  if (graded >= 2) {
    reasons.push(`has ${graded} questions with point values, like a graded test`);
    level = "block";
  }

  const mc = multipleChoiceBlocks(text);
  if (mc >= 3) {
    reasons.push(`has ${mc} multiple-choice questions`);
    if (level !== "block") level = "suspicious";
  }

  for (const [pattern, reason] of SUSPICIOUS_PHRASES) {
    if (pattern.test(text)) {
      reasons.push(reason);
      if (level === "clear") level = "suspicious";
    }
  }

  return { level, reasons };
}
