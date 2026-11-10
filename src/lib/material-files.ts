// File-type helpers for class materials. Only PDFs and common images are shown
// in the browser; everything else is downloaded. Which files can be uploaded at
// all is decided in upload-security.ts.

/** Types that open in the browser. The upload route only stores these when the bytes really are that type. */
export const INLINE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function isInlineType(fileType: string | null): fileType is string {
  return fileType !== null && Object.hasOwn(INLINE_TYPES, fileType);
}

export function isInlineImage(fileType: string | null): boolean {
  return fileType === "jpg" || fileType === "png" || fileType === "gif" || fileType === "webp";
}

/** Lowercase extension of a file name, or "file" if it has none. */
export function fileExtension(name: string): string {
  return /\.([a-z0-9]{1,16})$/i.exec(name)?.[1].toLowerCase() ?? "file";
}

const KINDS: [RegExp, string][] = [
  [/^pdf$/, "PDF"],
  [/^(pptx?|key|odp)$/, "Slides"],
  [/^(docx?|odt|pages|rtf|txt|md|tex)$/, "Document"],
  [/^(xlsx?|xlsm|csv|tsv|ods|numbers)$/, "Spreadsheet"],
  [/^(jpe?g|png|gif|webp|heic|heif|bmp|tiff?|svg)$/, "Image"],
  [/^(mp4|mov|m4v|webm|avi|mkv)$/, "Video"],
  [/^(mp3|m4a|wav|aac|ogg|flac)$/, "Audio"],
  [/^(zip|rar|7z|tar|gz)$/, "Archive"],
  [/^(py|r|m|jl|js|ts|java|c|cpp|h|cs|go|rs|rb|sql|ipynb|do|sas|html?|css|json)$/, "Code"],
];

/** Short label for a material's badge, like "Slides" or "Spreadsheet". */
export function fileKindLabel(fileType: string | null): string {
  if (!fileType) return "Canvas / link";
  return KINDS.find(([pattern]) => pattern.test(fileType))?.[1] ?? (fileType === "file" ? "File" : fileType.toUpperCase());
}
