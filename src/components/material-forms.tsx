"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { shareMaterialLink } from "@/app/actions/materials";
import { FormMessage, SubmitButton, echoed } from "./form";
import { inputClass, Field, buttonClass } from "./ui";
import { MAX_MATERIAL_BYTES, MAX_MATERIAL_LABEL } from "@/lib/material-files";

function SharingPermission({ kind = "material" }: { kind?: "material" | "notes" }) {
  return (
    <label className="flex items-start gap-2 text-sm text-muted">
      <input type="checkbox" name="permission" required className="mt-1 accent-brand" />
      <span>
        {kind === "notes"
          ? "These are my own notes, or I have permission to share them. They aren't an exam, quiz, answer key, or restricted assignment."
          : "I have permission to share this material with classmates. It is not an exam, quiz, answer key, or restricted assignment."}
      </span>
    </label>
  );
}

/** PUT the file straight to storage, reporting progress (fetch can't report upload progress). */
function putFile(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (anonKey) xhr.setRequestHeader("apikey", anonKey);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("upload failed")));
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
}

async function postJson(url: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Upload failed. Try again.");
  return result;
}

/**
 * Upload a class material (kind "material") or a file of your own notes (kind "notes").
 * The browser sends the file straight to storage; the server then checks it before sharing.
 */
export function UploadMaterialForm({ courseId, kind = "material", defaultDate = "" }: { courseId: string; kind?: "material" | "notes"; defaultDate?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const notes = kind === "notes";
  const ids = notes ? "notes-file" : "upload";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Choose a file to upload.");
    if (file.size > MAX_MATERIAL_BYTES) return setError(`Files must be ${MAX_MATERIAL_LABEL} or smaller.`);
    setSaving(true); setError(""); setMessage(""); setProgress(0);
    try {
      const start = await postJson("/api/materials/upload-url", { courseId, fileName: file.name, size: file.size });
      try {
        await putFile(String(start.uploadUrl), file, setProgress);
      } catch {
        throw new Error("The upload was interrupted. Check your connection and try again.");
      }
      setProgress(null);
      await postJson("/api/materials", {
        courseId, kind, uploadId: start.uploadId, fileName: file.name,
        title: data.get("title"), description: data.get("description") ?? "", lectureDate: data.get("lectureDate") ?? "",
        permission: data.get("permission") === "on",
      });
      if (notes) {
        router.push(`/courses/${courseId}?shared_file=1`);
        return;
      }
      ref.current?.reset();
      setMessage("File uploaded and shared with your course.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  return (
    <form ref={ref} onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-line bg-brand-soft p-3 text-sm">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={`${ids}-title`}>
          <input id={`${ids}-title`} name="title" className={inputClass} required minLength={2} maxLength={140} placeholder={notes ? "Lecture 5 notes (handwritten)" : "Lecture 5 — Neural networks"} />
        </Field>
        <Field label={notes ? "Lecture date" : "Lecture date (optional)"} htmlFor={`${ids}-date`}>
          <input id={`${ids}-date`} name="lectureDate" type="date" defaultValue={defaultDate} className={inputClass} required={notes} />
        </Field>
      </div>
      <Field label="Description (optional)" htmlFor={`${ids}-description`}>
        <input id={`${ids}-description`} name="description" maxLength={600} className={inputClass} placeholder={notes ? "What the lecture covered" : "Topics covered in class"} />
      </Field>
      <Field label="File" htmlFor={`${ids}-file`} hint={`PDF, photo, Word, PowerPoint, Excel, OpenDocument, or text (${MAX_MATERIAL_LABEL} maximum; 12 uploads per day). Archives and programs are blocked.`}>
        <input id={`${ids}-file`} name="file" type="file" accept=".pdf,.docx,.pptx,.xlsx,.odt,.ods,.odp,.txt,.md,.rtf,.csv,.tsv,.jpg,.jpeg,.png,.webp,.gif" required className={inputClass} />
      </Field>
      <SharingPermission kind={kind} />
      {progress !== null && (
        <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <button type="submit" disabled={saving} className={buttonClass()}>
        {saving ? (progress !== null ? `Uploading… ${progress}%` : "Checking file…") : notes ? "Share notes file" : "Upload file"}
      </button>
    </form>
  );
}

export function LinkMaterialForm({ courseId }: { courseId: string }) {
  const [state, action] = useActionState(shareMaterialLink, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="link-title">
          <input id="link-title" name="title" defaultValue={echoed(state, "title")} className={inputClass} required minLength={2} maxLength={140} placeholder="Lecture 5 slides on Canvas" />
        </Field>
        <Field label="Lecture date (optional)" htmlFor="link-date">
          <input id="link-date" name="lectureDate" type="date" defaultValue={echoed(state, "lectureDate")} className={inputClass} />
        </Field>
      </div>
      <Field label="Canvas or HTTPS link" htmlFor="link-url" hint="Students still need their own Canvas access; PeerNote does not copy or bypass Canvas.">
        <input id="link-url" name="link" type="url" defaultValue={echoed(state, "link")} className={inputClass} required placeholder="https://..." />
      </Field>
      <Field label="Description (optional)" htmlFor="link-description">
        <input id="link-description" name="description" maxLength={600} defaultValue={echoed(state, "description")} className={inputClass} />
      </Field>
      <SharingPermission />
      <SubmitButton pendingText="Saving…" variant="secondary">Save class material link</SubmitButton>
    </form>
  );
}
