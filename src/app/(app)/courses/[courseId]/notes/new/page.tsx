import type { Metadata } from "next";
import { NoteEditor } from "@/components/note-editor";
import { isAiConfigured } from "@/lib/ai/client";
import { getCourse } from "@/lib/data";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Share notes" };

export default async function NewNotePage({ params, searchParams }: PageProps<"/courses/[courseId]/notes/new">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const { course } = await getCourse(courseId);
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="font-display text-2xl font-semibold">Share notes for {course.code}</h2>
      <p className="mb-6 mt-1 text-sm text-muted">Everyone in the course will be able to read these.</p>
      <NoteEditor
        courseId={course.id}
        initial={{ title: "", lecture_date: date, topic: "", content: "" }}
        aiEnabled={isAiConfigured()}
        cancelHref={`/courses/${course.id}`}
      />
    </div>
  );
}
