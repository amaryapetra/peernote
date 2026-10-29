"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

export function VideoStudyRoom({ courseCode, roomName }: { courseCode: string; roomName: string }) {
  const [joined, setJoined] = useState(false);
  const meetingUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#config.prejoinPageEnabled=true`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">Video study room</h2>
        <p className="mt-2 text-sm text-muted">
          Meet classmates from {courseCode} to review notes, ask questions, or study together in real time.
          Everyone in this course sees the same room.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Class study call</h3>
            <p className="mt-1 text-sm text-muted">Video, microphone, chat, and screen sharing are available in the call.</p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">Course room</span>
        </div>
        {!joined ? (
          <div className="rounded-xl border border-dashed border-line bg-surface-2 px-5 py-12 text-center">
            <p className="font-medium">Ready to study with your classmates?</p>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              The call uses Jitsi Meet, a third-party video service. Joining shares your audio, video,
              and meeting data with Jitsi according to its privacy terms. You can choose whether to enable
              your camera and microphone before entering.
            </p>
            <button
              type="button"
              onClick={() => setJoined(true)}
              className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-strong"
            >
              Join video study room
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <iframe
              title={`Live video study room for ${courseCode}`}
              src={meetingUrl}
              allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[65vh] min-h-[440px] w-full rounded-xl border border-line bg-surface-2"
              allowFullScreen
            />
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setJoined(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2"
              >
                Leave and close call
              </button>
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand hover:underline">
                Open call in a new tab
              </a>
            </div>
            <p className="text-xs text-muted">
              Use the in-call hang up button to disconnect before closing this panel.
            </p>
          </div>
        )}
      </Card>

      <p className="text-sm text-muted">
        Only enrolled students can see this room inside PeerNote, but anyone who obtains the external meeting
        link may be able to enter. Do not share the link outside your class or discuss sensitive information.
        The room is not recorded by PeerNote.
      </p>
    </div>
  );
}
