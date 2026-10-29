import { inflateRawSync } from "node:zlib";

// Minimal ZIP reader for Office/OpenDocument files (PPTX, DOCX, XLSX, ODT...).
// Uploads are untrusted, so every read is bounds-checked and decompression is capped
// to avoid zip bombs.

export type ZipEntry = {
  name: string;
  method: number;
  compressed: number;
  uncompressed: number;
  localOffset: number;
};

const MAX_ENTRIES = 5000;

export function isZip(data: Buffer): boolean {
  return data.length >= 4 && data.readUInt32LE(0) === 0x04034b50;
}

/** List the entries in a ZIP archive's central directory. */
export function listZipEntries(data: Buffer): ZipEntry[] {
  if (data.length < 22 || !isZip(data)) throw new Error("Not a valid ZIP archive");
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP central directory is missing");
  const count = data.readUInt16LE(eocd + 10);
  let offset = data.readUInt32LE(eocd + 16);
  if (count > MAX_ENTRIES || offset >= data.length) throw new Error("ZIP archive is too large");

  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP directory");
    const nameLen = data.readUInt16LE(offset + 28);
    const extraLen = data.readUInt16LE(offset + 30);
    const commentLen = data.readUInt16LE(offset + 32);
    if (offset + 46 + nameLen + extraLen + commentLen > data.length) throw new Error("Invalid ZIP entry");
    entries.push({
      name: data.toString("utf8", offset + 46, offset + 46 + nameLen),
      method: data.readUInt16LE(offset + 10),
      compressed: data.readUInt32LE(offset + 20),
      uncompressed: data.readUInt32LE(offset + 24),
      localOffset: data.readUInt32LE(offset + 42),
    });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Read one entry as UTF-8 text, refusing anything larger than maxBytes once inflated. */
export function readZipText(data: Buffer, entry: ZipEntry, maxBytes: number): string {
  if (entry.uncompressed > maxBytes || entry.compressed > data.length) throw new Error("ZIP entry exceeds size limits");
  const at = entry.localOffset;
  if (at + 30 > data.length || data.readUInt32LE(at) !== 0x04034b50) throw new Error("Invalid ZIP local entry");
  const dataAt = at + 30 + data.readUInt16LE(at + 26) + data.readUInt16LE(at + 28);
  if (dataAt + entry.compressed > data.length) throw new Error("Invalid ZIP entry size");
  const chunk = data.subarray(dataAt, dataAt + entry.compressed);
  const decoded = entry.method === 0
    ? chunk
    : entry.method === 8
      ? inflateRawSync(chunk, { maxOutputLength: maxBytes })
      : null;
  if (!decoded || decoded.length > maxBytes || decoded.length !== entry.uncompressed) {
    throw new Error("Unsupported or malformed ZIP compression");
  }
  return decoded.toString("utf8");
}

/** Decode the XML entities that show up in Office document text. */
export function xmlText(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (entity) => {
    const fixed: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
    if (fixed[entity]) return fixed[entity];
    const codepoint = entity.startsWith("&#x")
      ? parseInt(entity.slice(3, -1), 16)
      : parseInt(entity.slice(2, -1), 10);
    return Number.isInteger(codepoint) && codepoint > 0 && codepoint <= 0x10ffff
      ? String.fromCodePoint(codepoint)
      : entity;
  });
}
