import "server-only";
import { extractPptxText } from "@/lib/material-text";
import { isZip, listZipEntries, readZipText, xmlText, type ZipEntry } from "@/lib/zip";
import type { TranscribeType } from "@/lib/ai/transcribe";

// Turns an uploaded file of any format into Markdown for the note editor.
// Text-based formats (Word, PowerPoint, Excel, OpenDocument, RTF, HTML, plain
// text and code) are read here with no AI. Photos and PDFs go to AI transcription.
// The file type is detected from the file's bytes, not its name, since
// browsers often send a blank or wrong type.

export type NoteImport =
  | { kind: "text"; text: string }
  | { kind: "ai"; mediaType: TranscribeType }
  | { kind: "unsupported"; message: string };

// Matches the note length limit in saveNote.
export const MAX_IMPORT_CHARS = 60000;
const MAX_XML = 8 * 1024 * 1024;
const MAX_SHEETS = 20;
const MAX_ROWS = 2000;
const MAX_COLS = 50;

const CODE_LANGS: Record<string, string> = {
  py: "python", r: "r", m: "matlab", jl: "julia", js: "javascript", jsx: "jsx", ts: "typescript", tsx: "tsx",
  java: "java", c: "c", h: "c", cpp: "cpp", cc: "cpp", hpp: "cpp", cs: "csharp", go: "go", rs: "rust",
  rb: "ruby", php: "php", swift: "swift", kt: "kotlin", scala: "scala", sql: "sql", sh: "bash", ps1: "powershell",
  json: "json", yaml: "yaml", yml: "yaml", xml: "xml", css: "css", ipynb: "json", do: "stata", sas: "sas",
  csv: "csv", tsv: "tsv",
};

