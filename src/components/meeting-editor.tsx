"use client";
import {useState} from "react";
import {rescheduleGroup} from "@/app/actions/groups";
import {SubmitButton} from "@/components/form";
import {inputClass} from "@/components/ui";
export function MeetingEditor({groupId}:{groupId:string}) {
 const [iso,setIso]=useState("");
 return <details className="mt-4 rounded-lg border border-line p-3">
  <summary className="cursor-pointer text-sm font-medium">Reschedule meeting (organizer)</summary>
  <form action={rescheduleGroup} className="mt-3 flex flex-wrap items-end gap-2">
   <input type="hidden" name="groupId" value={groupId}/><input type="hidden" name="starts_at_iso" value={iso}/>
   <label className="text-xs">New date/time<input type="datetime-local" required className={inputClass} onChange={e=>setIso(e.target.value?new Date(e.target.value).toISOString():"")}/></label>
   <label className="text-xs">Duration<select name="duration_minutes" defaultValue="60" className={inputClass}>
    <option value="30">30 min</option><option value="60">1 hour</option><option value="90">90 min</option><option value="120">2 hours</option><option value="180">3 hours</option>
   </select></label>
   <SubmitButton size="sm">Update time</SubmitButton>
  </form>
 </details>;
}
