import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { getCourse } from "@/lib/data";

export const metadata: Metadata = { title: "Video call" };

/**
 * One video room per course on Jitsi Meet. The room name is a random ID only
 * enrolled students can read, and it changes when the course creator removes
 * someone or resets the invite. The call opens in its own tab because
 * meet.jit.si ends calls embedded in other sites after a few minutes.
 */
export default async function VideoCallPage({ params }: PageProps<"/courses/[courseId]/video">) {
  const { courseId } = await params;
  const [{ course, enrolled, supabase }, { profile }] = await Promise.all([getCourse(courseId), getViewer()]);
  if (!enrolled) notFound();

  const { data: room } = await supabase.from("course_video_rooms").select("room_id").eq("course_id", course.id).maybeSingle();
  if (!room) {
    return <p role="alert" className="text-sm text-muted">The video room isn&apos;t ready yet. Try again in a moment.</p>;
  }
  const displayName = profile?.full_name ? `&userInfo.displayName=${encodeURIComponent(JSON.stringify(profile.full_name))}` : "";
  const callUrl = `https://meet.jit.si/PeerNote-${room.room_id.replaceAll("-", "")}#config.prejoinConfig.enabled=true${displayName}`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card className="text-center">
        <h2 className="font-display text-2xl font-semibold">{course.code} video call</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
          Study with classmates face to face. Everyone in {course.code} shares this room, so you can drop in anytime or
          plan a time in a study group. Video, audio, chat, and screen sharing all work in the call.
        </p>
        <a
          href={callUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand px-6 text-sm font-semibold text-on-brand hover:bg-brand-strong"
        >
          Join video call
        </a>
        <p className="mt-3 text-xs text-muted">Opens in a new tab. You can turn your camera and microphone on or off before you join.</p>
      </Card>
      <p className="text-sm text-muted">
        Calls run on Jitsi Meet, a free third-party service, so joining shares your name and video with Jitsi. The first
        person in a call may be asked to sign in to Jitsi to start it. Only students in this course can see the room
        link here, but anyone who has the link can join, so don&apos;t share it outside your class. If it gets shared, the
        course creator can reset the invite in Course moderation, which also gives the class a new video room.
      </p>
    </div>
  );
}
