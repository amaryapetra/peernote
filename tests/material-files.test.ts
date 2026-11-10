import { describe, expect, it } from "vitest";
import { fileExtension, fileKindLabel, isInlineType } from "@/lib/material-files";

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
});
