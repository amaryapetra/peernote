"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { shareMaterialLink } from "@/app/actions/materials";
import { FormMessage, SubmitButton, echoed } from "./form";
import { inputClass, Field, buttonClass } from "./ui";

function SharingPermission() {
  return (
    <label className="flex items-start gap-2 text-sm text-muted">
      <input type="checkbox" name="permission" required className="mt-1 accent-brand" />
      <span>I have permission to share this material with classmates. It is not an exam, quiz, answer key, or restricted assignment.</span>
    </label>
  );
}

export function UploadMaterialForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Choose a PDF or PowerPoint.");
    if (file.size > 4 * 1024 * 1024) return setError("Files must be under 4 MB.");
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/materials", { method: "POST", body: data });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        setError(result.error || "Upload failed. Try again.");
      } else {
        ref.current?.reset();
        setMessage("Slides uploaded and shared with your course.");
        router.refresh();
      }
    } catch {
      setError("Connection failed. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form ref={ref} onSubmit={submit} className="space-y-4">
      <input type="hidden" name="courseId" value={courseId} />
      {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-line bg-brand-soft p-3 text-sm">{message}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="upload-title"><input id="upload-title" name="title" className={inputClass} required minLength={2} maxLength={140} placeholder="Lecture 5 — Neural networks" /></Field>
        <Field label="Lecture date" htmlFor="upload-date"><input id="upload-date" name="lectureDate" type="date" className={inputClass} required /></Field>
      </div>
      <Field label="Description (optional)" htmlFor="upload-description"><input id="upload-description" name="description" maxLength={600} className={inputClass} placeholder="Topics covered in class" /></Field>
      <Field label="Slides (PDF or .pptx)" htmlFor="upload-file" hint="Maximum 4 MB. PDFs preview inline; PowerPoints show a text preview and can be downloaded.">
        <input id="upload-file" name="file" type="file" required accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation" className={inputClass} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="aiAllowed" className="mt-1 accent-brand" />
        <span>Allow PeerNote AI to analyze the slide text for catch-up guides, gap checks, and questions. PDF text extraction uses Anthropic; PowerPoint text is extracted locally.</span>
      </label>
      <SharingPermission />
      <button type="submit" disabled={saving} className={buttonClass()}>
        {saving ? "Uploading…" : "Upload class slides"}
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
        <Field label="Lecture date" htmlFor="link-date">
          <input id="link-date" name="lectureDate" type="date" defaultValue={echoed(state, "lectureDate")} className={inputClass} required />
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
