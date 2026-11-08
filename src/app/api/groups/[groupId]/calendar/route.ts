import {NextResponse,type NextRequest} from "next/server";
import {requireUser} from "@/lib/auth";
import {createClient} from "@/lib/supabase/server";
function escapeIcs(v:string){return v.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
function stamp(value:string){return new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
export async function GET(_request:NextRequest,{params}:RouteContext<"/api/groups/[groupId]/calendar">){
 const {groupId}=await params,user=await requireUser(),db=await createClient();
 const {data:g}=await db.from("study_groups").select("id,course_id,name,description,location,meeting_starts_at,meeting_ends_at").eq("id",groupId).maybeSingle();
 if(!g?.meeting_starts_at||!g.meeting_ends_at)return new NextResponse("No scheduled meeting",{status:404});
 const {data:member}=await db.from("group_members").select("user_id").eq("group_id",groupId).eq("user_id",user.id).maybeSingle();
 if(!member)return new NextResponse("Not available",{status:403});
 const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PeerNote//Study Groups//EN",
 "BEGIN:VEVENT",`UID:${g.id}@peernote`,`DTSTAMP:${stamp(new Date().toISOString())}`,
 `DTSTART:${stamp(g.meeting_starts_at)}`,`DTEND:${stamp(g.meeting_ends_at)}`,
 `SUMMARY:${escapeIcs(g.name)}`,`DESCRIPTION:${escapeIcs(g.description)}`,
 `LOCATION:${escapeIcs(g.location)}`,"END:VEVENT","END:VCALENDAR"].join("\r\n")+"\r\n";
 return new NextResponse(ics,{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":"attachment; filename=peernote-study-group.ics","Cache-Control":"no-store"}});
}
