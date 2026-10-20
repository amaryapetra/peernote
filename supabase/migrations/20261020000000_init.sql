-- PeerNote initial schema
-- Run this in the Supabase SQL editor, or with `supabase db push`.
--
-- Access model, in one sentence: you can see a course's notes, roster, and
-- study groups only after you join that course, and you can see a
-- classmate's contact info only after they accept your connection request.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  school text not null default 'Tulane University' check (char_length(school) <= 120),
  major text not null default '' check (char_length(major) <= 120),
  grad_year int check (grad_year between 2000 and 2100),
  bio text not null default '' check (char_length(bio) <= 600),
  study_styles text[] not null default '{}',
  availability text[] not null default '{}',
  last_course_id uuid,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kept apart from profiles so RLS can hide it until a connection is accepted.
create table public.contact_cards (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  contact text not null default '' check (char_length(contact) <= 200),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(code) between 2 and 20),
  title text not null check (char_length(title) between 2 and 120),
  term text not null check (char_length(term) between 2 and 40),
  instructor text not null default '' check (char_length(instructor) <= 80),
  school text not null default 'Tulane University' check (char_length(school) <= 120),
  join_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  members_count int not null default 0,
  notes_count int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index courses_unique_section
  on public.courses (lower(code), lower(term), lower(instructor), lower(school));

alter table public.profiles
  add constraint profiles_last_course_fk
  foreign key (last_course_id) references public.courses (id) on delete set null;

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create index enrollments_course_idx on public.enrollments (course_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  lecture_date date not null,
  topic text not null default '' check (char_length(topic) <= 140),
  content text not null check (char_length(content) between 20 and 60000),
  integrity_note text not null default '',
  helpful_count int not null default 0,
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(topic, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_course_date_idx on public.notes (course_id, lecture_date desc);
create index notes_author_idx on public.notes (author_id);
create index notes_search_idx on public.notes using gin (search);

create table public.note_reactions (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  meeting_time text not null default '' check (char_length(meeting_time) <= 120),
  location text not null default '' check (char_length(location) <= 120),
  capacity int not null default 6 check (capacity between 2 and 30),
  members_count int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index study_groups_course_idx on public.study_groups (course_id);

create table public.group_members (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index group_posts_group_idx on public.group_posts (group_id, created_at desc);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid references public.courses (id) on delete set null,
  message text not null default '' check (char_length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);

-- One connection per pair of people, whichever direction it was sent in.
create unique index connections_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index connections_addressee_idx on public.connections (addressee_id, status);

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  note_id uuid references public.notes (id) on delete cascade,
  lecture_date date,
  kind text not null check (kind in ('gap_fill', 'catch_up', 'ask')),
  question text not null default '',
  content jsonb not null,
  source_note_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index ai_insights_user_idx on public.ai_insights (user_id, created_at desc);
create index ai_insights_note_idx on public.ai_insights (note_id, user_id);

-- Every AI call is logged here so the app can cap usage per student.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies.
-- SECURITY DEFINER so policies on one table can look at another without
-- recursing through that table's own policies.
-- ---------------------------------------------------------------------------

create or replace function public.is_enrolled(p_course uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments
    where course_id = p_course and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_member(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid()
  );
$$;

create or replace function public.can_see_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.study_groups g
    join public.enrollments e on e.course_id = g.course_id
    where g.id = p_group and e.user_id = auth.uid()
  );
$$;

create or replace function public.shares_course(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments mine
    join public.enrollments theirs on theirs.course_id = mine.course_id
    where mine.user_id = auth.uid() and theirs.user_id = p_other
  );
$$;

create or replace function public.has_any_connection(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections
    where (requester_id = auth.uid() and addressee_id = p_other)
       or (addressee_id = auth.uid() and requester_id = p_other)
  );
$$;

create or replace function public.is_connected(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = p_other)
        or (addressee_id = auth.uid() and requester_id = p_other))
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Create a profile and an empty contact card whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 80), ''));
  insert into public.contact_cards (user_id, contact)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger contact_cards_touch before update on public.contact_cards
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();

