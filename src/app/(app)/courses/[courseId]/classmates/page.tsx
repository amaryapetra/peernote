import type { Metadata } from "next";
import Link from "next/link";
import { ClassmateCard } from "@/components/classmate-card";
import { Alert, ButtonLink, EmptyState } from "@/components/ui";
import { getCourse } from "@/lib/data";
import { getClassmates } from "@/lib/partners";

export const metadata: Metadata = { title: "Classmates" };

export default async function ClassmatesPage({ params }: PageProps<"/courses/[courseId]/classmates">) {
  const { courseId } = await params;
  const { course } = await getCourse(courseId);
  const { classmates, me } = await getClassmates(course.id);
  const profileIncomplete = !me?.availability.length || !me?.study_styles.length;

  return (
    <div className="space-y-6">
      <p className="text-muted">
        Classmates in {course.code}, best matches first. Matches use shared classes, overlapping free time, and study style.
      </p>
      {profileIncomplete && (
        <Alert tone="warning">
          Add your free times and study style to your{" "}
          <Link href="/profile" className="font-medium underline">
            profile
          </Link>{" "}
          for better matches.
        </Alert>
      )}
      {classmates.length === 0 ? (
        <EmptyState title="You're the only one here so far" action={<ButtonLink href={`/courses/${course.id}`} variant="secondary">Back to notes</ButtonLink>}>
          Share the join code <strong className="font-mono">{course.join_code}</strong> with classmates so they can join.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classmates.map((c) => (
            <ClassmateCard key={c.profile.id} classmate={c} courseId={course.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
