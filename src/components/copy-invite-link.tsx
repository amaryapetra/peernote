"use client";
import {useState} from "react";
export function CopyInviteLink({code}:{code:string}) {
 const [copied,setCopied]=useState(false);
 return <button type="button" className="inline-flex rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-brand hover:bg-surface-2" onClick={async()=>{
 try{await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);setCopied(true);setTimeout(()=>setCopied(false),1800);}catch{setCopied(false);}
 }}>{copied?"Link copied!":"Copy invite link"}</button>;
}
