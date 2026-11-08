import type {Metadata} from "next";
import {acceptCourseInvite} from "@/app/actions/safety";
import {SubmitButton} from "@/components/form";
import {Card,PageHeader} from "@/components/ui";
import {requireUser} from "@/lib/auth";
export const metadata:Metadata={title:"Join a course"};
export default async function JoinInvitePage({params}:PageProps<"/join/[code]">){
 const {code}=await params;await requireUser();
 return <div className="mx-auto max-w-xl space-y-6"><PageHeader title="You've been invited!" description="Join classmates to share notes and study together."/>
 <Card><p className="mb-5 text-sm text-muted">Only accept invitations from classmates you know. You need a PeerNote account to join.</p>
 { /^[0-9A-F]{12}$/i.test(code) ? <form action={acceptCourseInvite}><input type="hidden" name="code" value={code.toUpperCase()}/><SubmitButton pendingText="Joining…">Join course</SubmitButton></form>
 : <p role="alert" className="text-sm text-danger">This invitation is invalid. Ask for a new link.</p>}</Card></div>;
}
