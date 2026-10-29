"use client";

import { useEffect } from "react";

/** Only clear the locally saved draft after the server confirms sharing. */
export function DraftCleanup({ courseId }: { courseId: string }) {
  useEffect(() => {
    try {
      localStorage.removeItem(`peernote:draft:${courseId}`);
    } catch {
      // Storage is optional; a successful upload should still be shown.
    }
  }, [courseId]);
  return null;
}
