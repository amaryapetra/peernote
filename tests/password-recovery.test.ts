import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(), getUser: vi.fn(), updateUser: vi.fn(),
  verifyOtp: vi.fn(), exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://peernote.example" }) }));
import { requestPasswordReset, updatePassword } from "@/app/actions/auth";
import { GET } from "@/app/auth/confirm/route";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const emailForm = () => form({ email: " Student@Tulane.edu " });
const passwordForm = (password = "New-Strong-Pass123!", confirmPassword = password) => form({ password, confirmPassword });
const confirm = (query: string) => GET(new NextRequest(`https://peernote.example/auth/confirm?${query}`));

beforeEach(() => {
  vi.resetAllMocks();
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({ data: { user: { id: "student" } }, error: null });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("requesting a password reset", () => {
  it("normalizes the email and sends users back to the password reset page", async () => {
    expect((await requestPasswordReset(undefined, emailForm()))?.success).toBeTruthy();
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("student@tulane.edu", {
      redirectTo: "https://peernote.example/auth/confirm?next=%2Freset-password",
    });
  });
  it("rejects invalid email addresses before requesting an email", async () => {
    expect((await requestPasswordReset(undefined, form({ email: "invalid" })))?.fieldErrors?.email).toBeTruthy();
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it("does not reveal whether an account exists", async () => {
    const existing = await requestPasswordReset(undefined, emailForm());
    auth.resetPasswordForEmail.mockResolvedValue({ error: { code: "user_not_found" } });
    expect(await requestPasswordReset(undefined, emailForm())).toEqual(existing);
  });
  it.each([
    [{ status: 429 }, /wait/],
    [{ code: "over_email_send_rate_limit" }, /wait/],
    [{ status: 500 }, /couldn't send/],
  ])("reports delivery failures instead of claiming success (%j)", async (error, message) => {
    auth.resetPasswordForEmail.mockResolvedValue({ error });
    const state = await requestPasswordReset(undefined, emailForm());
    expect(state?.error).toMatch(message);
    expect(state?.success).toBeUndefined();
    expect(state?.values?.email).toBe("student@tulane.edu");
  });
  it("handles a disconnected auth service", async () => {
    auth.resetPasswordForEmail.mockRejectedValue(new Error("offline"));
    expect((await requestPasswordReset(undefined, emailForm()))?.error).toMatch(/couldn't reach/);
  });
});

describe("saving a new password", () => {
  it.each([
    ["short", "short", "password"],
    ["a".repeat(73), "a".repeat(73), "password"],
    ["New-Strong-Pass123!", "Different-Pass123!", "confirmPassword"],
  ])("validates length and matching confirmation", async (password, confirmation, field) => {
    const state = await updatePassword(undefined, passwordForm(password, confirmation));
    expect(state?.fieldErrors?.[field]).toBeTruthy();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(state?.values).toBeUndefined();
  });
  it("does not update a password without a verified session", async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await updatePassword(undefined, passwordForm()))?.error).toMatch(/expired/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
  it("confirms successful changes without returning the password", async () => {
    const state = await updatePassword(undefined, passwordForm());
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "New-Strong-Pass123!" });
    expect(state?.success).toMatch(/updated/);
    expect(JSON.stringify(state)).not.toContain("New-Strong-Pass123!");
  });
  it.each(["same_password", "weak_password"])("explains a rejected password (%s)", async (code) => {
    auth.updateUser.mockResolvedValue({ error: { code } });
    const state = await updatePassword(undefined, passwordForm());
    expect(state?.fieldErrors?.password).toBeTruthy();
    expect(state?.success).toBeUndefined();
  });
});

describe("email confirmation routing", () => {
  it("opens the new-password page for recovery tokens without a next parameter", async () => {
    const response = await confirm("token_hash=example&type=recovery");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "example" });
    expect(response.headers.get("location")).toBe("https://peernote.example/reset-password");
  });
  it("supports PKCE recovery links", async () => {
    const response = await confirm("code=example&next=%2Freset-password");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("example");
    expect(response.headers.get("location")).toBe("https://peernote.example/reset-password");
  });
  it("offers a new link when a recovery token has expired", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    const response = await confirm("token_hash=expired&type=recovery");
    expect(response.headers.get("location")).toBe("https://peernote.example/forgot-password?error=link");
  });
  it("offers a new link when PKCE verification fails or the service is offline", async () => {
    auth.exchangeCodeForSession.mockRejectedValue(new Error("offline"));
    const response = await confirm("code=example&next=%2Freset-password");
    expect(response.headers.get("location")).toBe("https://peernote.example/forgot-password?error=link");
  });
  it("keeps the signup welcome destination", async () => {
    const response = await confirm("token_hash=example&type=signup&next=%2Fprofile%3Fwelcome%3D1");
    expect(response.headers.get("location")).toBe("https://peernote.example/profile?welcome=1");
  });
  it.each(["https://other.example", "//other.example", "/\\other.example"])("rejects external destinations (%s)", async (next) => {
    const response = await confirm(`code=example&next=${encodeURIComponent(next)}`);
    expect(response.headers.get("location")).toBe("https://peernote.example/dashboard");
  });
});