-- Whoever creates a course is enrolled in it automatically.
create or replace function public.enroll_course_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.enrollments (user_id, course_id)
    values (new.created_by, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger courses_enroll_creator after insert on public.courses
  for each row execute function public.enroll_course_creator();

-- Whoever creates a study group joins it automatically.
create or replace function public.join_group_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id)
    values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger study_groups_join_creator after insert on public.study_groups
  for each row execute function public.join_group_creator();

-- Keep denormalized counters in sync.
create or replace function public.sync_course_members_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.courses set members_count = members_count + 1 where id = new.course_id;
  else
    update public.courses set members_count = greatest(members_count - 1, 0) where id = old.course_id;
  end if;
  return null;
end;
$$;

create trigger enrollments_count after insert or delete on public.enrollments
  for each row execute function public.sync_course_members_count();

create or replace function public.sync_course_notes_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.courses set notes_count = notes_count + 1 where id = new.course_id;
  else
    update public.courses set notes_count = greatest(notes_count - 1, 0) where id = old.course_id;
  end if;
  return null;
end;
$$;

create trigger notes_count after insert or delete on public.notes
  for each row execute function public.sync_course_notes_count();

create or replace function public.sync_note_helpful_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.notes set helpful_count = helpful_count + 1 where id = new.note_id;
  else
    update public.notes set helpful_count = greatest(helpful_count - 1, 0) where id = old.note_id;
  end if;
  return null;
end;
$$;

create trigger note_reactions_count after insert or delete on public.note_reactions
  for each row execute function public.sync_note_helpful_count();

-- Group size: enforce capacity and keep the counter in sync.
create or replace function public.check_group_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_capacity int;
  v_count int;
begin
  select capacity, members_count into v_capacity, v_count
  from public.study_groups where id = new.group_id for update;
  if v_count >= v_capacity then
    raise exception 'This study group is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger group_members_capacity before insert on public.group_members
  for each row execute function public.check_group_capacity();

create or replace function public.sync_group_members_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.study_groups set members_count = members_count + 1 where id = new.group_id;
  else
    update public.study_groups set members_count = greatest(members_count - 1, 0) where id = old.group_id;
  end if;
  return null;
end;
$$;

create trigger group_members_count after insert or delete on public.group_members
  for each row execute function public.sync_group_members_count();

-- Leaving a course also removes you from that course's study groups.
create or replace function public.leave_course_groups()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.group_members gm
  using public.study_groups g
  where gm.group_id = g.id and g.course_id = old.course_id and gm.user_id = old.user_id;
  return null;
end;
$$;

create trigger enrollments_leave_groups after delete on public.enrollments
  for each row execute function public.leave_course_groups();

-- ---------------------------------------------------------------------------
-- Search (runs with the caller's permissions, so RLS still applies)
-- ---------------------------------------------------------------------------

create or replace function public.search_course_notes(p_course uuid, p_query text, p_limit int default 8)
returns table (
  id uuid,
  title text,
  topic text,
  lecture_date date,
  author_id uuid,
  content text,
  rank real
)
language sql stable security invoker set search_path = public as $$
  with q as (
    -- OR the words together so a question matches notes that share any key term.
    select nullif(replace(plainto_tsquery('english', p_query)::text, '&', '|'), '')::tsquery as tsq
  )
  select n.id, n.title, n.topic, n.lecture_date, n.author_id, n.content,
         ts_rank(n.search, q.tsq) as rank
  from public.notes n, q
  where n.course_id = p_course
    and q.tsq is not null
    and n.search @@ q.tsq
  order by rank desc, n.lecture_date desc
  limit least(greatest(p_limit, 1), 20);
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.contact_cards enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.notes enable row level security;
alter table public.note_reactions enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.connections enable row level security;
alter table public.ai_insights enable row level security;
alter table public.ai_usage enable row level security;

-- profiles: yourself, classmates, and anyone you have a connection record with.
create policy "profiles_select" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_course(id) or public.has_any_connection(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- contact cards: yourself and accepted connections only.
create policy "contact_select" on public.contact_cards for select to authenticated
  using (user_id = auth.uid() or public.is_connected(user_id));
create policy "contact_update_own" on public.contact_cards for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- courses: the catalog is visible to any signed-in student so they can find and join.
create policy "courses_select" on public.courses for select to authenticated using (true);
create policy "courses_insert" on public.courses for insert to authenticated
  with check (created_by = auth.uid());
create policy "courses_update_creator" on public.courses for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- enrollments: see the roster of courses you're in; join or leave for yourself only.
create policy "enrollments_select" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_enrolled(course_id));
create policy "enrollments_insert_self" on public.enrollments for insert to authenticated
  with check (user_id = auth.uid());
create policy "enrollments_delete_self" on public.enrollments for delete to authenticated
  using (user_id = auth.uid());

-- notes: readable by classmates; deletable by their author. Creating and
-- editing notes happens only on the server (service role) after the
-- academic-integrity check passes, so the check can't be skipped by calling
-- the database API directly. See the grants at the bottom of this file.
create policy "notes_select" on public.notes for select to authenticated
  using (public.is_enrolled(course_id));
create policy "notes_delete_author" on public.notes for delete to authenticated
  using (author_id = auth.uid());

-- note reactions
create policy "reactions_select" on public.note_reactions for select to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and public.is_enrolled(n.course_id)));
create policy "reactions_insert" on public.note_reactions for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.notes n where n.id = note_id and public.is_enrolled(n.course_id)));
create policy "reactions_delete" on public.note_reactions for delete to authenticated
  using (user_id = auth.uid());

