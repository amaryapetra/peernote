/** Semester helpers for the course folders. Keep grouping independent of the UI. */
export type SemesterFolder<T> = { term: string; courses: T[] };

const SEASON_ORDER: Record<string, number> = {
  winter: 0,
  spring: 1,
  summer: 2,
  fall: 3,
};

/** Normalize conventional semester labels without changing unusual school terms. */
function normalizeTerm(term: string): string {
  const clean = term.trim().replace(/\s+/g, " ");
  const match = /^(winter|spring|summer|fall) (\d{4})$/i.exec(clean);
  if (!match) return clean || "Other courses";
  return `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${match[2]}`;
}

function termSortValue(term: string): number {
  const match = /^(winter|spring|summer|fall) (\d{4})$/i.exec(term);
  return match ? Number(match[2]) * 4 + SEASON_ORDER[match[1].toLowerCase()] : -1;
}

/** Newest semester first; course cards alphabetical within each folder. */
export function groupCoursesBySemester<T extends { id: string; term: string; code: string }>(
  courses: readonly T[],
): SemesterFolder<T>[] {
  const bySemester = new Map<string, T[]>();
  for (const course of courses) {
    const term = normalizeTerm(course.term);
    const folder = bySemester.get(term) ?? [];
    folder.push(course);
    bySemester.set(term, folder);
  }

  return [...bySemester.entries()]
    .sort(([a], [b]) => termSortValue(b) - termSortValue(a) || a.localeCompare(b))
    .map(([term, items]) => ({
      term,
      courses: [...items].sort((a, b) => a.code.localeCompare(b.code) || a.id.localeCompare(b.id)),
    }));
}