function extension(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

function cap(text: string): string {
  const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return clean.slice(0, MAX_IMPORT_CHARS);
}

export function prepareNoteImport(data: Buffer, fileName: string): NoteImport {
  const ext = extension(fileName);
  if (data.length === 0) return { kind: "unsupported", message: "That file is empty." };
  const magic = data.length >= 4 ? data.readUInt32BE(0) : 0;

  // Photos and PDFs Claude can read directly.
  if (data.toString("latin1", 0, 5) === "%PDF-") return { kind: "ai", mediaType: "application/pdf" };
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { kind: "ai", mediaType: "image/jpeg" };
  if (magic === 0x89504e47) return { kind: "ai", mediaType: "image/png" };
  if (data.toString("latin1", 0, 4) === "GIF8") return { kind: "ai", mediaType: "image/gif" };
  if (data.toString("latin1", 0, 4) === "RIFF" && data.toString("latin1", 8, 12) === "WEBP") {
    return { kind: "ai", mediaType: "image/webp" };
  }
  if (isOtherImage(data)) {
    return { kind: "unsupported", message: "We couldn't read that photo format. Save it as a JPG or PNG and try again." };
  }

  if (isZip(data)) return fromZip(data, ext);
  if (magic === 0xd0cf11e0) {
    return {
      kind: "unsupported",
      message: "Older Office files (.doc, .ppt, .xls) can't be read. Save it as .docx, .pptx, .xlsx, or PDF and upload that.",
    };
  }

  const text = decodeText(data);
  if (text === null) {
    return { kind: "unsupported", message: "We can't read that kind of file. Try exporting it as a PDF, Word document, or photo." };
  }
  if (text.trimStart().startsWith("{\\rtf")) return { kind: "text", text: cap(rtfToText(text)) };
  if (ext === "html" || ext === "htm" || /^\s*(<!doctype html|<html)/i.test(text)) {
    return { kind: "text", text: cap(htmlToMarkdown(text)) };
  }
  const lang = CODE_LANGS[ext];
  if (lang) {
    // Use a fence longer than any run of backticks in the file so the code can't break out of it.
    let longest = 0;
    for (const m of text.matchAll(/`+/g)) longest = Math.max(longest, m[0].length);
    const fence = "`".repeat(Math.max(3, longest + 1));
    return { kind: "text", text: cap(`${fence}${lang}\n${text.slice(0, MAX_IMPORT_CHARS - 2 * fence.length - 20).trimEnd()}\n${fence}`) };
  }
  return { kind: "text", text: cap(text) };
}

function isOtherImage(data: Buffer): boolean {
  const head = data.toString("latin1", 0, 4);
  if (head.startsWith("BM") && data.length > 26 && data.readUInt32LE(2) === data.length) return true; // BMP
  if (head === "II*\0" || head === "MM\0*") return true; // TIFF
  // HEIC / HEIF / AVIF (iPhone photos)
  return data.length > 12 && data.toString("latin1", 4, 8) === "ftyp" &&
    /^(heic|heix|hevc|heim|heis|mif1|msf1|avif|avis)$/.test(data.toString("latin1", 8, 12));
}

/** Decode plain text, or return null if the bytes look binary. */
function decodeText(data: Buffer): string | null {
  if (data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) return data.toString("utf8", 3);
  if (data[0] === 0xff && data[1] === 0xfe) return new TextDecoder("utf-16le").decode(data.subarray(2));
  if (data[0] === 0xfe && data[1] === 0xff) return new TextDecoder("utf-16be").decode(data.subarray(2));
  const sample = data.subarray(0, 64 * 1024);
  let control = 0;
  for (const byte of sample) {
    if (byte === 0) return null;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) control++;
  }
  if (control > sample.length * 0.01) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return new TextDecoder("windows-1252").decode(data);
  }
}

function fromZip(data: Buffer, ext: string): NoteImport {
  let entries: ZipEntry[];
  try {
    entries = listZipEntries(data);
  } catch {
    return { kind: "unsupported", message: "That file looks damaged. Try saving it again and re-uploading." };
  }
  const find = (name: string) => entries.find((e) => e.name === name);
  try {
    const docx = find("word/document.xml");
    if (docx) return { kind: "text", text: cap(docxToMarkdown(readZipText(data, docx, MAX_XML))) };
    if (entries.some((e) => e.name.startsWith("ppt/slides/"))) {
      return { kind: "text", text: cap(pptxToMarkdown(data)) };
    }
    if (find("xl/workbook.xml")) return { kind: "text", text: cap(xlsxToMarkdown(data, entries)) };
    const content = find("content.xml");
    if (content && find("mimetype")) return { kind: "text", text: cap(odfToMarkdown(readZipText(data, content, MAX_XML))) };
  } catch {
    return { kind: "unsupported", message: "We couldn't read the text in that file. Try saving it as a PDF and uploading that." };
  }
  if (["pages", "key", "numbers"].includes(ext)) {
    return { kind: "unsupported", message: "Apple Pages, Keynote, and Numbers files can't be read. Export it as a PDF or Word file first." };
  }
  return { kind: "unsupported", message: "Zip files can't be imported. Unzip it and upload the notes file inside." };
}

const tagText = (xml: string) => xmlText(xml.replace(/<[^>]+>/g, ""));

/** Rows of cell text to a Markdown table (the first row is the header). */
function markdownTable(rows: string[][]): string {
  const clean = rows
    .slice(0, MAX_ROWS)
    .map((r) => Array.from(r.slice(0, MAX_COLS), (c) => (c ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim()))
    .map((r) => { while (r.length && !r[r.length - 1]) r.pop(); return r; })
    .filter((r) => r.some((c) => c));
  if (clean.length === 0) return "";
  const width = Math.max(...clean.map((r) => r.length));
  const line = (r: string[]) => `| ${Array.from({ length: width }, (_, k) => r[k] ?? "").join(" | ")} |`;
  return [line(clean[0]), `|${" --- |".repeat(width)}`, ...clean.slice(1).map(line)].join("\n");
}

/** Joins Markdown blocks: list items stay together, everything else gets a blank line. */
function joinBlocks(blocks: string[]): string {
  return blocks
    .filter((b) => b)
    .map((b, i, all) => (i === 0 ? "" : b.startsWith("- ") && all[i - 1].startsWith("- ") ? "\n" : "\n\n") + b)
    .join("");
}

function docxParagraph(para: string): string {
  let text = "";
  for (const token of para.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(tab|br|cr)\b[^>]*\/>/g)) {
    if (token[1] !== undefined) text += xmlText(token[1]);
    else text += token[2] === "tab" ? "\t" : "\n";
  }
  return text.trim();
}

/** Word: keeps headings, bullet/numbered lists, tables, tabs, and line breaks. */
export function docxToMarkdown(xml: string): string {
  const blocks: string[] = [];
  for (const match of xml.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>|<w:p(?:\s[^>]*?)?(?<!\/)>([\s\S]*?)<\/w:p>/g)) {
    if (match[1] !== undefined) {
      const rows = [...match[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((tr) =>
        [...tr[1].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)].map((tc) =>
          [...tc[1].matchAll(/<w:p(?:\s[^>]*?)?(?<!\/)>([\s\S]*?)<\/w:p>/g)].map((p) => docxParagraph(p[1])).join(" "),
        ),
      );
      blocks.push(markdownTable(rows));
      continue;
    }
    const para = match[2];
    const text = docxParagraph(para);
    if (!text) continue;
    const style = /<w:pStyle w:val="([^"]+)"/.exec(para)?.[1] ?? "";
    const heading = /^heading\s?([1-6])$/i.exec(style);
    if (heading) blocks.push(`${"#".repeat(Number(heading[1]))} ${text}`);
    else if (/^title$/i.test(style)) blocks.push(`# ${text}`);
    else if (/<w:numPr>/.test(para) || /^list/i.test(style)) blocks.push(`- ${text}`);
    else blocks.push(text);
  }
  return joinBlocks(blocks);
}

