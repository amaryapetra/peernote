"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Database } from "@/lib/database.types";
import { buttonClass } from "@/components/ui";

type Participant = { id: string; name: string };
type Signal = {
  from: string;
  to: string;
  type: "offer" | "answer" | "ice";
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const MAX_PARTICIPANTS = 6;
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function VideoTile({ stream, name, muted = false }: { stream: MediaStream; name: string; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element) element.srcObject = stream;
    return () => { if (element) element.srcObject = null; };
  }, [stream]);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
      <video ref={ref} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      <span className="absolute bottom-3 left-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white">{name}</span>
    </div>
  );
}

/**
 * WebRTC carries audio/video directly between participants.
 * Supabase Realtime delivers signaling and presence on a private, course-enrolled-only channel.
 * No external meeting URL is exposed.
 */
export function VideoStudyRoom({ roomId, courseCode, viewerName }: {
  roomId: string;
  courseCode: string;
  viewerName: string;
}) {
  const [status, setStatus] = useState<"idle" | "joining" | "connected">("idle");
  const [error, setError] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient<Database>> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const pendingIceRef = useRef(new Map<string, RTCIceCandidateInit[]>());
  const ownIdRef = useRef<string | null>(null);
  const attemptRef = useRef(0);

  const leave = useCallback(() => {
    attemptRef.current++;
    const channel = channelRef.current;
    channelRef.current = null;
    for (const pc of peersRef.current.values()) pc.close();
    peersRef.current.clear();
    pendingIceRef.current.clear();
    localRef.current?.getTracks().forEach(track => track.stop());
    localRef.current = null;
    ownIdRef.current = null;
    setLocalStream(null);
    setRemoteStreams({});
    setParticipants([]);
    setStatus("idle");
    setMicOn(true);
    setCameraOn(true);
    if (channel) void supabaseRef.current?.removeChannel(channel);
  }, []);

  useEffect(() => () => leave(), [leave]);

  const signal = useCallback((data: Signal) => {
    const channel = channelRef.current;
    if (channel) void channel.send({ type: "broadcast", event: "webrtc", payload: data })
      .catch(() => setError("Video signaling failed. Leave the room and rejoin."));
  }, []);

  const createPeer = useCallback((id: string) => {
    const existing = peersRef.current.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peersRef.current.set(id, pc);
    const stream = localRef.current;
    if (stream) for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = event => {
      if (event.candidate && ownIdRef.current)
        signal({ type: "ice", from: ownIdRef.current, to: id, candidate: event.candidate.toJSON() });
    };
    pc.ontrack = event => {
      if (event.streams[0]) setRemoteStreams(previous => ({ ...previous, [id]: event.streams[0] }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed")
        setError("A video connection failed. Some networks require a TURN relay; try reconnecting.");
    };
    return pc;
  }, [signal]);

  const offer = useCallback(async (id: string) => {
    const pc = createPeer(id);
    if (!ownIdRef.current || pc.signalingState !== "stable") return;
    try {
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.localDescription)
        signal({ type: "offer", from: ownIdRef.current, to: id, description: pc.localDescription.toJSON() });
    } catch {
      setError("Couldn't connect to a classmate. Leave and rejoin.");
    }
  }, [createPeer, signal]);

  const receive = useCallback(async (message: Signal) => {
    if (!ownIdRef.current || message.to !== ownIdRef.current || message.from === ownIdRef.current) return;
    if (!["offer", "answer", "ice"].includes(message.type)) return;
    try {
      const pc = createPeer(message.from);
      if (message.type === "ice") {
        if (!message.candidate) return;
        if (pc.remoteDescription) await pc.addIceCandidate(message.candidate);
        else pendingIceRef.current.set(message.from, [...(pendingIceRef.current.get(message.from) ?? []), message.candidate]);
        return;
      }
      if (!message.description) return;
      await pc.setRemoteDescription(message.description);
      const queued = pendingIceRef.current.get(message.from) ?? [];
      pendingIceRef.current.delete(message.from);
      for (const candidate of queued) await pc.addIceCandidate(candidate);
      if (message.type === "offer") {
        await pc.setLocalDescription(await pc.createAnswer());
        if (pc.localDescription && ownIdRef.current)
          signal({ type: "answer", from: ownIdRef.current, to: message.from, description: pc.localDescription.toJSON() });
      }
    } catch {
      setError("Couldn't establish a classmate's connection. Try rejoining.");
    }
  }, [createPeer, signal]);

  const join = useCallback(async () => {
    if (status !== "idle") return;
    const attempt = ++attemptRef.current;
    setStatus("joining");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Video calls require HTTPS and a supported browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (attempt !== attemptRef.current) { stream.getTracks().forEach(track => track.stop()); return; }
      localRef.current = stream;
      setLocalStream(stream);
      const supabase = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      supabaseRef.current = supabase;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again to join the room.");
      if (attempt !== attemptRef.current) return;
      await supabase.realtime.setAuth(session.access_token);
      const ownId = crypto.randomUUID();
      ownIdRef.current = ownId;
      const channel = supabase.channel("course-video:" + roomId, {
        config: { private: true, presence: { key: ownId } },
      });
      channelRef.current = channel;
      channel.on("broadcast", { event: "webrtc" }, ({ payload }) => { void receive(payload as Signal); });
      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        const others: Participant[] = Object.entries(state)
          .filter(([id]) => id !== ownId)
          .map(([id, values]) => ({
            id,
            name: typeof values[0]?.name === "string" ? values[0].name : "Classmate",
          }));
        setParticipants(others);
        const active = new Set(others.map(p => p.id));
        for (const [id, pc] of peersRef.current) {
          if (!active.has(id)) {
            pc.close();
            peersRef.current.delete(id);
            pendingIceRef.current.delete(id);
            setRemoteStreams(previous => {
              const next = { ...previous };
              delete next[id];
              return next;
            });
          }
        }
        // Deterministic initiator avoids offer glare.
        for (const other of others.slice(0, MAX_PARTICIPANTS - 1))
          if (ownId < other.id && !peersRef.current.has(other.id)) void offer(other.id);
      });
      channel.subscribe((next, issue) => {
        if (attempt !== attemptRef.current) return;
        if (next === "SUBSCRIBED") {
          setStatus("connected");
          void channel.track({ name: viewerName.slice(0, 80) })
            .catch(() => setError("Could not announce your presence. Please rejoin."));
        } else if (next === "CHANNEL_ERROR" || next === "TIMED_OUT" || next === "CLOSED") {
          leave();
          setError(issue?.message || "Room access failed. Make sure you are enrolled in the course.");
        }
      });
    } catch (reason) {
      if (attempt === attemptRef.current) {
        leave();
        setError(reason instanceof Error ? reason.message : "Camera or microphone permission was denied.");
      }
    }
  }, [status, roomId, viewerName, receive, offer, leave]);

  function toggleMic() {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }
  function toggleCamera() {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  return (
    <section className="space-y-5" aria-label="Live course video study room">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">{courseCode} · Enrolled classmates only</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">Live video study room</h2>
          <p className="mt-1 text-sm text-muted">Meet with classmates to go over notes, study, and work together.</p>
        </div>
        <span role="status" className="text-sm text-muted">
          {status === "connected" ? "Connected · " + (participants.length + 1) + " here" : status === "joining" ? "Connecting…" : "Not in a call"}
        </span>
      </header>
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {status === "idle" ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center">
          <p className="font-display text-xl font-semibold">Ready to study together?</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
            Join your course's private study room. PeerNote will ask permission to use your camera and microphone.
          </p>
          <button type="button" className={buttonClass("primary", "lg") + " mt-5"} onClick={() => void join()}>
            Join video room
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {localStream && <VideoTile stream={localStream} name="You" muted />}
            {participants.slice(0, MAX_PARTICIPANTS - 1).map(p => remoteStreams[p.id] ? (
              <VideoTile key={p.id} stream={remoteStreams[p.id]} name={p.name} />
            ) : (
              <div key={p.id} className="flex aspect-video items-center justify-center rounded-xl bg-surface-2 p-4 text-sm text-muted">
                Connecting to {p.name}…
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClass("secondary")} onClick={toggleMic} disabled={status !== "connected"}>
              {micOn ? "Mute microphone" : "Unmute microphone"}
            </button>
            <button type="button" className={buttonClass("secondary")} onClick={toggleCamera} disabled={status !== "connected"}>
              {cameraOn ? "Turn off camera" : "Turn on camera"}
            </button>
            <button type="button" className={buttonClass("danger")} onClick={leave}>Leave room</button>
          </div>
        </>
      )}
      <p className="text-xs text-muted">
        Best for small groups (up to six people). Video is peer-to-peer, not recorded, and cannot be accessed using a shared external meeting link.
        Calls may not connect on restrictive school or corporate networks without a TURN relay.
      </p>
    </section>
  );
}
