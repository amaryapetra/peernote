"use client";

import { useActionState, useState } from "react";
import { askNotes, runCatchUp, runGapCheck } from "@/app/actions/ai";
import { SubmitButton } from "./form";
import { inputClass } from "./ui";

function ErrorText({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
      {error}
    </p>
  );
}

export function GapCheckForm({ noteId, hasResult }: { noteId: string; hasResult: boolean }) {
  const [state, action] = useActionState(runGapCheck, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="noteId" value={noteId} />
      <SubmitButton variant={hasResult ? "secondary" : "primary"} pendingText="Comparing notes… (about 20 seconds)">
        {hasResult ? "Run a fresh comparison" : "Compare with classmates' notes"}
      </SubmitButton>
      <ErrorText error={state?.error} />
    </form>
  );
}

export function CatchUpForm({ courseId, date, label }: { courseId: string; date: string; label?: string }) {
  const [state, action] = useActionState(runCatchUp, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="date" value={date} />
      <SubmitButton pendingText="Building your guide… (about 30 seconds)">{label ?? "Build my catch-up guide"}</SubmitButton>
      <ErrorText error={state?.error} />
    </form>
  );
}

const EXAMPLES = ["What did we cover last week?", "Explain the main formula from the latest lecture", "What's on the next exam?"];

export function AskForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(askNotes, undefined);
  const [question, setQuestion] = useState("");
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      <label htmlFor="question" className="sr-only">
        Your question
      </label>
      <textarea
        id="question"
        name="question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        maxLength={500}
        required
        className={inputClass}
        placeholder="Ask anything about this course, like “How do I find eigenvalues?”"
      />
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="Searching your class's notes…">Ask</SubmitButton>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setQuestion(example)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>
      <ErrorText error={state?.error} />
    </form>
  );
}
