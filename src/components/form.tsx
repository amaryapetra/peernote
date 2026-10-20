"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { buttonClass, cx } from "./ui";

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-disabled={pending}
      className={cx(buttonClass(variant, size), className)}
    >
      {pending && (
        <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export type FormState =
  | {
      error?: string;
      success?: string;
      fieldErrors?: Record<string, string>;
      /** What the student submitted, so fields keep their values after an error. */
      values?: Record<string, string | string[]>;
    }
  | undefined;

/** Text value echoed back from a failed submit, or the fallback. */
export function echoed(state: FormState, name: string, fallback = ""): string {
  const value = state?.values?.[name];
  return typeof value === "string" ? value : fallback;
}

/** Checkbox values echoed back from a failed submit, or the fallback. */
export function echoedList(state: FormState, name: string, fallback: string[]): string[] {
  const value = state?.values?.[name];
  return Array.isArray(value) ? value : fallback;
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.success) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cx(
        "rounded-lg border px-3 py-2 text-sm",
        state.error ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success",
      )}
    >
      {state.error ?? state.success}
    </p>
  );
}
