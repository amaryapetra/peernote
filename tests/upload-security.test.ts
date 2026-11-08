import {describe,it,expect} from "vitest";
import {validateClassMaterial} from "@/lib/upload-security";
const bytes=(text:string)=>new TextEncoder().encode(text);
describe("class material upload validation",()=>{
 it("accepts a basic PDF",()=>expect(validateClassMaterial("lecture.pdf",bytes("%PDF-1.4\nlecture"))).toBeNull());
 it("rejects disguised files",()=>{
  expect(validateClassMaterial("lecture.pdf",bytes("not a PDF"))).toMatch(/PDF/);
  expect(validateClassMaterial("lecture.exe.pdf",bytes("%PDF-1.4"))).not.toBeNull();
  expect(validateClassMaterial("malware.js",bytes("alert(1)"))).not.toBeNull();
 });
 it("rejects ZIP archives and plain text binary data",()=>{
  expect(validateClassMaterial("notes.zip",bytes("PK"))).not.toBeNull();
  expect(validateClassMaterial("notes.txt",new Uint8Array([65,0,66]))).not.toBeNull();
 });
 it("rejects the EICAR antivirus test string",()=>expect(validateClassMaterial("test.txt",bytes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"))).not.toBeNull());
});
