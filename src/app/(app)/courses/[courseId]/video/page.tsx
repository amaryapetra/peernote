import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoStudyRoom } from "@/components/video-study-room";
import { getCourse } from "@/lib/data";

export const metadata: Metadata = { title: "Live video study room" };

export default async function VideoStudyRoomPage({ params }: PageProps<"/courses/[courseId]/video">) {
  const { courseId } = await params;
  const { course, enrolled, user, supabase } = await getCourse(courseId);
  if (!enrolled) notFound();

  const [{ data: room, error }, { data: profile }] = await Promise.all([
    supabase.from("course_video_rooms").select("room_id").eq("course_id", course.id).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (error || !room) {
    return <p role="alert" className="text-sm text-muted">
      This course's study room is unavailable. Please contact the course creator.
    </p>;
  }

  return <VideoStudyRoom roomId={room.room_id} courseCode={course.code} viewerName={profile?.full_name || "Classmate"} />;
}
