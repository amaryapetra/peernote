import { describe, expect, it } from "vitest";
import { firstName, formatDate, formatLectureDate, initials, timeAgo, todayISO, wordCount } from "@/lib/format";
import { suggestedTerms } from "@/lib/constants";

describe("format helpers", () => {
  it("formats plain dates without timezone drift", () => {
    expect(formatDate("2026-10-01")).toBe("Oct 1, 2026");
    expect(formatLectureDate("2026-10-13")).toBe("Tuesday, Oct 13");
  });

  it("builds initials and first names", () => {
    expect(initials("Amarya Levy")).toBe("AL");
    expect(initials("  ")).toBe("?");
    expect(firstName("Avi Cohen")).toBe("Avi");
  });

  it("counts words", () => {
    expect(wordCount("  one two\nthree ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });

  it("describes relative time", () => {
    const now = Date.parse("2026-10-20T12:00:00Z");
    expect(timeAgo("2026-10-20T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-20T09:00:00Z", now)).toBe("3 hr ago");
    expect(timeAgo("2026-10-19T12:00:00Z", now)).toBe("1 day ago");
  });

  it("gets today's date in New Orleans", () => {
    // 3am UTC on Oct 21 is still Oct 20 in Central time.
    expect(todayISO("America/Chicago", new Date("2026-10-21T03:00:00Z"))).toBe("2026-10-20");
  });

  it("suggests upcoming terms", () => {
    expect(suggestedTerms(new Date("2026-10-20T12:00:00Z"))).toEqual(["Fall 2026", "Spring 2027", "Summer 2027"]);
    expect(suggestedTerms(new Date("2027-02-01T12:00:00Z"))[0]).toBe("Spring 2027");
  });
});
