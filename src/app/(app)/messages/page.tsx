import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar, ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const supabase = await createClient();
  const { data: connections, error } = await supabase.from("connections")
    .select("id, requester_id, addressee_id, requester:profiles!connections_requester_id_fkey(id, full_name), addressee:profiles!connections_addressee_id_fkey(id, full_name)")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
    .order("responded_at", { ascending: false });
  if (error) throw new Error("Couldn't load your conversations. Please try again.");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Messages" description="Private conversations with your accepted study partners. No phone number needed." />
      {!connections?.length ? (
        <EmptyState title="Connect to start chatting" action={<ButtonLink href="/partners">Find study partners</ButtonLink>}>
          Once you both accept a connection, you can message each other here.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {connections.map((c) => {
            const otherId = c.requester_id === user.id ? c.addressee_id : c.requester_id;
            const other = c.requester_id === user.id ? c.addressee : c.requester;
            const name = other?.full_name || "Study partner";
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-5 hover:bg-surface-2">
                  <Avatar name={name} id={otherId} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{name}</span><span className="text-sm text-muted">Open conversation</span></span>
                  <span aria-hidden="true" className="text-muted">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
