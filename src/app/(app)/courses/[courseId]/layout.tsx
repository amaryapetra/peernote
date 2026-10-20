import { Suspense } from "react";
import { joinCourse, leaveCourse } from "@/app/actions/courses";
import { CopyButton } from "@/components/copy-button";
import { CourseTabs, TrackCourseVisit } from "@/components/course-tabs";
import { SubmitButton } from "@/components/form";
import { Card } from "@/components/ui";
import { getCourse } from "@/lib/data";

export default async function CourseLayout({ children, params }: LayoutProps<"/courses/[courseId]">) {
  const { courseId } = await params;
  const { course, enrolled } = await getCourse(courseId);

  return (
    <div>
      <div className="mb-8 border-b border-line">
        <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand">
              {course.code} · {course.term}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {[course.instructor, course.school].filter(Boolean).join(" · ")} · {course.members_count} student
              {course.members_count === 1 ? "" : "s"}
            </p>
          </div>
          {enrolled && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <span>Join code</span>
              <CopyButton value={course.join_code} label={`Copy join code ${course.join_code}`} />
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md px-2 py-1 hover:bg-surface-2" aria-label="More course options">
                  •••
                </summary>
                <div className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-line bg-surface p-2 shadow-lg">
                  <form action={leaveCourse}>
                    <input type="hidden" name="courseId" value={course.id} />
                    <SubmitButton variant="danger" size="sm" className="w-full" pendingText="Leaving…">
                      Leave course
                    </SubmitButton>
                  </form>
                </div>
              </details>
            </div>
          )}
        </div>
        {enrolled && (
          <Suspense>
            <CourseTabs courseId={course.id} />
          </Suspense>
        )}
      </div>

      {enrolled ? (
        <>
          <TrackCourseVisit courseId={course.id} />
          {children}
        </>
      ) : (
        <Card className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-xl font-semibold">Join {course.code} to see its notes</h2>
          <p className="mt-2 text-sm text-muted">
            Notes, classmates, and study groups are only visible to students in the course.
          </p>
          <form action={joinCourse} className="mt-5">
            <input type="hidden" name="courseId" value={course.id} />
            <SubmitButton pendingText="Joining…">Join this course</SubmitButton>
          </form>
        </Card>
      )}
    </div>
  );
}
