export const STUDY_STYLES = [
  { id: "quiet", label: "Quiet, focused work" },
  { id: "talk", label: "Talking it through" },
  { id: "problems", label: "Working practice problems" },
  { id: "flashcards", label: "Flashcards and quizzing" },
  { id: "teach", label: "Teaching each other" },
  { id: "big-picture", label: "Big-picture review" },
] as const;

export const AVAILABILITY = [
  { id: "weekday-morning", label: "Weekday mornings" },
  { id: "weekday-afternoon", label: "Weekday afternoons" },
  { id: "weekday-evening", label: "Weekday evenings" },
  { id: "weekend-morning", label: "Weekend mornings" },
  { id: "weekend-afternoon", label: "Weekend afternoons" },
  { id: "weekend-evening", label: "Weekend evenings" },
] as const;

export const STUDY_STYLE_IDS: readonly string[] = STUDY_STYLES.map((s) => s.id);
export const AVAILABILITY_IDS: readonly string[] = AVAILABILITY.map((a) => a.id);

export function labelFor(list: readonly { id: string; label: string }[], id: string): string {
  return list.find((item) => item.id === id)?.label ?? id;
}

/** Suggested terms for the course form, nearest first. */
export function suggestedTerms(today = new Date()): string[] {
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = January
  const terms: string[] = [];
  if (month <= 4) terms.push(`Spring ${year}`, `Summer ${year}`, `Fall ${year}`);
  else if (month <= 6) terms.push(`Summer ${year}`, `Fall ${year}`, `Spring ${year + 1}`);
  else terms.push(`Fall ${year}`, `Spring ${year + 1}`, `Summer ${year + 1}`);
  return terms;
}
