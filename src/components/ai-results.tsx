import Link from "next/link";
import type { GapResult } from "@/lib/ai/gaps";
import type { CatchUpResult } from "@/lib/ai/catch-up";
import type { AskResult } from "@/lib/ai/ask";
import { Markdown } from "./markdown";
import { Badge } from "./ui";

export type SourceNote = { id: string; title: string; author: string; href: string };

function Sources({ ids, notes }: { ids: string[]; notes: Map<string, SourceNote> }) {
  const found = ids.map((id) => notes.get(id)).filter((n): n is SourceNote => Boolean(n));
  if (!found.length) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      From{" "}
      {found.map((n, i) => (
        <span key={n.id}>
          {i > 0 && ", "}
          <Link href={n.href} className="text-brand hover:underline">
            {n.author === "Course material" ? `Slides: ${n.title}` : `${n.author}'s notes`}
          </Link>
        </span>
      ))}
    </p>
  );
}

const IMPORTANCE = {
  key: { label: "Key idea", tone: "highlight" as const },
  helpful: { label: "Helpful", tone: "brand" as const },
  minor: { label: "Minor", tone: "neutral" as const },
};

export function GapResultView({ result, notes }: { result: GapResult; notes: Map<string, SourceNote> }) {
  return (
    <div className="space-y-6">
      <p className="text-ink">{result.summary}</p>
      {result.missing.length > 0 && (
        <div>
          <h3 className="mb-3 font-display text-lg font-semibold">What your classmates caught</h3>
          <ol className="space-y-3">
            {result.missing.map((item, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.concept}</span>
                  <Badge tone={IMPORTANCE[item.importance].tone}>{IMPORTANCE[item.importance].label}</Badge>
                </div>
                <Markdown className="mt-2 text-sm">{item.explanation}</Markdown>
                <Sources ids={item.source_note_ids} notes={notes} />
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {result.covered_well.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">You covered well</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {result.covered_well.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        {result.questions_to_ask.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold">Worth asking about</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {result.questions_to_ask.map((x, i) => (
                <li key={i}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function CatchUpView({ result, notes }: { result: CatchUpResult; notes: Map<string, SourceNote> }) {
  return (
    <article className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-semibold">{result.headline}</h2>
        <p className="mt-2 text-ink">{result.overview}</p>
      </header>
      {result.announcements.length > 0 && (
        <div className="rounded-xl border border-line bg-warning-soft p-4">
          <h3 className="text-sm font-semibold">Announcements from class</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {result.announcements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {result.sections.map((section, i) => (
        <section key={i} className="rounded-xl border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-semibold">{section.heading}</h3>
          <Markdown className="mt-2">{section.body}</Markdown>
          <Sources ids={section.source_note_ids} notes={notes} />
        </section>
      ))}
      {result.key_terms.length > 0 && (
        <section>
          <h3 className="mb-3 font-display text-lg font-semibold">Key terms</h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {result.key_terms.map((t, i) => (
              <div key={i} className="rounded-lg border border-line bg-surface p-3">
                <dt className="font-medium">{t.term}</dt>
                <dd className="mt-1 text-sm text-muted">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {result.check_yourself.length > 0 && (
        <section className="rounded-xl border border-line bg-brand-soft/60 p-5">
          <h3 className="font-display text-lg font-semibold">Check yourself</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
            {result.check_yourself.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}

const COVERAGE = {
  answered: { label: "Answered from notes", tone: "success" as const },
  partial: { label: "Partly covered", tone: "highlight" as const },
  not_in_notes: { label: "Not in the notes", tone: "neutral" as const },
};

export function AskResultView({ result, notes }: { result: AskResult; notes: Map<string, SourceNote> }) {
  return (
    <div>
      <Badge tone={COVERAGE[result.coverage].tone}>{COVERAGE[result.coverage].label}</Badge>
      <Markdown className="mt-3">{result.answer}</Markdown>
      <Sources ids={result.source_note_ids} notes={notes} />
      {result.follow_up.length > 0 && (
        <p className="mt-3 text-xs text-muted">Next you might ask: {result.follow_up.join(" · ")}</p>
      )}
    </div>
  );
}
