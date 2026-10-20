// Study-partner matching. Pure functions so they're easy to test.

export type MatchProfile = {
  id: string;
  study_styles: string[];
  availability: string[];
};

export type MatchInput = {
  me: MatchProfile;
  them: MatchProfile;
  /** Course codes the two students share, e.g. ["MATH 3090"]. */
  sharedCourses: string[];
  /** How many notes they've shared in those courses. */
  theirNoteCount: number;
};

export type MatchResult = {
  score: number; // 0 to 100
  reasons: string[];
  sharedTimes: string[];
  sharedStyles: string[];
};

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(a);
  return [...new Set(b)].filter((x) => set.has(x));
}

/**
 * Scores how well two classmates would study together.
 * - Shared courses matter most (up to 55 points).
 * - Overlapping free time (up to 25): you can't study together if you're never free together.
 * - Similar study style (up to 12).
 * - Actively sharing notes (up to 8): a sign they'll show up prepared.
 */
export function scoreMatch({ me, them, sharedCourses, theirNoteCount }: MatchInput): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const courses = sharedCourses.length;
  if (courses > 0) {
    score += Math.min(55, 40 + (courses - 1) * 15);
    reasons.push(courses === 1 ? `Also in ${sharedCourses[0]}` : `${courses} classes together: ${sharedCourses.join(", ")}`);
  }

  const sharedTimes = overlap(me.availability, them.availability);
  if (me.availability.length > 0 && them.availability.length > 0) {
    const base = Math.min(me.availability.length, them.availability.length);
    score += Math.round((sharedTimes.length / base) * 25);
    if (sharedTimes.length > 0) reasons.push(`Free at the same times (${sharedTimes.length} overlap${sharedTimes.length === 1 ? "" : "s"})`);
  }

  const sharedStyles = overlap(me.study_styles, them.study_styles);
  if (me.study_styles.length > 0 && them.study_styles.length > 0) {
    const union = new Set([...me.study_styles, ...them.study_styles]).size;
    score += Math.round((sharedStyles.length / union) * 12);
    if (sharedStyles.length > 0) reasons.push("Similar study style");
  }

  if (theirNoteCount > 0) {
    score += Math.min(8, 3 + theirNoteCount);
    reasons.push(`Shared ${theirNoteCount} note${theirNoteCount === 1 ? "" : "s"}`);
  }

  return { score: Math.min(100, score), reasons, sharedTimes, sharedStyles };
}

export function rankMatches<T extends { result: MatchResult; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.result.score - a.result.score || a.name.localeCompare(b.name));
}
