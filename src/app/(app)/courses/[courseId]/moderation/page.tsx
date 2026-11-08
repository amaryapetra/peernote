import type {Metadata} from "next";
import Link from "next/link";
import {notFound} from "next/navigation";
import {moderateReport,removeCourseMember,unbanCourseMember,rotateCourseCode} from "@/app/actions/safety";
import {SubmitButton} from "@/components/form";
import {Alert,Card,EmptyState,PageHeader} from "@/components/ui";
import {getCourse} from "@/lib/data";
import {createAdminClient} from "@/lib/supabase/admin";
export const metadata:Metadata={title:"Course moderation"};
export default async function ModerationPage({params,searchParams}:PageProps<"/courses/[courseId]/moderation">) {
 const {courseId}=await params,sp=await searchParams;
 const {course,user,supabase}=await getCourse(courseId);if(course.created_by!==user.id)notFound();
 const admin=createAdminClient();
 const [{data:reports},{data:members},{data:bans}]=await Promise.all([
 admin.from("course_reports").select("id,target_id,target_type,reason,details,created_at").eq("course_id",courseId).eq("status","open").order("created_at",{ascending:false}).limit(100),
 supabase.from("enrollments").select("user_id,profile:profiles!enrollments_user_id_fkey(full_name)").eq("course_id",courseId).order("joined_at"),
 admin.from("course_bans").select("user_id,created_at").eq("course_id",courseId).limit(100)]);
 return <div className="space-y-9"><nav className="text-sm text-muted"><Link href={`/courses/${courseId}`} className="hover:text-brand">{course.code}</Link> / Moderation</nav>
 <PageHeader title="Course moderation" description="Review reports, manage who can access your course, and reset invitations."/>
 {sp.reviewed==="1"&&<Alert tone="success">Report reviewed.</Alert>}
 {sp.member_removed==="1"&&<Alert tone="success">Member removed and prevented from rejoining.</Alert>}
 {sp.unbanned==="1"&&<Alert tone="success">Ban lifted.</Alert>}
 <section className="space-y-4"><h2 className="font-display text-xl font-semibold">Content reports</h2>
 {!reports?.length?<EmptyState title="No open reports">If classmates flag content, it will appear here.</EmptyState>:
 reports.map(r=><Card key={r.id}><p className="font-semibold capitalize">{r.target_type} · {r.reason}</p>
 {r.details&&<p className="mt-2 text-sm text-muted">{r.details}</p>}
 <p className="mt-1 text-xs text-muted">Reporter identities are withheld in this queue. Review content before removing it.</p>
 <Link className="mt-2 inline-block text-sm text-brand hover:underline" href={r.target_type==="note"?`/notes/${r.target_id}`:r.target_type==="material"?`/courses/${courseId}/materials#material-${r.target_id}`:`/courses/${courseId}/groups`}>Review content</Link>
 <form action={moderateReport} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="reportId" value={r.id}/>
 <SubmitButton name="decision" value="dismissed" variant="secondary" size="sm">Dismiss</SubmitButton><SubmitButton name="decision" value="removed" variant="danger" size="sm">Remove content</SubmitButton></form></Card>)}
 </section>
 <div className="grid gap-6 lg:grid-cols-2"><Card><h2 className="font-display text-xl font-semibold">Members</h2><p className="my-3 text-sm text-muted">Removing a student also bans rejoining until you unblock them. Their existing notes are retained.</p>
 <ul className="space-y-3">{(members??[]).map(m=><li key={m.user_id} className="flex items-center justify-between gap-3 border-b border-line pb-2"><span className="text-sm">{m.profile?.full_name||"Classmate"} {m.user_id===user.id?"(you)":""}</span>
 {m.user_id!==user.id&&<form action={removeCourseMember}><input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="memberId" value={m.user_id}/><SubmitButton variant="danger" size="sm">Remove</SubmitButton></form>}</li>)}</ul></Card>
 <Card><h2 className="font-display text-xl font-semibold">Invites and bans</h2><p className="my-3 text-sm text-muted">Reset the invite code when it is shared beyond your classmates. Old links will stop working.</p>
 <form action={rotateCourseCode}><input type="hidden" name="courseId" value={courseId}/><SubmitButton variant="secondary" size="sm">Regenerate invite</SubmitButton></form>
 <h3 className="mb-2 mt-5 font-semibold">Banned students</h3>{!bans?.length?<p className="text-sm text-muted">None.</p>:<ul className="space-y-2">{bans.map(b=><li key={b.user_id} className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{b.user_id.slice(0,8)}…</span><form action={unbanCourseMember}><input type="hidden" name="courseId" value={courseId}/><input type="hidden" name="memberId" value={b.user_id}/><SubmitButton variant="secondary" size="sm">Unblock</SubmitButton></form></li>)}</ul>}
 </Card></div>
 </div>;
}
