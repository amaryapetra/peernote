import {MAX_MATERIAL_BYTES,MAX_MATERIAL_LABEL} from "@/lib/material-files";
/** Strict upload gate for untrusted classroom files.
 *  Extension allowlisting and signatures are hardening, NOT virus scanning.
 */
const FILE_TYPES = new Set(["pdf","jpg","jpeg","png","webp","gif","docx","pptx","xlsx","odt","ods","odp","txt","md","rtf","csv","tsv"]);
const BLOCKED_IN_NAME = /\.(?:exe|msi|bat|cmd|scr|ps1|vbs|js|jar|app|dmg|apk|html?|svg)(?:\.|$)/i;
const printable = (bytes:Uint8Array) => !bytes.subarray(0,4096).includes(0);
const starts=(b:Uint8Array,...n:number[])=>n.every((v,i)=>b[i]===v);
/** Checks just the file name, before any bytes are uploaded. */
export function checkMaterialName(name:string):string|null {
 const ext=/\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase()??"";
 if(!FILE_TYPES.has(ext)||BLOCKED_IN_NAME.test(name))return "Upload a PDF, Office document, presentation, spreadsheet, text file, or common image. Executables and archives are not accepted.";
 return null;
}
export function validateClassMaterial(name:string,bytes:Uint8Array):string|null {
 const nameError=checkMaterialName(name);
 if(nameError)return nameError;
 const ext=/\.([a-z0-9]+)$/i.exec(name)![1].toLowerCase();
 if(!bytes.length||bytes.length>MAX_MATERIAL_BYTES)return `Choose a file no larger than ${MAX_MATERIAL_LABEL}.`;
 const text=new TextDecoder("latin1").decode(bytes.subarray(0,24));
 if(ext==="pdf"&&!text.startsWith("%PDF-"))return "This file does not contain a valid PDF header.";
 if((ext==="jpg"||ext==="jpeg")&&!starts(bytes,0xff,0xd8,0xff))return "Invalid JPEG file.";
 if(ext==="png"&&!starts(bytes,137,80,78,71,13,10,26,10))return "Invalid PNG file.";
 if(ext==="gif"&&!/^GIF8[79]a/.test(text))return "Invalid GIF file.";
 if(ext==="webp"&&!(text.startsWith("RIFF")&&text.slice(8,12)==="WEBP"))return "Invalid WebP file.";
 if(["docx","pptx","xlsx","odt","ods","odp"].includes(ext)&&!starts(bytes,0x50,0x4b,0x03,0x04))return "Invalid document archive.";
 if(ext==="rtf"&&!text.startsWith("{\\rtf"))return "Invalid rich-text file.";
 if(["txt","md","csv","tsv"].includes(ext)&&!printable(bytes))return "Only plain-text files are supported for this extension.";
 if(new TextDecoder("latin1").decode(bytes).includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE"))return "The upload matched a malware test signature.";
 return null;
}

/** Optional third-party antivirus integration; never claim scanning is enabled by default.
 *  A configured service must return JSON {clean:true}. Fail closed on its errors.
 */
export async function verifyExternalMalwareScan(bytes:Uint8Array,filename:string):Promise<void> {
 const endpoint=process.env.MALWARE_SCAN_URL;
 const token=process.env.MALWARE_SCAN_TOKEN;
 if(!endpoint&&!token)return;
 if(!endpoint||!token||!endpoint.startsWith("https://"))throw new Error("Malware scan service is not configured correctly.");
 const response=await fetch(endpoint,{method:"POST",headers:{
   "Authorization":`Bearer ${token}`,"Content-Type":"application/octet-stream",
   "X-Upload-Filename":encodeURIComponent(filename.slice(0,160))
 },body:Buffer.from(bytes),cache:"no-store",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("Malware scanning is unavailable. Your file was not shared.");
 const result:unknown=await response.json();
 if(typeof result!=="object"||!result||!("clean" in result)||result.clean!==true)throw new Error("The upload did not pass the malware scan.");
}
