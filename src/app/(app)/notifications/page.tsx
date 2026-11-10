import type {Metadata} from "next";
import Link from "next/link";
import {markAllNotificationsRead,markNotificationRead} from "@/app/actions/safety";
import {SubmitButton} from "@/components/form";
import {Card,EmptyState,PageHeader} from "@/components/ui";
import {requireUser} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
import {formatDate} from "@/lib/format";
export const metadata:Metadata={title:"Notifications"};
export default async function NotificationsPage(){
 const user=await requireUser(),db=await createClient();
 const {data:notices}=await db.from("notifications").select("*").eq("user_id",user.id).order("created_at",{ascending:false}).limit(75);
 return <div className="mx-auto max-w-3xl space-y-6">
  <PageHeader title="Notifications" description="Updates from your classes, study partners, and group chats."/>
  {notices?.some(n=>!n.read_at)&&<form action={markAllNotificationsRead}><SubmitButton variant="secondary" size="sm">Mark all as read</SubmitButton></form>}
  {!notices?.length?<EmptyState title="All caught up">New updates will appear here.</EmptyState>:
  <ol className="space-y-3">{notices.map(n=><li key={n.id}><Card className={!n.read_at?"border-brand/40 bg-brand-soft/40":"opacity-75"}>
   <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1">
   <p className="font-semibold">{n.title}</p><p className="mt-1 break-words text-sm text-muted">{n.body}</p><p className="mt-2 text-xs text-muted">{formatDate(n.created_at)}</p>
   {n.read_at
    ? <Link href={n.href} className="mt-2 inline-block text-sm font-medium text-brand hover:underline">Open update</Link>
    : <form action={markNotificationRead}><input type="hidden" name="notificationId" value={n.id}/><input type="hidden" name="open" value="1"/>
       <button type="submit" className="mt-2 text-sm font-medium text-brand hover:underline">Open update</button></form>}
   </div>{!n.read_at&&<form action={markNotificationRead}><input type="hidden" name="notificationId" value={n.id}/><SubmitButton variant="ghost" size="sm">Mark read</SubmitButton></form>}</div>
  </Card></li>)}</ol>}
 </div>;
}
