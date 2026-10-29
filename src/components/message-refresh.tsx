"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "./ui";

export function MessageRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") startTransition(() => router.refresh());
    };
    const timer = window.setInterval(check, 10000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router]);
  return (
    <button type="button" className={buttonClass("secondary", "sm")} disabled={pending}
      onClick={() => startTransition(() => router.refresh())}>
      {pending ? "Checking…" : "Refresh messages"}
    </button>
  );
}
