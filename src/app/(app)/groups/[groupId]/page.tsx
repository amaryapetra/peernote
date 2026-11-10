import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteGroup, joinGroup, leaveGroup, rsvpToGroup } from "@/app/actions/groups";
import { SubmitButton } from "@/components/form";
import { GroupPostForm } from "@/components/group-forms";
import { MeetingEditor } from "@/components/meeting-editor";
import { ReportContentForm } from "@/components/report-content-form";
import { Alert, Avatar, Card, EmptyState, buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMeetingTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Study group" };

export default async function GroupPage({ params, searchParams }: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  // RLS: only students in the course can see the group.
  const { data: group } = await supabase
    .from("study_groups")
    .select("*, course:courses(id, code, title)")
    .eq("id", groupId)
    .maybeSingle();
  if (!group || !group.course) notFound();

  const [{ data: members }, { data: posts }, {data: rsvps}] = await Promise.all([
    supabase
      .from("group_members")
      .select("user_id, joined_at, profile:profiles!group_members_user_id_fkey(id, full_name, major)")
      .eq("group_id", group.id)
      .order("joined_at"),
    // Returns nothing unless the viewer is a member.
    supabase
      .from("group_posts")
      .select("id, body, created_at, author_id, author:profiles!group_posts_author_id_fkey(id, full_name)")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("group_rsvps").select("user_id,status").eq("group_id",group.id),
  ]);
  const isMember = (members ?? []).some((m) => m.user_id === user.id);
  const isCreator = group.created_by === user.id;
  const full = group.members_count >= group.capacity;
  const myRsvp = (rsvps??[]).find(r=>r.user_id===user.id)?.status;
  const counts = { going: (rsvps??[]).filter(r=>r.status==="going").length,
    maybe: (rsvps??[]).filter(r=>r.status==="maybe").length };
  const meetingLabel = formatMeetingTime(group.meeting_starts_at, group.meeting_time);

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href={`/courses/${group.course.id}/groups`} className="hover:text-ink">
          {group.course.code} study groups
        </Link>
      </nav>

      {sp.created === "1" && <Alert tone="success">Group created. Share it with classmates from the course&apos;s Study groups tab.</Alert>}
      {sp.joined === "1" && <Alert tone="success">You joined the group.</Alert>}
      {sp.full === "1" && <Alert tone="error">Sorry, this group just filled up.</Alert>}
      {sp.error === "1" && <Alert tone="error">Couldn&apos;t join the group. Make sure you&apos;re in the course.</Alert>}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{group.name}</h1>
          {group.description && <p className="mt-2 max-w-2xl text-muted">{group.description}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex gap-2"><dt className="text-muted">When</dt><dd className="font-medium">{meetingLabel}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Where</dt><dd className="font-medium">{group.location || "TBD"}</dd></div>
            <div className="flex gap-2"><dt className="text-muted">Size</dt><dd className="font-medium">{group.members_count}/{group.capacity}</dd></div>
          </dl>
        </div>
        <div className="flex gap-2">
          {!isMember &&
            (full ? (
              <button type="button" disabled className={buttonClass("secondary")}>
                Group is full
              </button>
            ) : (
              <form action={joinGroup}>
                <input type="hidden" name="groupId" value={group.id} />
                <SubmitButton pendingText="Joining…">Join group</SubmitButton>
              </form>
            ))}
          {isMember && !isCreator && (
            <form action={leaveGroup}>
              <input type="hidden" name="groupId" value={group.id} />
              <SubmitButton variant="secondary" pendingText="Leaving…">
                Leave group
              </SubmitButton>
            </form>
          )}
          {isCreator && (
            <details className="relative">
              <summary className="flex h-10 cursor-pointer list-none items-center rounded-lg border border-line px-4 text-sm text-danger hover:bg-danger-soft">
                Delete group
              </summary>
              <div className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg">
                <p className="mb-3">Delete this group and its messages for everyone?</p>
                <form action={deleteGroup}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="courseId" value={group.course_id} />
                  <SubmitButton variant="danger" size="sm">
                    Yes, delete
                  </SubmitButton>
                </form>
              </div>
            </details>
          )}
        </div>
      </header>

      {isMember && (group.meeting_starts_at || isCreator) && (
        <Card><h2 className="font-display text-lg font-semibold">Meeting RSVP</h2>
        {group.meeting_starts_at ? (<>
        <p className="my-2 text-sm text-muted">{counts.going} going · {counts.maybe} maybe</p>
        <div className="flex flex-wrap gap-2">
          {(["going","maybe","not_going"] as const).map(status=>(
            <form action={rsvpToGroup} key={status}><input type="hidden" name="groupId" value={group.id}/>
              <input type="hidden" name="status" value={status}/>
              <SubmitButton variant={myRsvp===status?"primary":"secondary"} size="sm">
                {status==="not_going"?"Can't attend":status==="maybe"?"Maybe":"Going"}
              </SubmitButton>
            </form>
          ))}
          <Link href={`/api/groups/${group.id}/calendar`} className={buttonClass("secondary","sm")}>Add to calendar (.ics)</Link>
        </div>
        </>) : (
          <p className="my-2 text-sm text-muted">No meeting time yet. Set one so members can RSVP and get reminders.</p>
        )}
        {isCreator && <MeetingEditor groupId={group.id} scheduled={Boolean(group.meeting_starts_at)}/>}
        </Card>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="board-heading">
          <h2 id="board-heading" className="mb-4 font-display text-xl font-semibold">Group board</h2>
          {!isMember ? (
            <EmptyState title="Members only">Join the group to see and post messages.</EmptyState>
          ) : (
            <div className="space-y-5">
              <Card>
                <GroupPostForm groupId={group.id} />
              </Card>
              {!posts?.length ? (
                <p className="text-sm text-muted">No messages yet. Say hi and suggest a first meeting!</p>
              ) : (
                <ol className="space-y-3">
                  {posts.map((p) => (
                    <li key={p.id} id={`post-${p.id}`} className="scroll-mt-24 flex gap-3 rounded-xl border border-line bg-surface p-4">
                      <Avatar name={p.author?.full_name ?? "?"} id={p.author_id} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{p.author_id === user.id ? "You" : p.author?.full_name}</span>{" "}
                          <span className="text-muted">· {formatDate(p.created_at)}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.body}</p>
                        {p.author_id !== user.id && <ReportContentForm courseId={group.course_id} targetId={p.id} targetType="post" />}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Members</h2>
          <ul className="space-y-2">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="flex items-center gap-3">
                <Avatar name={m.profile?.full_name ?? "?"} id={m.user_id} size="sm" />
                <span className="min-w-0 truncate text-sm">
                  {m.profile?.full_name || "Classmate"}
                  {m.user_id === group.created_by && <span className="text-muted"> · organizer</span>}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
