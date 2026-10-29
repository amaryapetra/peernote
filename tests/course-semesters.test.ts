import { describe, expect, it } from "vitest";
import { groupCoursesBySemester } from "@/lib/course-semesters";

const makeCourse = (id: string, term: string, code: string) => ({ id, term, code });

describe("semester folders", () => {
  it("groups courses by semester and orders newest semesters first", () => {
    const folders = groupCoursesBySemester([
      makeCourse("1", "Spring 2026", "SOCI 2010"),
      makeCourse("2", "Fall 2026", "DATA 2150"),
      makeCourse("3", "Fall 2026", "ECON 3010"),
      makeCourse("4", "Spring 2027", "HIST 1000"),
    ]);
    expect(folders.map(({ term }) => term)).toEqual(["Spring 2027", "Fall 2026", "Spring 2026"]);
    expect(folders[1].courses.map(({ code }) => code)).toEqual(["DATA 2150", "ECON 3010"]);
  });

  it("normalizes letter case and whitespace in semester names", () => {
    const folders = groupCoursesBySemester([
      makeCourse("1", " fall  2026 ", "SOCI 1010"),
      makeCourse("2", "Fall 2026", "DATA 2150"),
    ]);
    expect(folders).toHaveLength(1);
    expect(folders[0].term).toBe("Fall 2026");
  });

  it("preserves unknown school term names and does not mutate the input", () => {
    const input = [
      makeCourse("2", "Quarter 1 2026", "ZZZ 101"),
      makeCourse("1", "Fall 2026", "DATA 2150"),
    ];
    const folders = groupCoursesBySemester(input);
    expect(folders.map(({ term }) => term)).toEqual(["Fall 2026", "Quarter 1 2026"]);
    expect(input[0].id).toBe("2");
  });

  it("handles an empty course list", () => {
    expect(groupCoursesBySemester([])).toEqual([]);
  });
});
