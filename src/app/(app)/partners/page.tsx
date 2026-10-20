import type { Metadata } from "next";
import Link from "next/link";
import { removeConnection, respondToConnection } from "@/app/actions/connections";
import { ClassmateCard } from "@/components/classmate-card";
import { SubmitButton } from "@/components/form";
import { Alert, Avatar, Card, EmptyState, ButtonLink, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { getClassmates } from "@/lib/partners";

export const metadata: Metadata = { title: "Study partners" };

export default async function PartnersPage() {
  const { user, supabase } = await getViewer();
  const [{ classmates, me }, { data: connections }] = await Promise.all([
    getClassmates(),
    supabase
      .from("connections")
      .select(
        "id, status, message, requester_id, addressee_id, created_at, course:courses(code), requester:profiles!connections_requester_id_fkey(id, full_name, major), addressee:profiles!connections_addressee_id_fkey(id, full_name, major)",
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
  ]);

  const all = connections ?? [];
  const incoming = all.filter((c) => c.status === "pending" && c.addressee_id === user.id);
  const outgoing = all.filter((c) => c.status === "pending" && c.requester_id === user.id);
  const accepted = all.filter((c) => c.status === "accepted");
  const otherOf = (c: (typeof all)[number]) => (c.requester_id === user.id ? c.addressee : c.requester);

  const acceptedIds = accepted.map((c) => otherOf(c)?.id).filter((id): id is string => Boolean(id));
  const { data: contacts } = acceptedIds.length
    ? await supabase.from("contact_cards").select("user_id, contact").in("user_id", acceptedIds)
    : { data: [] };
  const contactById = new Map((contacts ?? []).map((c) => [c.user_id, c.contact]));

  const suggestions = classmates.filter((c) => c.connection.kind === "none").slice(0, 9);
  const profileIncomplete = !me?.availability.length || !me?.study_styles.length;

  return (
    <div className="space-y-12">
      <PageHeader
        title="Study partners"
        description="Connect with classmates who share your courses, schedule, and study style. Contact info is shared only after both of you agree."
      />

      <section id="requests" aria-labelledby="requests-heading" className="scroll-mt-24">
        <h2 id="requests-heading" className="mb-4 font-display text-xl font-semibold">Requests</h2>
        {incoming.length === 0 && outgoing.length === 0 ? (
          <p className="text-sm text-muted">No pending requests.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {incoming.map((c) => (
              <Card key={c.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={c.requester?.full_name ?? "?"} id={c.requester_id} />
                  <div className="min-w-0">
                    <p className="font-medium">{c.requester?.full_name || "A classmate"}</p>
                    <p className="text-sm text-muted">
                      Wants to study together{c.course?.code ? ` for ${c.course.code}` : ""}
                    </p>
                  </div>
                </div>
                {c.message && <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">“{c.message}”</p>}
                <form action={respondToConnection} className="flex gap-2">
                  <input type="hidden" name="connectionId" value={c.id} />
                  <SubmitButton size="sm" name="decision" value="accept">
                    Accept
                  </SubmitButton>
                  <SubmitButton size="sm" variant="ghost" name="decision" value="decline">
                    Decline
                  </SubmitButton>
                </form>
              </Card>
            ))}
            {outgoing.map((c) => (
              <Card key={c.id} className="flex items-center gap-3">
                <Avatar name={c.addressee?.full_name ?? "?"} id={c.addressee_id} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.addressee?.full_name || "A classmate"}</p>
                  <p className="text-sm text-muted">Request sent, waiting for a reply</p>
                </div>
                <form action={removeConnection}>
                  <input type="hidden" name="connectionId" value={c.id} />
                  <SubmitButton size="sm" variant="ghost">
                    Cancel
                  </SubmitButton>
                </form>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="connections" aria-labelledby="connections-heading" className="scroll-mt-24">
        <h2 id="connections-heading" className="mb-4 font-display text-xl font-semibold">Your study partners</h2>
        {accepted.length === 0 ? (
          <EmptyState title="No study partners yet">Send a request to someone below. Once they accept, you&apos;ll both see each other&apos;s contact info here.</EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accepted.map((c) => {
              const other = otherOf(c);
              if (!other) return null;
              const contact = contactById.get(other.id);
              return (
                <li key={c.id}>
                  <Card className="flex h-full flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={other.full_name} id={other.id} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{other.full_name}</p>
                        <p className="truncate text-sm text-muted">{other.major || (c.course?.code ? `From ${c.course.code}` : "Classmate")}</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-success-soft px-3 py-2 text-sm">
                      <span className="text-muted">Contact: </span>
                      <span className="break-all font-medium text-ink">{contact || "They haven't added contact info yet."}</span>
                    </div>
                    <form action={removeConnection} className="mt-auto">
                      <input type="hidden" name="connectionId" value={c.id} />
                      <SubmitButton size="sm" variant="ghost" pendingText="Removing…">
                        Remove
                      </SubmitButton>
                    </form>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="suggested-heading">
        <h2 id="suggested-heading" className="mb-1 font-display text-xl font-semibold">Suggested for you</h2>
        <p className="mb-4 text-sm text-muted">Classmates from your courses, best matches first.</p>
        {profileIncomplete && (
          <div className="mb-4">
            <Alert tone="warning">
              <Link href="/profile" className="font-medium underline">
                Add your free times and study style
              </Link>{" "}
              to get better matches.
            </Alert>
          </div>
        )}
        {suggestions.length === 0 ? (
          <EmptyState title="No suggestions right now" action={<ButtonLink href="/courses" variant="secondary">Join more courses</ButtonLink>}>
            Suggestions come from the courses you&apos;ve joined. As more classmates join, they&apos;ll show up here.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((c) => (
              <ClassmateCard key={c.profile.id} classmate={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
