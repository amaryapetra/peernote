"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveNote } from "@/app/actions/notes";
import { SubmitButton } from "./form";
import { Markdown } from "./markdown";
import { Field, buttonClass, cx, inputClass } from "./ui";

type Initial = { title: string; lecture_date: string; topic: string; content: string };

export function NoteEditor({
  courseId,
  noteId,
  initial,
  aiEnabled,
  cancelHref,
}: {
  courseId: string;
  noteId?: string;
  initial: Initial;
  aiEnabled: boolean;
  cancelHref: string;
}) {
  const [state, action] = useActionState(saveNote, undefined);
  const draftKey = noteId ? null : `peernote:draft:${courseId}`;
  const [values, setValues] = useState<Initial>(initial);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const restored = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Restore an unsaved draft for new notes (this browser only).
  useEffect(() => {
    if (!draftKey || restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Initial>;
        if (draft.content) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
          setValues((v) => ({ ...v, ...draft }));
          setImportMessage({ tone: "info", text: "We restored your unsaved draft." });
        }
      }
    } catch {
      // Storage can be unavailable (private mode). Drafts are a convenience.
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    const id = setTimeout(() => {
      try {
        if (values.content.trim()) localStorage.setItem(draftKey, JSON.stringify(values));
      } catch {}
    }, 500);
    return () => clearTimeout(id);
  }, [draftKey, values]);

  const set = (key: keyof Initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleImport(file: File) {
    setImportMessage(null);
    if (/\.(md|markdown|txt)$/i.test(file.name) || file.type.startsWith("text/")) {
      const text = await file.text();
      setValues((v) => ({ ...v, content: v.content ? `${v.content}\n\n${text}` : text }));
      setImportMessage({ tone: "info", text: `Imported ${file.name}. Review it before sharing.` });
      return;
    }
    if (!aiEnabled) {
      setImportMessage({ tone: "error", text: "Photo and PDF import needs AI, which isn't set up on this server." });
      return;
    }
    setImporting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) throw new Error(json.error ?? "Couldn't read that file.");
      setValues((v) => ({ ...v, content: v.content ? `${v.content}\n\n${json.text}` : json.text! }));
      setImportMessage({ tone: "info", text: "Transcribed! Check it for mistakes before sharing." });
      setTab("write");
    } catch (error) {
      setImportMessage({ tone: "error", text: error instanceof Error ? error.message : "Couldn't read that file." });
    } finally {
      setImporting(false);
    }
  }

  const words = values.content.trim() ? values.content.trim().split(/\s+/).length : 0;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="courseId" value={courseId} />
      {noteId && <input type="hidden" name="noteId" value={noteId} />}

      {state?.integrity && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
          <p className="font-semibold text-danger">These notes weren&apos;t shared</p>
          <p className="mt-1 text-ink">{state.integrity.reason}</p>
          <p className="mt-2 text-muted">
            See what&apos;s allowed in our{" "}
            <Link href="/integrity" className="text-brand underline">
              academic integrity policy
            </Link>
            .
          </p>
        </div>
      )}
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="Title" htmlFor="title" error={state?.fieldErrors?.title}>
            <input id="title" name="title" value={values.title} onChange={set("title")} required maxLength={140} className={inputClass} placeholder="Lecture 12: Eigenvalues" />
          </Field>
        </div>
        <Field label="Lecture date" htmlFor="lecture_date" error={state?.fieldErrors?.lecture_date}>
          <input id="lecture_date" name="lecture_date" type="date" value={values.lecture_date} onChange={set("lecture_date")} required className={inputClass} />
        </Field>
      </div>
      <Field label="Topic" htmlFor="topic" hint="Optional. Helps classmates and the AI find your notes." error={state?.fieldErrors?.topic}>
        <input id="topic" name="topic" value={values.topic} onChange={set("topic")} maxLength={140} className={inputClass} placeholder="Diagonalization" />
      </Field>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="content" className="text-sm font-medium">
            Notes
          </label>
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-0.5 text-sm" role="tablist" aria-label="Editor mode">
            {(["write", "preview"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cx("rounded-md px-3 py-1 capitalize", tab === t ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-ink")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id="content"
          name="content"
          value={values.content}
          onChange={set("content")}
          required
          rows={18}
          maxLength={60000}
          className={cx(inputClass, "font-mono leading-relaxed", tab === "preview" && "hidden")}
          placeholder={"## Key ideas\n- ...\n\n## Example from class\n..."}
        />
        {tab === "preview" && (
          <div className="min-h-[24rem] rounded-lg border border-line bg-surface p-4">
            {values.content.trim() ? <Markdown>{values.content}</Markdown> : <p className="text-sm text-muted">Nothing to preview yet.</p>}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>Markdown works: # headings, - bullets, **bold**. {words} words.</span>
          {state?.fieldErrors?.content && <span className="text-danger">{state.fieldErrors.content}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-line bg-surface/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium">Import notes</p>
            <p className="text-muted">
              {aiEnabled ? "Upload a photo or PDF of your notes and we'll transcribe it, or a .txt / .md file." : "Upload a .txt or .md file."}
            </p>
          </div>
          <div>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              id="import-file"
              accept={aiEnabled ? ".txt,.md,.markdown,image/jpeg,image/png,image/webp,image/gif,application/pdf" : ".txt,.md,.markdown"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = "";
              }}
            />
            <button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className={buttonClass("secondary", "sm")}>
              {importing ? "Reading your notes…" : "Choose file"}
            </button>
          </div>
        </div>
        {importMessage && (
          <p role="status" className={cx("mt-3 text-sm", importMessage.tone === "error" ? "text-danger" : "text-muted")}>
            {importMessage.text}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <SubmitButton pendingText="Checking and sharing…">{noteId ? "Save changes" : "Share with class"}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
        <p className="text-xs text-muted">Every note gets a quick academic-integrity check before it&apos;s shared.</p>
      </div>
    </form>
  );
}
