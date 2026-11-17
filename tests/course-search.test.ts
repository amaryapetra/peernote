import { describe, expect, it } from "vitest";
import { inviteCodeFromSearchQuery } from "@/lib/course-search";

describe("Find a course invite-code detection", () => {
  it("recognizes a complete invite code", () => {
    expect(inviteCodeFromSearchQuery("ABCDEF123456")).toBe("ABCDEF123456");
  });
  it("handles lowercase invite codes and surrounding spaces", () => {
    expect(inviteCodeFromSearchQuery("  abcdef123456  ")).toBe("ABCDEF123456");
  });
  it("leaves ordinary course code, name, and professor searches alone", () => {
    expect(inviteCodeFromSearchQuery("DATA 2150")).toBeNull();
    expect(inviteCodeFromSearchQuery("Linear Algebra")).toBeNull();
    expect(inviteCodeFromSearchQuery("Prof. Lee")).toBeNull();
  });
  it("does not interpret partial or malformed invite codes as valid", () => {
    expect(inviteCodeFromSearchQuery("ABCDEF12345")).toBeNull();
    expect(inviteCodeFromSearchQuery("ABCDEF1234567")).toBeNull();
    expect(inviteCodeFromSearchQuery("ABCDEFG12345")).toBeNull();
  });
});
