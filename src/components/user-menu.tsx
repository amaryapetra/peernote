import Link from "next/link";
import { logOut } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "./ui";

export async function UserMenu() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { count: pending }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
  ]);
  const name = profile?.full_name || user.email;

  return (
    <div className="flex items-center gap-3">
      {Boolean(pending) && (
        <Link
          href="/partners#requests"
          className="rounded-full bg-highlight px-2.5 py-1 text-xs font-semibold text-highlight-ink"
          aria-label={`${pending} pending study partner request${pending === 1 ? "" : "s"}`}
        >
          {pending} new request{pending === 1 ? "" : "s"}
        </Link>
      )}
      <Link href="/profile" className="flex items-center gap-2" aria-label="Your profile">
        <Avatar name={name} id={user.id} size="sm" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline">{name}</span>
      </Link>
      <form action={logOut}>
        <button type="submit" className="text-sm text-muted hover:text-ink">
          Log out
        </button>
      </form>
    </div>
  );
}