/** PowerPoint: a heading per slide and its text as bullets. */
function pptxToMarkdown(data: Buffer): string {
  return extractPptxText(data, MAX_IMPORT_CHARS)
    .split("\n\n")
    .map((slide) => {
      const [heading, ...lines] = slide.split("\n");
      const body = lines.map((l) => (l === "[No text on this slide]" ? l : `- ${l}`)).join("\n");
      return `## ${heading}\n\n${body}`;
    })
    .join("\n\n");
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "").toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Excel: each sheet becomes a Markdown table. */
function xlsxToMarkdown(data: Buffer, entries: ZipEntry[]): string {
  const shared: string[] = [];
  const sst = entries.find((e) => e.name === "xl/sharedStrings.xml");
  if (sst) {
    for (const si of readZipText(data, sst, MAX_XML).matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push([...si[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((t) => xmlText(t[1])).join(""));
    }
  }
  const workbook = readZipText(data, entries.find((e) => e.name === "xl/workbook.xml")!, MAX_XML);
  const names = [...workbook.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map((m) => xmlText(m[1]));
  const sheets = entries
    .map((e) => ({ e, n: Number(/^xl\/worksheets\/sheet(\d+)\.xml$/.exec(e.name)?.[1]) }))
    .filter((s) => s.n > 0)
    .sort((a, b) => a.n - b.n)
    .slice(0, MAX_SHEETS);

  const out: string[] = [];
  sheets.forEach(({ e, n }, i) => {
    const rows: string[][] = [];
    for (const row of readZipText(data, e, MAX_XML).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      if (rows.length >= MAX_ROWS) break;
      const cells: string[] = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cell[1];
        const inner = cell[2] ?? "";
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const col = ref ? columnIndex(ref) : cells.length;
        if (col < 0 || col >= MAX_COLS) continue;
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
        const value = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "";
        if (type === "s") cells[col] = shared[Number(value)] ?? "";
        else if (type === "inlineStr") cells[col] = tagText(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? "");
        else cells[col] = xmlText(value);
      }
      rows.push(cells);
    }
    const table = markdownTable(rows);
    if (table) out.push(`## ${names.length === sheets.length ? names[i] : `Sheet ${n}`}`, table);
  });
  return out.join("\n\n");
}

function odfParagraph(inner: string): string {
  return tagText(
    inner
      .replace(/<text:tab\s*\/>/g, "\t")
      .replace(/<text:line-break\s*\/>/g, "\n")
      .replace(/<text:s(?:\s+text:c="(\d+)")?\s*\/>/g, (_, c) => " ".repeat(Math.min(Number(c ?? 1), 40))),
  ).trim();
}

/** OpenDocument (.odt, .odp, .ods): headings, paragraphs, tables, and a heading per slide. */
function odfToMarkdown(xml: string): string {
  const blocks: string[] = [];
  const body = xml.replace(/<office:annotation\b[\s\S]*?<\/office:annotation>/g, "");
  let slide = 0;
  const pattern = /<table:table\b[^>]*>([\s\S]*?)<\/table:table>|<draw:page\b[^>]*>|<text:(p|h)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/text:\2>)/g;
  for (const m of body.matchAll(pattern)) {
    if (m[1] !== undefined) {
      const rows: string[][] = [];
      for (const tr of m[1].matchAll(/<table:table-row\b[^>]*?(?:\/>|>([\s\S]*?)<\/table:table-row>)/g)) {
        if (rows.length >= MAX_ROWS) break;
        const cells: string[] = [];
        for (const tc of (tr[1] ?? "").matchAll(/<table:(?:covered-)?table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:(?:covered-)?table-cell>)/g)) {
          const repeat = Math.min(Number(/table:number-columns-repeated="(\d+)"/.exec(tc[1])?.[1] ?? 1), MAX_COLS);
          const text = [...(tc[2] ?? "").matchAll(/<text:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/text:p>)/g)].map((p) => odfParagraph(p[1] ?? "")).join(" ");
          for (let k = 0; k < repeat && cells.length < MAX_COLS; k++) cells.push(text);
        }
        rows.push(cells);
      }
      blocks.push(markdownTable(rows));
    } else if (m[0].startsWith("<draw:page")) {
      blocks.push(`## Slide ${++slide}`);
    } else {
      const text = odfParagraph(m[4] ?? "");
      if (!text) continue;
      const level = m[2] === "h" ? Math.min(Math.max(Number(/text:outline-level="(\d)"/.exec(m[3])?.[1] ?? 1), 1), 6) : 0;
      blocks.push(level ? `${"#".repeat(level)} ${text}` : slide ? `- ${text}` : text);
    }
  }
  // Drop headings for slides with no text.
  const isSlide = (b: string | undefined) => b !== undefined && /^## Slide \d+$/.test(b);
  return joinBlocks(blocks.filter((b, i) => !isSlide(b) || (i + 1 < blocks.length && !isSlide(blocks[i + 1]))));
}

