-- PeerNote initial schema. Run in Supabase SQL Editor on a NEW project.
-- RLS is enabled on every browser-exposed table. Never expose a service-role key.

create extension if not exists pgcrypto;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null check (char_length(btrim(code)) between 2 and 24),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  accent text not null default 'lilac' check (accent in ('lilac','peach','mint','blue')),
  created_at timestamptz not null default now()
);
create unique index if not exists courses_code_unique on public.courses(lower(code));

create table if not exists public.course_members (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(course_id, user_id)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 140),
  content text not null check (char_length(btrim(content)) between 20 and 20000),
  created_at timestamptz not null default now(),
  constraint restricted_assessment_material check (
    (title || ' ' || content) !~* '(exam[[:space:]]+(questions|answers|key)|quiz[[:space:]]+(answers|key)|answer[[:space:]]+key|midterm[[:space:]]+questions|final[[:space:]]+exam[[:space:]]+questions|actual[[:space:]]+test[[:space:]]+questions)'
  )
);
create index if not exists notes_course_date on public.notes(course_id, created_at desc);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 500),
  location text not null default 'TBD' check (char_length(location) <= 120),
  meet_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists groups_course on public.study_groups(course_id);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(group_id, user_id)
);

alter table public.courses enable row level security;
alter table public.course_members enable row level security;
alter table public.notes enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;

revoke all on public.courses, public.course_members, public.notes, public.study_groups, public.group_members from anon, authenticated;
grant select, insert on public.courses to authenticated;
grant select, insert, delete on public.course_members to authenticated;
grant select, insert, delete on public.notes to authenticated;
grant select, insert, delete on public.study_groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;

-- Anyone signed in can find a course; creation requires a signed-in account.
create policy "courses_read" on public.courses for select to authenticated using (true);
create policy "courses_add" on public.courses for insert to authenticated with check (true);

-- Students control their own enrollment, and may view only their own enrollments.
create policy "course_members_read_own" on public.course_members for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "course_members_join_own" on public.course_members for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "course_members_leave_own" on public.course_members for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Course notes are visible only to enrolled course members; ownership required to post/delete.
create policy "notes_read_same_course" on public.notes for select to authenticated
  using (exists (select 1 from public.course_members cm
    where cm.course_id = notes.course_id and cm.user_id = (select auth.uid())));
create policy "notes_add_to_own_course" on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.course_members cm
    where cm.course_id = notes.course_id and cm.user_id = (select auth.uid())));
create policy "notes_delete_own" on public.notes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Only students enrolled in a course can see/create groups for it.
create policy "groups_read_same_course" on public.study_groups for select to authenticated
  using (exists (select 1 from public.course_members cm
    where cm.course_id = study_groups.course_id and cm.user_id = (select auth.uid())));
create policy "groups_add_to_own_course" on public.study_groups for insert to authenticated
  with check (creator_id = (select auth.uid()) and exists (select 1 from public.course_members cm
    where cm.course_id = study_groups.course_id and cm.user_id = (select auth.uid())));
create policy "groups_delete_own" on public.study_groups for delete to authenticated
  using (creator_id = (select auth.uid()));

-- Group membership is visible within a joined course, but users can only join/leave as themselves.
create policy "group_members_read_same_course" on public.group_members for select to authenticated
  using (exists (select 1 from public.study_groups sg join public.course_members cm on cm.course_id = sg.course_id
    where sg.id = group_members.group_id and cm.user_id = (select auth.uid())));
create policy "group_members_add_self" on public.group_members for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.study_groups sg join public.course_members cm on cm.course_id = sg.course_id
    where sg.id = group_members.group_id and cm.user_id = (select auth.uid())));
create policy "group_members_remove_self" on public.group_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Before a real campus launch: add reporting, staff moderation, throttling, university
-- email verification, privacy notices, and automated RLS tests.
-- Keyword checks reduce obvious assessment uploads but cannot reliably detect all restricted materials.
