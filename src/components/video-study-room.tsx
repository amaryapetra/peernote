"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function VideoStudyRoom({ courseCode, roomName }: { courseCode: string; roomName: string }) {
  const [joined, setJoined] = useState(false);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [captions, setCaptions] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const capture = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const parts = useRef<Blob[]>([]);
  const recordingRef = useRef(false);
  const meetingUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#config.prejoinPageEnabled=true`;

  function stopRecording() {
    recordingRef.current = false;
    if (recorder.current?.state === "recording") recorder.current.stop();
    capture.current?.getTracks().forEach((track) => track.stop());
    capture.current = null;
    recorder.current = null;
    setRecording(false);
  }

  function stopTranscription() {
    recognition.current?.stop();
    recognition.current = null;
    setCaptions(false);
  }

  useEffect(() => {
    return () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      capture.current?.getTracks().forEach((track) => track.stop());
      recognition.current?.stop();
    };
  }, []);

  async function startRecording() {
    if (!consent) {
      setMessage("Confirm that every participant has agreed before recording.");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setMessage("Tab recording is not available in this browser. Try a current desktop Chrome or Edge browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        // Browser support varies; the user must select the meeting tab and enable tab audio.
      });
      if (!stream.getAudioTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        setMessage("No tab audio was shared. Select the PeerNote tab and enable 'Share tab audio' to capture the call.");
        return;
      }
      const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mimeType) {
        stream.getTracks().forEach((track) => track.stop());
        setMessage("This browser does not support WebM recording.");
        return;
      }
      parts.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) parts.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        if (parts.current.length) {
          const url = URL.createObjectURL(new Blob(parts.current, { type: mimeType }));
          const link = document.createElement("a");
          link.href = url;
          link.download = `PeerNote-${courseCode.replace(/[^a-zA-Z0-9_-]/g, "-")}-${Date.now()}.webm`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          setMessage("Recording downloaded to your device. PeerNote did not upload it.");
        }
        parts.current = [];
      };
      stream.getVideoTracks()[0]?.addEventListener("ended", stopRecording, { once: true });
      mediaRecorder.start(1000);
      recorder.current = mediaRecorder;
      capture.current = stream;
      recordingRef.current = true;
      setRecording(true);
      setMessage("Recording your selected tab with its shared audio. Notify anyone who joins later.");
    } catch {
      setMessage("Recording did not start. Check your screen-sharing permissions and try again.");
    }
  }

  function startTranscription() {
    if (!consent) {
      setMessage("Confirm that every participant has agreed before transcribing.");
      return;
    }
    const browser = window as SpeechWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) {
      setMessage("Live speech transcription is unavailable in this browser. Recording still works on supported desktop browsers.");
      return;
    }
    try {
      const session = new Constructor();
      session.continuous = true;
      session.interimResults = false;
      session.onresult = (event) => {
        let next = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) next += event.results[i][0].transcript.trim() + "\n";
        }
        if (next) setTranscript((previous) => previous + next);
      };
      session.onerror = () => {
        setMessage("Speech recognition stopped or lost microphone access. You can restart transcription.");
        recognition.current = null;
        setCaptions(false);
      };
      session.onend = () => {
        recognition.current = null;
        setCaptions(false);
      };
      session.start();
      recognition.current = session;
      setCaptions(true);
      setMessage("Transcribing your microphone through your browser. Other callers' speech may not be captured.");
    } catch {
      setMessage("Could not start speech recognition. Check microphone access.");
    }
  }

  function downloadTranscript() {
    const url = URL.createObjectURL(new Blob([transcript], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `PeerNote-${courseCode.replace(/[^a-zA-Z0-9_-]/g, "-")}-transcript.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function leave() {
    stopRecording();
    stopTranscription();
    setJoined(false);
  }

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
              Calls use Jitsi Meet, a third-party service. Joining shares meeting data with Jitsi.
              Choose whether to enable your camera and microphone before entering.
            </p>
            <button type="button" onClick={() => setJoined(true)}
              className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand hover:bg-brand-strong">
              Join video study room
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <iframe
              title={`Live video study room for ${courseCode}`}
              src={meetingUrl}
              allow="camera; microphone; display-capture; fullscreen; autoplay; clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-[65vh] min-h-[440px] w-full rounded-xl border border-line bg-surface-2"
              allowFullScreen
            />
            <section className="space-y-3 rounded-xl border border-line p-4" aria-label="Recording and transcription">
              <div>
                <h3 className="font-semibold">Record or transcribe this study session</h3>
                <p className="mt-1 text-sm text-muted">
                  Optional, off by default. Ask everyone in the call for permission first, including anyone who joins later.
                  PeerNote cannot automatically notify or enforce consent for other participants.
                </p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={consent} disabled={recording || captions}
                  onChange={(event) => setConsent(event.target.checked)} className="mt-1" />
                I have informed every participant and received their agreement to record or transcribe.
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!consent && !recording}
                  onClick={recording ? stopRecording : startRecording}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {recording ? "Stop and download recording" : "Start tab recording"}
                </button>
                <button type="button" disabled={!consent && !captions}
                  onClick={captions ? stopTranscription : startTranscription}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {captions ? "Stop live transcription" : "Start live transcription"}
                </button>
              </div>
              {recording && <p role="status" className="text-sm font-semibold text-red-600">● Recording in progress — selected tab and shared tab audio</p>}
              <p className="text-xs text-muted">
                For recording, select this browser tab and enable “Share tab audio.” The WebM file downloads to your device;
                recordings are not saved to Supabase. The browser may omit your own microphone or other participants’ audio.
                Live transcription uses your microphone only (not the full Jitsi call), may use your browser provider’s speech service,
                and is not a verified record of the meeting.
              </p>
              {message && <p role="status" className="text-sm text-muted">{message}</p>}
              {(captions || transcript) && (
                <div className="space-y-2">
                  <label htmlFor="call-transcript" className="text-sm font-medium">Live transcript (microphone only)</label>
                  <textarea id="call-transcript" value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    className="min-h-36 w-full rounded-lg border border-line bg-surface p-3 text-sm"
                    placeholder="Speech recognized through your microphone will appear here. You can edit mistakes." />
                  <button type="button" onClick={downloadTranscript} disabled={!transcript.trim()}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-medium disabled:opacity-50">
                    Download transcript (.txt)
                  </button>
                </div>
              )}
            </section>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={leave}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium hover:bg-surface-2">
                Leave and close call
              </button>
              <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-brand hover:underline">Open call in a new tab</a>
            </div>
            <p className="text-xs text-muted">Hang up inside Jitsi before closing the panel. Stopping the recorder downloads its file.</p>
          </div>
        )}
      </Card>
      <p className="text-sm text-muted">
        Only enrolled students can see the room in PeerNote, but anyone with its external link may be able to enter.
        Do not share the link outside your class or discuss sensitive information.
      </p>
    </div>
  );
}
