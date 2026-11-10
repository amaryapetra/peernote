-- Direct messages between study partners.
-- Only two people who have an accepted study partner connection can message
-- each other. Either person can stop new messages by removing the partner;
-- the existing conversation stays visible to the two of them only.

create table public.direct_messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references public.profiles(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check (length(btrim(body)) between 1 and 2000),
 read_at timestamptz,
 created_at timestamptz not null default now(),
 check (sender_id <> recipient_id)
);

-- One conversation = the pair of people, whichever direction a message went.
create index direct_messages_pair_idx on public.direct_messages
 (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);
create index direct_messages_inbox_idx on public.direct_messages (recipient_id, created_at desc);
create index direct_messages_unread_idx on public.direct_messages (recipient_id, sender_id) where read_at is null;

alter table public.direct_messages enable row level security;
revoke all on table public.direct_messages from anon, authenticated;
grant select, insert (sender_id, recipient_id, body), update (read_at) on public.direct_messages to authenticated;

-- Only the two people in a conversation can read it.
create policy direct_messages_select on public.direct_messages for select to authenticated
 using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
-- You can send only as yourself, and only to an accepted study partner.
create policy direct_messages_insert on public.direct_messages for insert to authenticated
 with check (sender_id = (select auth.uid()) and public.is_connected(recipient_id));
-- Only the recipient can mark a message read (the grant limits this to read_at).
create policy direct_messages_mark_read on public.direct_messages for update to authenticated
 using (recipient_id = (select auth.uid()))
 with check (recipient_id = (select auth.uid()));

-- Basic flood protection: at most 20 messages a minute from one sender.
create function public.limit_direct_messages() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (select count(*) from public.direct_messages
     where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
   raise exception 'You''re sending messages too quickly. Wait a minute and try again.' using errcode = '54000';
 end if;
 return new;
end;
$$;
create trigger limit_direct_messages_insert before insert on public.direct_messages
 for each row execute function public.limit_direct_messages();

-- In-app notification for the recipient. While they still have an unread
-- message notification from this sender, don't stack another one.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
 check (kind in ('new_note','partner_accepted','group_message','moderation','meeting_reminder','direct_message'));

create function public.notify_direct_message() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists (
   select 1 from public.notifications
   where user_id = new.recipient_id and actor_id = new.sender_id
     and kind = 'direct_message' and read_at is null
 ) then
   insert into public.notifications(user_id, actor_id, kind, title, body, href)
   values (new.recipient_id, new.sender_id, 'direct_message', 'New message from your study partner',
     left(new.body, 180), '/messages/' || new.sender_id::text);
 end if;
 return new;
end;
$$;
create trigger notify_direct_message_insert after insert on public.direct_messages
 for each row execute function public.notify_direct_message();

-- Trigger functions never need to be callable as public RPCs.
revoke execute on function public.limit_direct_messages(), public.notify_direct_message()
 from public, anon, authenticated;
