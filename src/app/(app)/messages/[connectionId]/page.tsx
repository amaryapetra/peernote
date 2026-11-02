import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MessageForm } from "@/components/message-form";
import { MessageRefresh } from "@/components/message-refresh";
import { ButtonLink, Card, EmptyState, PageHeader, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Conversation" };
const PAGE_SIZE = 50;

export default async function ConversationPage({ params, searchParams }: PageProps<"/messages/[connectionId]">) {
  const { connectionId } = await params;
  if (!z.uuid().safeParse(connectionId).success) notFound();
  const user = await requireUser(`/messages/${connectionId}`);
  const supabase = await createClient();
  const { data: connection, error } = await supabase.from("connections")
    .select("id, requester_id, requester:profiles!connections_requester_id_fkey(full_name), addressee:profiles!connections_addressee_id_fkey(full_name)")
    .eq("id", connectionId).eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).maybeSingle();
  if (error) throw new Error("Couldn't load this conversation. Please try again.");
  if (!connection) notFound();
  const other = connection.requester_id === user.id ? connection.addressee : connection.requester;
  const name = other?.full_name || "Study partner";
  const sp = await searchParams;
  const rawPage = Number(sp.page ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const start = (page - 1) * PAGE_SIZE;
  const { data: rows, error: messagesError } = await supabase.from("direct_messages")
    .select("id, sender_id, body, created_at").eq("connection_id", connectionId)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range(start, start + PAGE_SIZE);
  if (messagesError) throw new Error("Couldn't load messages. Please try again.");
  const hasOlder = (rows?.length ?? 0) > PAGE_SIZE;
  const messages = (rows ?? []).slice(0, PAGE_SIZE).reverse();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/messages" className="text-sm text-muted hover:text-ink">← All messages</Link>
      <PageHeader title={name} description="Only the two of you can read this conversation in PeerNote." actions={<MessageRefresh />} />
      <p className="text-xs text-muted">Checks for new messages every 10 seconds. Removing the connection deletes this conversation for both of you.</p>
      <section aria-label="Conversation" className="space-y-4">
        {messages.length === 0 ? (
          <EmptyState title={page === 1 ? "Start the conversation" : "No older messages"}>
            {page === 1 ? "Say hello and plan your next study session." : "Go back to the latest messages below."}
          </EmptyState>
        ) : (
          <ol className="space-y-3">
            {messages.map((message) => {
              const mine = message.sender_id === user.id;
              return (
                <li key={message.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[90%] min-w-0 rounded-xl px-4 py-3 sm:max-w-[80%]", mine ? "bg-brand-soft" : "border border-line bg-surface")}>
                    <p className="text-xs font-medium text-muted">{mine ? "You" : name}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    <time dateTime={message.created_at} className="mt-2 block text-xs text-muted">
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" }).format(new Date(message.created_at))} CT
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <nav aria-label="Message history" className="flex flex-wrap gap-2">
          {hasOlder && <ButtonLink variant="secondary" size="sm" href={`/messages/${connectionId}?page=${page + 1}`}>Older messages</ButtonLink>}
          {page > 1 && <ButtonLink variant="secondary" size="sm" href={`/messages/${connectionId}?page=${page - 1}`}>Newer messages</ButtonLink>}
          {page > 1 && <ButtonLink variant="ghost" size="sm" href={`/messages/${connectionId}`}>Latest messages</ButtonLink>}
        </nav>
      </section>
      {page === 1 ? <Card><MessageForm connectionId={connectionId} /></Card> : <p className="text-sm text-muted">Return to the latest messages to reply.</p>}
    </div>
  );
}
