import { describe, expect, it, vi } from "vitest";
import { deflateRawSync } from "node:zlib";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/client", () => ({ runText: vi.fn() }));
const { extractPptxText } = await import("@/lib/material-text");

function smallPptx(slides: string[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  slides.forEach((xml, index) => {
    const name = Buffer.from(`ppt/slides/slide${index + 1}.xml`);
    const data = Buffer.from(xml);
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
  });
  const centralBlock = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(slides.length, 8);
  end.writeUInt16LE(slides.length, 10);
  end.writeUInt32LE(centralBlock.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBlock, end]);
}

describe("PowerPoint text extraction", () => {
  it("extracts readable slide text in order and decodes XML entities", () => {
    const file = smallPptx([
      '<p:sld xmlns:a="x"><a:p><a:r><a:t>Welcome &amp; Intro</a:t></a:r></a:p><a:p><a:t>Topic 1</a:t></a:p></p:sld>',
      '<p:sld><a:p><a:r><a:t>Next slide</a:t></a:r></a:p></p:sld>',
    ]);
    expect(extractPptxText(file)).toBe("Slide 1\nWelcome & Intro\nTopic 1\n\nSlide 2\nNext slide");
  });
  it("rejects invalid or empty presentations", () => {
    expect(() => extractPptxText(Buffer.from("not a pptx"))).toThrow();
    expect(() => extractPptxText(smallPptx([]))).toThrow();
  });
  it("limits decompression to prevent oversized slide XML", () => {
    const huge = `<a:p><a:t>${"A".repeat(270000)}</a:t></a:p>`;
    expect(() => extractPptxText(smallPptx([huge]))).toThrow();
  });
});
