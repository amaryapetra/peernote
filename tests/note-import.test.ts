import { describe, expect, it, vi } from "vitest";
import { deflateRawSync } from "node:zlib";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/client", () => ({ runText: vi.fn() }));
const { prepareNoteImport, rtfToText } = await import("@/lib/note-import");

function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [path, content] of Object.entries(files)) {
    const name = Buffer.from(path);
    const data = Buffer.from(content);
    const packed = deflateRawSync(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, packed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + packed.length;
  }
  const centralBlock = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(centralBlock.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBlock, end]);
}

const text = (result: ReturnType<typeof prepareNoteImport>) => {
  expect(result.kind).toBe("text");
  return result.kind === "text" ? result.text : "";
};

describe("note import", () => {
  it("reads Word documents with headings and lists", () => {
    const docx = zip({
      "[Content_Types].xml": "<Types/>",
      "word/document.xml":
        '<w:document><w:body>' +
        '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Lecture 4</w:t></w:r></w:p>' +
        '<w:p w:rsidR="1"/>' +
        '<w:p><w:r><w:t xml:space="preserve">Supply &amp; demand </w:t></w:r><w:r><w:t>basics</w:t></w:r></w:p>' +
        '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>First point</w:t></w:r></w:p>' +
        '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Second</w:t><w:tab/><w:t>point</w:t></w:r></w:p>' +
        "</w:body></w:document>",
    });
    expect(text(prepareNoteImport(docx, "notes.docx"))).toBe("# Lecture 4\n\nSupply & demand basics\n\n- First point\n- Second\tpoint");
  });

  it("reads PowerPoint slides", () => {
    const pptx = zip({ "ppt/slides/slide1.xml": "<p:sld><a:p><a:r><a:t>Elasticity</a:t></a:r></a:p></p:sld>" });
    expect(text(prepareNoteImport(pptx, "deck.pptx"))).toBe("## Slide 1\n\n- Elasticity");
  });

  it("turns spreadsheets into Markdown tables", () => {
    const xlsx = zip({
      "xl/workbook.xml": '<workbook><sheets><sheet name="Week 1" sheetId="1"/></sheets></workbook>',
      "xl/sharedStrings.xml": "<sst><si><t>Term</t></si><si><t>Meaning</t></si><si><r><t>GDP</t></r></si></sst>",
      "xl/worksheets/sheet1.xml":
        '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>42</v></c></row></sheetData></worksheet>',
    });
    expect(text(prepareNoteImport(xlsx, "terms.xlsx"))).toBe(
      "## Week 1\n\n| Term | Meaning |  |\n| --- | --- | --- |\n| GDP |  | 42 |",
    );
  });

  it("reads OpenDocument text", () => {
    const odt = zip({
      mimetype: "application/vnd.oasis.opendocument.text",
      "content.xml": '<office:body><text:h text:outline-level="2">Intro</text:h><text:p>Hello<text:s text:c="2"/>world</text:p></office:body>',
    });
    expect(text(prepareNoteImport(odt, "notes.odt"))).toBe("## Intro\n\nHello  world");
  });

  it("reads plain text, code, RTF, and HTML", () => {
    expect(text(prepareNoteImport(Buffer.from("Some notes\r\nline two"), "notes.anything"))).toBe("Some notes\nline two");
    expect(text(prepareNoteImport(Buffer.from("x = 1\n"), "hw.py"))).toBe("```python\nx = 1\n```");
    expect(text(prepareNoteImport(Buffer.from("a ```` b"), "q.r"))).toBe("`````r\na ```` b\n`````");
    expect(rtfToText("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0 Caf\\'e9 notes\\par Next \\u8364?5}")).toBe("Café notes\n\nNext €5");
    const html = Buffer.from("<html><head><title>x</title></head><body><h2>Topic</h2><ul><li>One &amp; two</li></ul></body></html>");
    expect(text(prepareNoteImport(html, "page.html"))).toBe("## Topic\n\n- One & two");
  });

  it("sends photos and PDFs to AI transcription", () => {
    expect(prepareNoteImport(Buffer.from("%PDF-1.7 ..."), "scan.pdf")).toEqual({ kind: "ai", mediaType: "application/pdf" });
    expect(prepareNoteImport(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]), "IMG.jpg")).toEqual({ kind: "ai", mediaType: "image/jpeg" });
  });

  it("explains files it can't read", () => {
    expect(prepareNoteImport(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0]), "old.doc").kind).toBe("unsupported");
    expect(prepareNoteImport(Buffer.from([1, 2, 0, 0, 5, 6]), "file.bin").kind).toBe("unsupported");
    expect(prepareNoteImport(zip({ "a.txt": "hi" }), "stuff.zip").kind).toBe("unsupported");
    expect(prepareNoteImport(Buffer.alloc(0), "empty.txt").kind).toBe("unsupported");
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(16)]);
    expect(prepareNoteImport(heic, "IMG_1234.HEIC").kind).toBe("unsupported");
  });
});
