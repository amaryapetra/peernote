import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export async function NotificationsBell() {
 const user=await requireUser();const db=await createClient();
 const {count}=await db.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null);
 const unread=count??0;
 return <Link href="/notifications" aria-label={unread?`Notifications: ${unread} unread`:"Notifications"} className="relative flex size-9 items-center justify-center rounded-lg border border-line hover:bg-surface-2">
 <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
 {unread>0&&<span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-on-brand">{unread>9?"9+":unread}</span>}
 </Link>;
}
