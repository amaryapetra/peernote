import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VideoStudyRoom } from "@/components/video-study-room";
import { getCourse } from "@/lib/data";

export const metadata: Metadata = { title: "Video study room" };

export default async function VideoStudyRoomPage({ params }: PageProps<"/courses/[courseId]/video">) {
  const { courseId } = await params;
  const { course, enrolled } = await getCourse(courseId);

  // The meeting URL must never be rendered for students outside this course.
  if (!enrolled) notFound();

  // A long, course-specific room name makes accidental collisions unlikely.
  // Jitsi rooms are link-accessible, not protected by PeerNote login.
  const roomName = `PeerNote-${course.id.replaceAll("-", "")}-${course.join_code}`;

  return <VideoStudyRoom courseCode={course.code} roomName={roomName} />;
}
