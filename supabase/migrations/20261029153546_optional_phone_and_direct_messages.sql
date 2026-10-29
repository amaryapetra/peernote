-- Contact cards already restrict reads to the owner and accepted connections.
-- Do not place phone numbers on the classmate-visible profiles table.
alter table public.contact_cards add column phone text
  constraint contact_cards_phone_check check (
    phone is null or (
      char_length(phone) <= 40
      and phone ~ '^\+?[0-9().[:space:]-]+$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
    )
  );

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.connections(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000 and body ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);
create index direct_messages_thread_idx on public.direct_messages (connection_id, created_at desc, id desc);
create index direct_messages_sender_idx on public.direct_messages (sender_id);
alter table public.direct_messages enable row level security;

create policy direct_messages_select on public.direct_messages for select to authenticated
  using (exists (
    select 1 from public.connections c
    where c.id = connection_id and c.status = 'accepted'
      and (c.requester_id = (select auth.uid()) or c.addressee_id = (select auth.uid()))
  ));
create policy direct_messages_insert on public.direct_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and exists (
    select 1 from public.connections c
    where c.id = connection_id and c.status = 'accepted'
      and (c.requester_id = (select auth.uid()) or c.addressee_id = (select auth.uid()))
  ));

-- Students cannot forge timestamps, edit messages, or impersonate senders.
revoke all on public.direct_messages from public, anon, authenticated;
grant select on public.direct_messages to authenticated;
grant insert (connection_id, sender_id, body) on public.direct_messages to authenticated;
grant all on public.direct_messages to service_role;
