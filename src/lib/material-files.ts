// File-type helpers for class materials. Any file type can be shared; only PDFs
// and common images are shown in the browser, everything else is downloaded.

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

// Programs and installers could spread malware between classmates, so they're refused.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "msi", "msix", "bat", "cmd", "com", "scr", "pif", "cpl", "msc", "hta", "lnk", "reg", "vbs", "vbe",
  "wsf", "wsh", "ps1", "psm1", "jar", "apk", "dmg", "pkg", "app", "deb", "rpm", "dll", "sys", "appimage",
]);

/** True for programs: blocked by extension, or by the bytes of Windows, Linux, and Mac executables. */
export function isExecutable(name: string, data: Uint8Array): boolean {
  if (BLOCKED_EXTENSIONS.has(fileExtension(name))) return true;
  if (data.length > 0x40 && data[0] === 0x4d && data[1] === 0x5a) { // Windows "MZ" header pointing to "PE\0\0"
    const pe = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0x3c, true);
    if (pe + 4 <= data.length && data[pe] === 0x50 && data[pe + 1] === 0x45 && data[pe + 2] === 0 && data[pe + 3] === 0) return true;
  }
  if (data[0] === 0x7f && data[1] === 0x45 && data[2] === 0x4c && data[3] === 0x46) return true; // Linux ELF
  const magic = data.length >= 4 ? ((data[0] << 24) | (data[1] << 16) | (data[2] << 8) | data[3]) >>> 0 : 0;
  return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe].includes(magic); // Mac Mach-O
}
