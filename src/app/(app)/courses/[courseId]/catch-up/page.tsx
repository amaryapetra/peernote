import type { Metadata } from "next";
import Link from "next/link";
import { CatchUpForm } from "@/components/ai-forms";
import { CatchUpView } from "@/components/ai-results";
import { Badge, Card, EmptyState, ButtonLink, cx } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai/client";
import type { CatchUpResult } from "@/lib/ai/catch-up";
import { getCourse, getSourceNotes } from "@/lib/data";
import { formatDate, formatLectureDate } from "@/lib/format";

export const metadata: Metadata = { title: "Catch up on a class" };

export default async function CatchUpPage({ params, searchParams }: PageProps<"/courses/[courseId]/catch-up">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const { course, user, supabase } = await getCourse(courseId);

  const { data: rows } = await supabase
    .from("notes")
    .select("lecture_date, author_id")
    .eq("course_id", course.id)
    .order("lecture_date", { ascending: false })
    .limit(1000);

  // AI-approved materials can supply a guide even for dates with no peer notes.
  const { data: materials } = await supabase.from("course_materials")
    .select("lecture_date").eq("course_id", course.id)
    .eq("ai_allowed", true).neq("extracted_text", "").limit(1000);

  const dates = new Map<string, { count: number; mine: boolean }>();
  for (const row of rows ?? []) {
    const d = dates.get(row.lecture_date) ?? { count: 0, mine: false };
    d.count += 1;
    if (row.author_id === user.id) d.mine = true;
    dates.set(row.lecture_date, d);
  }
  for (const material of materials ?? []) {
    const d = dates.get(material.lecture_date) ?? { count: 0, mine: false };
    d.count += 1;
    dates.set(material.lecture_date, d);
  }
  const dateList = [...dates.entries()].sort(([a], [b]) => b.localeCompare(a));

  if (dateList.length === 0) {
    return (
      <EmptyState title="No materials to catch up from yet" action={<ButtonLink href={`/courses/${course.id}/notes/new`}>Share notes</ButtonLink>}>
        Once classmates share notes or AI-approved lecture slides, you can build a catch-up guide here.
      </EmptyState>
    );
  }

  const requested = typeof sp.date === "string" && dates.has(sp.date) ? sp.date : null;
  const selected = requested ?? dateList.find(([, d]) => !d.mine)?.[0] ?? dateList[0][0];
  const info = dates.get(selected)!;

  const { data: guides } = await supabase
    .from("ai_insights")
    .select("id, content, created_at, source_note_ids")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("kind", "catch_up")
    .eq("lecture_date", selected)
    .order("created_at", { ascending: false })
    .limit(5);
  const guide = (typeof sp.guide === "string" && guides?.find((g) => g.id === sp.guide)) || guides?.[0];
  const sources = guide ? await getSourceNotes(guide.source_note_ids) : new Map();

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside aria-label="Class dates">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Pick a class</h2>
        <ul className="space-y-1">
          {dateList.map(([date, d]) => (
            <li key={date}>
              <Link
                href={`/courses/${course.id}/catch-up?date=${date}`}
                aria-current={date === selected ? "page" : undefined}
                className={cx(
                  "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                  date === selected ? "bg-brand-soft font-medium text-brand-strong" : "hover:bg-surface-2",
                )}
              >
                <span>{formatDate(date)}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  {!d.mine && <span className="size-1.5 rounded-full bg-highlight-ink/60" title="You have no notes for this day" />}
                  {d.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted">A dot means you don&apos;t have notes for that day.</p>
      </aside>

      <div className="min-w-0 space-y-6">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{formatLectureDate(selected)}</h2>
            <Badge tone="brand">AI</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {info.count} shared note{info.count === 1 ? "" : "s"} or approved slide source{info.count === 1 ? "" : "s"} from this class
            {info.mine ? ", including yours." : ". You don't have notes for this day."}
            The guide uses up to eight notes and four approved slide files.
          </p>
          <div className="mt-4">
            {isAiConfigured() ? (
              <CatchUpForm courseId={course.id} date={selected} label={guide ? "Rebuild with the latest notes" : undefined} />
            ) : (
              <p className="text-sm text-muted">AI features aren&apos;t set up on this server yet.</p>
            )}
          </div>
        </Card>

        {guide ? (
          <div>
            <p className="mb-4 text-xs text-muted">Guide built {formatDate(guide.created_at)} from {guide.source_note_ids.length} shared sources. Saved to your account.</p>
            <CatchUpView result={guide.content as unknown as CatchUpResult} notes={sources} />
          </div>
        ) : (
          <EmptyState title="No guide for this class yet">
            Build one and it&apos;ll be saved here, so you can come back to it anytime.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
