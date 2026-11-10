import type { Metadata } from "next";
import Link from "next/link";
import { LocalTime } from "@/components/message-forms";
import { Avatar, ButtonLink, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Messages" };

type Conversation = {
  partnerId: string;
  name: string;
  isPartner: boolean;
  last?: { body: string; created_at: string; fromMe: boolean };
  unread: number;
};

export default async function MessagesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: connections }, { data: messages }] = await Promise.all([
    supabase
      .from("connections")
      .select(
        "requester_id, addressee_id, requester:profiles!connections_requester_id_fkey(id, full_name), addressee:profiles!connections_addressee_id_fkey(id, full_name)",
      )
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    // RLS returns only conversations the viewer is part of.
    supabase
      .from("direct_messages")
      .select(
        "sender_id, recipient_id, body, read_at, created_at, sender:profiles!direct_messages_sender_id_fkey(full_name), recipient:profiles!direct_messages_recipient_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const byPartner = new Map<string, Conversation>();
  for (const c of connections ?? []) {
    const other = c.requester_id === user.id ? c.addressee : c.requester;
    if (!other) continue;
    byPartner.set(other.id, { partnerId: other.id, name: other.full_name || "Study partner", isPartner: true, unread: 0 });
  }
  for (const m of messages ?? []) {
    const fromMe = m.sender_id === user.id;
    const partnerId = fromMe ? m.recipient_id : m.sender_id;
    let convo = byPartner.get(partnerId);
    if (!convo) {
      // A past conversation with someone who is no longer a study partner.
      const name = (fromMe ? m.recipient?.full_name : m.sender?.full_name) || "Former study partner";
      convo = { partnerId, name, isPartner: false, unread: 0 };
      byPartner.set(partnerId, convo);
    }
    // Messages arrive newest first, so the first one seen is the latest.
    convo.last ??= { body: m.body, created_at: m.created_at, fromMe };
    if (!fromMe && !m.read_at) convo.unread += 1;
  }

  const conversations = [...byPartner.values()].sort((a, b) => {
    if (a.last && b.last) return b.last.created_at.localeCompare(a.last.created_at);
    if (a.last || b.last) return a.last ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Messages"
        description="Message your study partners to plan study sessions and swap notes. Only people who've accepted a study partner request can message each other."
      />
      {conversations.length === 0 ? (
        <EmptyState title="No study partners to message yet" action={<ButtonLink href="/partners">Find study partners</ButtonLink>}>
          Once a classmate accepts your study partner request, you can message them here.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {conversations.map((c) => (
            <li key={c.partnerId}>
              <Link
                href={`/messages/${c.partnerId}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                aria-label={`${c.name}${c.unread ? `, ${c.unread} unread` : ""}`}
              >
                <Avatar name={c.name} id={c.partnerId} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className={c.unread ? "truncate font-semibold" : "truncate font-medium"}>{c.name}</p>
                    {c.last && (
                      <span className="shrink-0 text-xs text-muted">
                        <LocalTime iso={c.last.created_at} />
                      </span>
                    )}
                  </div>
                  <p className={`truncate text-sm ${c.unread ? "text-ink" : "text-muted"}`}>
                    {c.last ? `${c.last.fromMe ? "You: " : ""}${c.last.body}` : "No messages yet. Say hi!"}
                    {!c.isPartner && " · no longer partners"}
                  </p>
                </div>
                {c.unread > 0 && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-on-brand">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
