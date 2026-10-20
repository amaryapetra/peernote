import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A stand-in for the Claude API: records each request and replies with a canned message.
type Captured = { url: string; headers: http.IncomingHttpHeaders; body: Record<string, unknown> };
const captured: Captured[] = [];
let reply: (body: Record<string, unknown>) => Record<string, unknown>;

const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    captured.push({ url: req.url ?? "", headers: req.headers, body });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(reply(body)));
  });
});

function message(text: string, stop_reason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());
beforeEach(() => (captured.length = 0));

describe("AI integrity screen", () => {
  it("sends a structured-output request with fallbacks and parses the verdict", async () => {
    reply = () => message(JSON.stringify({ category: "assessment_content", allowed: false, reason: "These look like quiz questions." }));
    const { screenNoteWithAi } = await import("@/lib/ai/integrity");
    const verdict = await screenNoteWithAi(
      { title: "Quiz 2", topic: "", content: "1. (5 pts) What is GDP?", courseTitle: "ECON 1010 Intro Macro" },
      { level: "block", reasons: ["has 2 questions with point values"] },
    );
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/quiz/);

    const req = captured[0];
    expect(req.url).toContain("/v1/messages");
    expect(req.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(req.body.model).toBe("claude-opus-5-5");
    expect(req.body.fallbacks).toBe("default");
    const config = req.body.output_config as { effort: string; format: { type: string; schema: { properties: object } } };
    expect(config.effort).toBe("low");
    expect(config.format.type).toBe("json_schema");
    expect(Object.keys(config.format.schema.properties)).toEqual(["category", "allowed", "reason"]);
    // The note travels inside <note> tags, and the keyword hint is included.
    const content = (req.body.messages as { content: string }[])[0].content;
    expect(content).toContain("<note");
    expect(content).toContain("point values");
  });

  it("never allows content the model itself categorized as assessment material", async () => {
    reply = () => message(JSON.stringify({ category: "graded_solutions", allowed: true, reason: "ok" }));
    const { screenNoteWithAi } = await import("@/lib/ai/integrity");
    const verdict = await screenNoteWithAi({ title: "HW", topic: "", content: "full solutions", courseTitle: "X" }, { level: "clear", reasons: [] });
    expect(verdict.allowed).toBe(false);
  });

  it("turns a refusal into a typed error with a friendly message", async () => {
    reply = () => message("", "refusal");
    const { screenNoteWithAi } = await import("@/lib/ai/integrity");
    const { AiRefusalError, friendlyAiError } = await import("@/lib/ai/client");
    const promise = screenNoteWithAi({ title: "a", topic: "", content: "b", courseTitle: "c" }, { level: "clear", reasons: [] });
    await expect(promise).rejects.toBeInstanceOf(AiRefusalError);
    expect(friendlyAiError(new AiRefusalError())).toMatch(/couldn't help/);
  });
});

describe("AI gap finder", () => {
  it("maps cited classmate labels back to real note IDs", async () => {
    reply = () =>
      message(
        JSON.stringify({
          summary: "You missed one key idea.",
          missing: [{ concept: "Corner solutions", explanation: "When MRS ≠ price ratio.", importance: "key", sources: ["P2", "P7"] }],
          covered_well: ["Budget lines"],
          questions_to_ask: [],
        }),
      );
    const { findGaps } = await import("@/lib/ai/gaps");
    const note = (id: string) => ({ id, title: "t", topic: "", lecture_date: "2026-10-13", content: `notes ${id}` });
    const result = await findGaps(note("mine"), [note("peer-a"), note("peer-b")]);
    expect(result.missing[0].source_note_ids).toEqual(["peer-b"]);
    const content = (captured[0].body.messages as { content: string }[])[0].content;
    expect(content).toContain('label="MINE"');
    expect(content).toContain('label="P2"');
  });
});
