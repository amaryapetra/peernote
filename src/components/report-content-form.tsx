"use client";
import {useActionState} from "react";
import {submitContentReport} from "@/app/actions/safety";
import {FormMessage,SubmitButton} from "@/components/form";
import {inputClass} from "@/components/ui";
export function ReportContentForm({courseId,targetId,targetType}:{courseId:string;targetId:string;targetType:"note"|"material"|"post"}) {
 const [state,action]=useActionState(submitContentReport,undefined);
 return <details className="relative inline-block text-left"><summary className="cursor-pointer text-xs text-muted underline underline-offset-2 hover:text-danger">Report</summary>
 <form action={action} className="mt-2 w-64 space-y-2 rounded-lg border border-line bg-paper p-3 shadow-md sm:w-72">
 <input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="targetId" value={targetId}/><input type="hidden" name="targetType" value={targetType}/>
 <label className="block text-xs font-medium" htmlFor={`reason-${targetId}`}>Reason</label>
 <select id={`reason-${targetId}`} name="reason" required className={inputClass} defaultValue=""><option value="" disabled>Choose a reason</option><option value="copyright">Unauthorized material</option><option value="exam">Exam or answer key</option><option value="harassment">Harassment / private information</option><option value="spam">Spam</option><option value="other">Other</option></select>
 <label className="block text-xs font-medium" htmlFor={`details-${targetId}`}>Details (optional)</label><textarea id={`details-${targetId}`} name="details" rows={2} maxLength={600} className={inputClass}/>
 <FormMessage state={state}/><SubmitButton size="sm" pendingText="Submitting…">Send report</SubmitButton>
 </form></details>;
}
