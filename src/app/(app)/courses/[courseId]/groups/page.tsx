import type { Metadata } from "next";
import Link from "next/link";
import { CreateGroupForm } from "@/components/group-forms";
import { Badge, Card, EmptyState } from "@/components/ui";
import { getCourse } from "@/lib/data";

export const metadata: Metadata = { title: "Study groups" };

export default async function GroupsPage({ params }: PageProps<"/courses/[courseId]/groups">) {
  const { courseId } = await params;
  const { course, user, supabase } = await getCourse(courseId);

  const [{ data: groups }, { data: memberships }] = await Promise.all([
    supabase
      .from("study_groups")
      .select("*, creator:profiles!study_groups_created_by_fkey(full_name)")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false }),
    supabase.from("group_members").select("group_id").eq("user_id", user.id),
  ]);
  const mine = new Set((memberships ?? []).map((m) => m.group_id));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="groups-heading">
        <h2 id="groups-heading" className="sr-only">
          Study groups in {course.code}
        </h2>
        {!groups?.length ? (
          <EmptyState title="No study groups yet">Start one for an upcoming exam or a weekly review session.</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {groups.map((g) => {
              const full = g.members_count >= g.capacity;
              return (
                <li key={g.id}>
                  <Link href={`/groups/${g.id}`} className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 hover:border-brand/40">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold">{g.name}</h3>
                      {mine.has(g.id) ? <Badge tone="brand">Joined</Badge> : full ? <Badge>Full</Badge> : <Badge tone="success">Open</Badge>}
                    </div>
                    {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                    <dl className="mt-3 space-y-1 text-sm">
                      <div className="flex gap-2"><dt className="text-muted">When</dt><dd>{g.meeting_time || "TBD"}</dd></div>
                      <div className="flex gap-2"><dt className="text-muted">Where</dt><dd>{g.location || "TBD"}</dd></div>
                    </dl>
                    <p className="mt-auto pt-3 text-xs text-muted">
                      {g.members_count}/{g.capacity} members · started by {g.creator?.full_name || "a classmate"}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Card className="h-fit">
        <h2 className="mb-4 font-display text-xl font-semibold">Start a study group</h2>
        <CreateGroupForm courseId={course.id} />
      </Card>
    </div>
  );
}