const RTF_SKIP = new Set([
  "fonttbl", "colortbl", "stylesheet", "info", "pict", "header", "footer", "headerl", "headerr", "footerl", "footerr",
  "listtable", "listoverridetable", "rsidtbl", "generator", "xmlnstbl", "themedata", "colorschememapping",
  "datastore", "latentstyles", "filetbl", "revtbl", "object", "fldinst",
]);

/** RTF: a small reader that keeps the text and paragraph breaks. */
export function rtfToText(rtf: string): string {
  const cp1252 = new TextDecoder("windows-1252");
  let out = "";
  const stack: { skip: boolean; uc: number }[] = [];
  let state = { skip: false, uc: 1 };
  let pendingSkip = 0; // fallback characters to drop after \uN
  let i = 0;
  const emit = (s: string) => {
    if (state.skip) return;
    if (pendingSkip > 0) { pendingSkip--; return; }
    out += s;
  };
  while (i < rtf.length) {
    const ch = rtf[i];
    if (ch === "{") { stack.push(state); state = { ...state }; i++; continue; }
    if (ch === "}") { state = stack.pop() ?? { skip: false, uc: 1 }; pendingSkip = 0; i++; continue; }
    if (ch === "\r" || ch === "\n") { i++; continue; }
    if (ch !== "\\") { emit(ch); i++; continue; }

    const next = rtf[i + 1];
    if (next === "\\" || next === "{" || next === "}") { emit(next); i += 2; continue; }
    if (next === "~") { emit(" "); i += 2; continue; }
    if (next === "_") { emit("-"); i += 2; continue; }
    if (next === "*") { state.skip = true; i += 2; continue; }
    if (next === "'") {
      const byte = parseInt(rtf.slice(i + 2, i + 4), 16);
      if (!Number.isNaN(byte)) emit(cp1252.decode(Uint8Array.of(byte)));
      i += 4;
      continue;
    }
    if (next === "\n" || next === "\r") { emit("\n"); i += 2; continue; }
    const word = /^\\([a-z]+)(-?\d+)? ?/i.exec(rtf.slice(i, i + 40));
    if (!word) { i += 2; continue; }
    i += word[0].length;
    const [, name, param] = word;
    if (RTF_SKIP.has(name)) state.skip = true;
    else if (name === "par" || name === "row") emit("\n\n");
    else if (name === "line") emit("\n");
    else if (name === "tab" || name === "cell") emit("\t");
    else if (name === "uc") state.uc = Number(param ?? 1);
    else if (name === "u" && param !== undefined) {
      const code = Number(param) < 0 ? Number(param) + 65536 : Number(param);
      emit(String.fromCharCode(code));
      if (!state.skip) pendingSkip = state.uc;
    }
  }
  return out;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };

/** HTML: headings, list items, and paragraphs; everything else becomes plain text. */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<(script|style|head|noscript|template)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<h([1-6])\b[^>]*>/gi, (_, n) => `\n\n${"#".repeat(Number(n))} `)
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|table|tr|section|article|blockquote)>/gi, "\n\n")
    .replace(/<\/t[dh]>/gi, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
      if (body[0] !== "#") return ENTITIES[body.toLowerCase()] ?? entity;
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    })
    .replace(/^[ \t]+|[ \t]+$/gm, "");
}
