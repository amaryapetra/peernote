import { describe, expect, it } from "vitest";
import { fileExtension, fileKindLabel, isExecutable, isInlineType } from "@/lib/material-files";

describe("class material file types", () => {
  it("labels common file types", () => {
    expect(fileKindLabel("pptx")).toBe("Slides");
    expect(fileKindLabel("docx")).toBe("Document");
    expect(fileKindLabel("xlsx")).toBe("Spreadsheet");
    expect(fileKindLabel("jpg")).toBe("Image");
    expect(fileKindLabel("mp3")).toBe("Audio");
    expect(fileKindLabel("stata14")).toBe("STATA14");
    expect(fileKindLabel("file")).toBe("File");
    expect(fileKindLabel(null)).toBe("Canvas / link");
  });

  it("reads extensions safely", () => {
    expect(fileExtension("Lecture 3.PDF")).toBe("pdf");
    expect(fileExtension("README")).toBe("file");
    expect(fileExtension("weird.na-me")).toBe("file");
  });

  it("only treats PDFs and images as viewable in the browser", () => {
    expect(isInlineType("pdf")).toBe(true);
    expect(isInlineType("png")).toBe(true);
    expect(isInlineType("html")).toBe(false);
    expect(isInlineType("svg")).toBe(false);
    expect(isInlineType("constructor")).toBe(false);
    expect(isInlineType(null)).toBe(false);
  });

  it("blocks programs by name and by contents", () => {
    expect(isExecutable("setup.exe", new Uint8Array([0]))).toBe(true);
    const pe = new Uint8Array(0x84);
    pe.set([0x4d, 0x5a]); pe[0x3c] = 0x80; pe.set([0x50, 0x45, 0, 0], 0x80);
    expect(isExecutable("notes.pdf", pe)).toBe(true);
    expect(isExecutable("notes.txt", new TextEncoder().encode("MZ notes: " + "x".repeat(100)))).toBe(false);
    expect(isExecutable("notes", new Uint8Array([0x7f, 0x45, 0x4c, 0x46]))).toBe(true);
    expect(isExecutable("hw.py", new TextEncoder().encode("print('hi')"))).toBe(false);
    expect(isExecutable("notes.docx", new Uint8Array([0x50, 0x4b, 3, 4]))).toBe(false);
  });
});
