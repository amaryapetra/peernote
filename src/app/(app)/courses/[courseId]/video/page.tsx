import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoStudyRoom } from "@/components/video-study-room";
import { getCourse } from "@/lib/data";

export const metadata: Metadata = { title: "Video study room" };

export default async function VideoStudyRoomPage({ params }: PageProps<"/courses/[courseId]/video">) {
  const { courseId } = await params;
  const { course, enrolled, supabase } = await getCourse(courseId);
  if (!enrolled) notFound();

  const { data: room, error } = await supabase
    .from("course_video_rooms")
    .select("room_id")
    .eq("course_id", course.id)
    .single();
  if (error || !room) {
    return <p role="alert" className="text-sm text-muted">The video room is not ready. Apply the video room Supabase migration and refresh this page.</p>;
  }

  return <VideoStudyRoom courseCode={course.code} roomName={`PeerNoteStudy-${room.room_id.replaceAll("-", "")}`} />;
}
