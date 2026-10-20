import { describe, expect, it } from "vitest";
import { screenNoteHeuristically } from "@/lib/integrity";

const note = (content: string, title = "Lecture 5") => ({ title, topic: "", content });

describe("screenNoteHeuristically", () => {
  it("lets ordinary lecture notes through", () => {
    const v = screenNoteHeuristically(
      note("## Supply and demand\n- Equilibrium where Qd = Qs\n- Prof said the midterm covers chapters 1-4\n- Example: price ceiling causes shortage"),
    );
    expect(v.level).toBe("clear");
  });

  it("allows a professor's comment about what might be on the exam", () => {
    const v = screenNoteHeuristically(note("Exam questions might look like the HW 3 problems, so practice those."));
    expect(v.level).not.toBe("block");
  });

  it("blocks answer keys", () => {
    expect(screenNoteHeuristically(note("Answer key for chapter 4 problems: 1. B 2. C")).level).toBe("block");
  });

  it("blocks test banks", () => {
    expect(screenNoteHeuristically(note("Here's the test bank from last year")).level).toBe("block");
  });

  it("blocks pasted exam questions with point values", () => {
    const content = "1. (5 points) Define opportunity cost.\n2. (10 points) Draw a PPF and label it.\n3. (5 pts) What is GDP?";
    const v = screenNoteHeuristically(note(content));
    expect(v.level).toBe("block");
    expect(v.reasons.join(" ")).toMatch(/point values/);
  });

  it("blocks 'answers to the quiz'", () => {
    expect(screenNoteHeuristically(note("Answers to the quiz from Monday: x = 4, y = 2, z = 9")).level).toBe("block");
  });

  it("flags several multiple-choice questions as suspicious", () => {
    const mc = (n: number) => `Q${n}. Which is true?\na) one\nb) two\nc) three\nd) four\n`;
    const v = screenNoteHeuristically(note([1, 2, 3].map(mc).join("\n")));
    expect(v.level).toBe("suspicious");
  });

  it("flags references to a specific numbered quiz", () => {
    expect(screenNoteHeuristically(note("Things I got wrong on Quiz 3 and why", "Review")).level).toBe("suspicious");
  });
});
