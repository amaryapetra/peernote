import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(), from: vi.fn(), insert: vi.fn(), update: vi.fn(), eq: vi.fn(), refresh: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mocks.from }) }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { updateProfile } from "@/app/actions/profile";
import { sendDirectMessage } from "@/app/actions/messages";
import { createCourse } from "@/app/actions/courses";

const userId = "12345678-1234-4234-8234-123456789abc";
const connectionId = "22345678-1234-4234-8234-123456789abc";
function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: userId });
  mocks.from.mockReturnValue({ insert: mocks.insert, update: mocks.update });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ error: null });
  mocks.redirect.mockImplementation((url) => { throw new Error(`REDIRECT:${url}`); });
});

describe("optional phone contact", () => {
  it.each([undefined, "", "   "])("saves a profile with no phone (%s)", async (phone) => {
    const data = form({ full_name: "Test Student", school: "Tulane University", contact: "student@example.com" });
    if (phone !== undefined) data.set("phone", phone);
    expect((await updateProfile(undefined, data))?.success).toBe("Profile saved.");
    expect(mocks.update).toHaveBeenCalledWith({ contact: "student@example.com", phone: null });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", userId);
  });
  it("preserves international phone formatting and other contact info", async () => {
    const result = await updateProfile(undefined, form({ full_name: "Test Student", school: "Tulane", contact: "@student", phone: " +44 20 7946 0958 " }));
    expect(result?.success).toBeTruthy();
    expect(mocks.update).toHaveBeenCalledWith({ contact: "@student", phone: "+44 20 7946 0958" });
  });
  it.each(["abc", "123", "+1234567890123456", "javascript:alert(1)"])("rejects invalid phone %s before writing", async (phone) => {
    const result = await updateProfile(undefined, form({ full_name: "Test Student", school: "Tulane", phone }));
    expect(result?.fieldErrors?.phone).toBeTruthy();
    expect(result?.values?.phone).toBe(phone);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});

describe("direct messages", () => {
  it("uses the signed-in sender and trims the message", async () => {
    expect((await sendDirectMessage(undefined, form({ connectionId, body: "  Library at 5?  ", sender_id: "attacker" })))?.success).toBeTruthy();
    expect(mocks.insert).toHaveBeenCalledWith({ connection_id: connectionId, sender_id: userId, body: "Library at 5?" });
    expect(mocks.refresh).toHaveBeenCalled();
  });
  it.each(["", " \n\t ", "x".repeat(2001)])("rejects invalid message length", async (body) => {
    expect((await sendDirectMessage(undefined, form({ connectionId, body })))?.error).toBeTruthy();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("rejects a malformed conversation ID", async () => {
    expect((await sendDirectMessage(undefined, form({ connectionId: "not-a-uuid", body: "Hi" })))?.error).toBeTruthy();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("preserves a draft when the connection is removed or sending fails", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "42501" } });
    const result = await sendDirectMessage(undefined, form({ connectionId, body: "My draft" }));
    expect(result?.error).toBeTruthy();
    expect(result?.values?.body).toBe("My draft");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it("requires authentication before any write", async () => {
    mocks.requireUser.mockRejectedValue(new Error("Signed out"));
    await expect(sendDirectMessage(undefined, form({ connectionId, body: "Hi" }))).rejects.toThrow("Signed out");
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe("course creation with member-only reads", () => {
  const course = { code: "POLI 2500", title: "International Relations", term: "Fall 2026", instructor: "Michael Jones", school: "Tulane University" };
  it("inserts without RETURNING and redirects to the generated course ID", async () => {
    await expect(createCourse(undefined, form(course))).rejects.toThrow("REDIRECT:/courses/");
    const inserted = mocks.insert.mock.calls[0][0];
    expect(inserted).toMatchObject({ ...course, created_by: userId });
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.redirect).toHaveBeenCalledWith(`/courses/${inserted.id}?created=1`);
  });
  it("keeps duplicate-course guidance and form values", async () => {
    mocks.insert.mockResolvedValue({ error: { code: "23505" } });
    const result = await createCourse(undefined, form(course));
    expect(result?.error).toContain("invite code");
    expect(result?.values).toEqual(course);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
