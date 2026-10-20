import type { Metadata } from "next";
import { deleteInsight } from "@/app/actions/ai";
import { AskForm } from "@/components/ai-forms";
import { AskResultView } from "@/components/ai-results";
import { Badge, Card, EmptyState } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai/client";
import type { AskResult } from "@/lib/ai/ask";
import { getCourse, getSourceNotes } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Ask the notes" };

export default async function AskPage({ params }: PageProps<"/courses/[courseId]/ask">) {
  const { courseId } = await params;
  const { course, user, supabase } = await getCourse(courseId);

  const { data: history } = await supabase
    .from("ai_insights")
    .select("id, question, content, created_at, source_note_ids")
    .eq("user_id", user.id)
    .eq("course_id", course.id)
    .eq("kind", "ask")
    .order("created_at", { ascending: false })
    .limit(20);
  const sources = await getSourceNotes((history ?? []).flatMap((h) => h.source_note_ids));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold">Ask your class&apos;s notes</h2>
          <Badge tone="brand">AI</Badge>
        </div>
        <p className="mb-4 mt-1 text-sm text-muted">
          Answers come only from notes shared in {course.code}, with links to the notes they&apos;re based on.
        </p>
        {isAiConfigured() ? <AskForm courseId={course.id} /> : <p className="text-sm text-muted">AI features aren&apos;t set up on this server yet.</p>}
      </Card>

      <section aria-labelledby="history-heading">
        <h2 id="history-heading" className="mb-4 font-display text-xl font-semibold">Your questions</h2>
        {!history?.length ? (
          <EmptyState title="No questions yet">Your questions and answers are saved here so you can review them later.</EmptyState>
        ) : (
          <ol className="space-y-5">
            {history.map((item) => (
              <li key={item.id} id={item.id} className="scroll-mt-24 rounded-xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium">{item.question}</p>
                  <form action={deleteInsight}>
                    <input type="hidden" name="insightId" value={item.id} />
                    <button type="submit" className="text-xs text-muted hover:text-danger" aria-label="Delete this question">
                      Delete
                    </button>
                  </form>
                </div>
                <p className="mb-3 text-xs text-muted">{formatDate(item.created_at)}</p>
                <AskResultView result={item.content as unknown as AskResult} notes={sources} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
