import type { Metadata } from "next";
import { NoteEditor } from "@/components/note-editor";
import { UploadMaterialForm } from "@/components/material-forms";
import { Card } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { todayISO } from "@/lib/format";

export const metadata: Metadata = { title: "Share notes" };

export default async function NewNotePage({ params, searchParams }: PageProps<"/courses/[courseId]/notes/new">) {
  const { courseId } = await params;
  const sp = await searchParams;
  const { course } = await getCourse(courseId);
  const date = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h2 className="font-display text-2xl font-semibold">Share notes for {course.code}</h2>
        <p className="mb-6 mt-1 text-sm text-muted">
          Everyone in the course will be able to read these. Type them here, or{" "}
          <a href="#upload-notes-file" className="font-medium text-brand hover:underline">upload a PDF or photo of your notes</a>.
        </p>
        <NoteEditor
          courseId={course.id}
          initial={{ title: "", lecture_date: date, topic: "", content: "" }}
          cancelHref={`/courses/${course.id}`}
        />
      </div>
      <Card id="upload-notes-file" className="scroll-mt-24">
        <h3 className="font-display text-xl font-semibold">Upload a file of your notes</h3>
        <p className="mb-5 mt-1 text-sm text-muted">
          Handwritten notes, a PDF, or a document. Classmates can open or download it from the Notes tab under its lecture date.
        </p>
        <UploadMaterialForm courseId={course.id} kind="notes" defaultDate={date} />
      </Card>
    </div>
  );
}
