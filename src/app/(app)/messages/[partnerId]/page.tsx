import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConversationLive, LocalTime, MessageComposer } from "@/components/message-forms";
import { Alert, Avatar, Card, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { firstName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConversationPage({ params }: PageProps<"/messages/[partnerId]">) {
  const { partnerId } = await params;
  if (!UUID.test(partnerId)) notFound();
  const user = await requireUser();
  if (partnerId === user.id) notFound();
  const supabase = await createClient();

  const [{ data: connection }, { data: profile }, { data: messages }] = await Promise.all([
    supabase
      .from("connections")
      .select("id, course:courses(code)")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${partnerId}),and(requester_id.eq.${partnerId},addressee_id.eq.${user.id})`,
      )
      .maybeSingle(),
    supabase.from("profiles").select("id, full_name, major").eq("id", partnerId).maybeSingle(),
    // RLS returns only messages the viewer sent or received. Newest first.
    supabase
      .from("direct_messages")
      .select("id, sender_id, body, created_at")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // Nothing to show for someone who was never a partner.
  if (!connection && !messages?.length) notFound();

  const name = profile?.full_name || "Former study partner";
  const { count: unread } = await supabase
    .from("direct_messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("sender_id", partnerId)
    .is("read_at", null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/messages" className="hover:text-ink">
          ← All messages
        </Link>
      </nav>
      <header className="flex items-center gap-3">
        <Avatar name={name} id={partnerId} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-semibold">{name}</h1>
          <p className="truncate text-sm text-muted">
            {connection
              ? `Study partner${connection.course?.code ? ` from ${connection.course.code}` : ""}${profile?.major ? ` · ${profile.major}` : ""}`
              : "No longer study partners"}
          </p>
        </div>
      </header>

      <Card className="p-0">
        {/* column-reverse keeps the newest message in view at the bottom. */}
        <ol
          aria-label={`Conversation with ${name}`}
          aria-live="polite"
          className="flex max-h-[60vh] min-h-64 flex-col-reverse gap-3 overflow-y-auto p-4"
        >
          {!messages?.length ? (
            <li className="m-auto max-w-sm text-center text-sm text-muted">
              Say hi to {firstName(name)} and suggest a time to study or a set of notes to swap.
            </li>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <li key={m.id} className={cx("flex max-w-[85%] flex-col", mine ? "items-end self-end" : "items-start self-start")}>
                  <p
                    className={cx(
                      "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                      mine ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm bg-surface-2 text-ink",
                    )}
                  >
                    <span className="sr-only">{mine ? "You" : firstName(name)}: </span>
                    {m.body}
                  </p>
                  <span className="mt-1 text-[11px] text-muted">
                    <LocalTime iso={m.created_at} />
                  </span>
                </li>
              );
            })
          )}
        </ol>
        <div className="border-t border-line p-4">
          {connection ? (
            <MessageComposer recipientId={partnerId} firstName={firstName(name)} />
          ) : (
            <Alert tone="info">
              You&apos;re no longer study partners, so you can&apos;t send new messages.{" "}
              <Link href="/partners" className="font-medium underline">
                Send a new request
              </Link>{" "}
              to reconnect.
            </Alert>
          )}
        </div>
      </Card>
      <p className="text-xs text-muted">
        Messages are visible only to you and {firstName(name)}. Removing a study partner stops new messages.
      </p>
      <ConversationLive partnerId={partnerId} unread={unread ?? 0} />
    </div>
  );
}
