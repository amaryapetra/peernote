import { describe, expect, it } from "vitest";
import { rankMatches, scoreMatch } from "@/lib/matching";

const me = { id: "me", study_styles: ["problems", "talk"], availability: ["weekday-evening", "weekend-afternoon"] };

describe("scoreMatch", () => {
  it("scores a strong match highly and explains why", () => {
    const result = scoreMatch({
      me,
      them: { id: "a", study_styles: ["problems", "talk"], availability: ["weekday-evening", "weekend-afternoon"] },
      sharedCourses: ["MATH 3090", "ECON 3010"],
      theirNoteCount: 4,
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.reasons).toContain("2 classes together: MATH 3090, ECON 3010");
    expect(result.sharedTimes).toEqual(["weekday-evening", "weekend-afternoon"]);
  });

  it("gives no time credit when schedules never overlap", () => {
    const result = scoreMatch({
      me,
      them: { id: "b", study_styles: [], availability: ["weekday-morning"] },
      sharedCourses: ["MATH 3090"],
      theirNoteCount: 0,
    });
    expect(result.score).toBe(40);
    expect(result.sharedTimes).toEqual([]);
    expect(result.reasons).toEqual(["Also in MATH 3090"]);
  });

  it("handles empty profiles without dividing by zero", () => {
    const result = scoreMatch({
      me: { id: "me", study_styles: [], availability: [] },
      them: { id: "c", study_styles: [], availability: [] },
      sharedCourses: [],
      theirNoteCount: 0,
    });
    expect(result.score).toBe(0);
    expect(Number.isFinite(result.score)).toBe(true);
  });

  it("caps the score at 100", () => {
    const result = scoreMatch({
      me,
      them: { id: "d", study_styles: me.study_styles, availability: me.availability },
      sharedCourses: ["A", "B", "C", "D", "E"],
      theirNoteCount: 50,
    });
    expect(result.score).toBe(100);
  });
});

describe("rankMatches", () => {
  it("sorts by score, then name", () => {
    const mk = (name: string, score: number) => ({ name, result: { score, reasons: [], sharedTimes: [], sharedStyles: [] } });
    const ranked = rankMatches([mk("Zoe", 50), mk("Ana", 50), mk("Max", 90)]);
    expect(ranked.map((r) => r.name)).toEqual(["Max", "Ana", "Zoe"]);
  });
});
