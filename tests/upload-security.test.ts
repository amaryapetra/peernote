import {describe,it,expect} from "vitest";
import {checkMaterialName,validateClassMaterial} from "@/lib/upload-security";
import {MAX_MATERIAL_BYTES} from "@/lib/material-files";
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
 it("checks file names before the upload starts",()=>{
  expect(checkMaterialName("Lecture 3 notes.pdf")).toBeNull();
  expect(checkMaterialName("IMG_2041.JPG")).toBeNull();
  expect(checkMaterialName("setup.exe")).not.toBeNull();
  expect(checkMaterialName("notes.zip")).not.toBeNull();
 });
 it("accepts files up to the size limit",()=>{
  const big=new Uint8Array(MAX_MATERIAL_BYTES).fill(0x61);
  expect(validateClassMaterial("reading.txt",big)).toBeNull();
  expect(validateClassMaterial("reading.txt",new Uint8Array(MAX_MATERIAL_BYTES+1).fill(0x61))).toMatch(/50 MB/);
 });
});
