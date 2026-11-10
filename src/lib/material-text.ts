import "server-only";
import { listZipEntries, readZipText, xmlText } from "@/lib/zip";

// PPTX is a ZIP archive containing OOXML slides. Only inflate slide XML;
// limit decompression and slide counts to avoid zip bombs on untrusted uploads.
const MAX_SLIDE_XML = 256 * 1024;
const MAX_SLIDES = 80;
const MAX_EXTRACTED_CHARS = 30000;

function slideParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const paragraph of xml.matchAll(/<a:p(?:\s[^>]*)?>([\s\S]*?)<\/a:p>/g)) {
    const runs = [...paragraph[1].matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)];
    const line = runs.map((run) => xmlText(run[1])).join("").trim();
    if (line) paragraphs.push(line);
  }
  return paragraphs;
}

/** Extract a readable, slide-numbered text preview without external services. */
export function extractPptxText(data: Buffer, maxChars = MAX_EXTRACTED_CHARS): string {
  const slides: { number: number; xml: string }[] = [];
  for (const entry of listZipEntries(data)) {
    const match = /^ppt\/slides\/slide(\d+)\.xml$/.exec(entry.name);
    if (!match) continue;
    if (slides.length >= MAX_SLIDES) throw new Error("PPTX slides exceed preview limits");
    slides.push({ number: Number(match[1]), xml: readZipText(data, entry, MAX_SLIDE_XML) });
  }
  if (slides.length === 0) throw new Error("No readable slides found in the PPTX");
  slides.sort((a, b) => a.number - b.number);
  return slides.map(({ number, xml }) => {
    const content = slideParagraphs(xml).join("\n");
    return `Slide ${number}\n${content || "[No text on this slide]"}`;
  }).join("\n\n").slice(0, maxChars);
}

export const MATERIAL_TEXT_LIMIT = MAX_EXTRACTED_CHARS;