-- study groups
create policy "groups_select" on public.study_groups for select to authenticated
  using (public.is_enrolled(course_id));
create policy "groups_insert" on public.study_groups for insert to authenticated
  with check (created_by = auth.uid() and public.is_enrolled(course_id));
create policy "groups_update_creator" on public.study_groups for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "groups_delete_creator" on public.study_groups for delete to authenticated
  using (created_by = auth.uid());

-- group members
create policy "members_select" on public.group_members for select to authenticated
  using (public.can_see_group(group_id));
create policy "members_insert_self" on public.group_members for insert to authenticated
  with check (user_id = auth.uid() and public.can_see_group(group_id));
create policy "members_delete_self" on public.group_members for delete to authenticated
  using (user_id = auth.uid());

-- group posts: members only.
create policy "posts_select" on public.group_posts for select to authenticated
  using (public.is_group_member(group_id));
create policy "posts_insert" on public.group_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_group_member(group_id));
create policy "posts_delete_author" on public.group_posts for delete to authenticated
  using (author_id = auth.uid());

-- connections: only the two people involved can see them. You may only
-- send a request to a classmate. Only the recipient may answer it.
create policy "connections_select" on public.connections for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connections_insert" on public.connections for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and public.shares_course(addressee_id));
create policy "connections_update_addressee" on public.connections for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "connections_delete_either" on public.connections for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- The recipient may change only the status columns.
revoke update on public.connections from authenticated;
grant update (status, responded_at) on public.connections to authenticated;

-- AI results are private to the student who asked for them.
create policy "insights_select_own" on public.ai_insights for select to authenticated
  using (user_id = auth.uid());
create policy "insights_insert_own" on public.ai_insights for insert to authenticated
  with check (user_id = auth.uid() and public.is_enrolled(course_id));
create policy "insights_delete_own" on public.ai_insights for delete to authenticated
  using (user_id = auth.uid());

create policy "usage_select_own" on public.ai_usage for select to authenticated
  using (user_id = auth.uid());
create policy "usage_insert_own" on public.ai_usage for insert to authenticated
  with check (user_id = auth.uid());

-- Counters are maintained by triggers; students can't set them directly.
revoke update on public.courses from authenticated;
grant update (code, title, term, instructor, school) on public.courses to authenticated;
revoke insert, update on public.notes from authenticated;
revoke update on public.study_groups from authenticated;
grant update (name, description, meeting_time, location, capacity) on public.study_groups to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, school, major, grad_year, bio, study_styles, availability, last_course_id, last_seen_at)
  on public.profiles to authenticated;

-- Signed-out visitors get nothing from these tables.
revoke all on all tables in schema public from anon;
