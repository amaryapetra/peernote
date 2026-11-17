"use client";

import { useState } from "react";
import { inputClass } from "./ui";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  maxLength?: number;
};

/** Show/hide is a local display preference. The password is never stored in React state. */
export function PasswordInput({ id, name, label, autoComplete, minLength, maxLength }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        required
        className={`${inputClass} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        aria-controls={id}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-sm font-medium text-brand hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}
