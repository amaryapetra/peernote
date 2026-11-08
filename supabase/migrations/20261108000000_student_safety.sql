-- PeerNote pilot safety, notifications, invitations and scheduled study groups.
-- Existing user accounts, course memberships, and files remain unchanged.

-- In-app notifications: only recipients can read/mark their own.
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 kind text not null check (kind in ('new_note','partner_accepted','group_message','moderation')),
 title text not null check (length(title) between 1 and 160),
 body text not null default '' check (length(body) <= 350),
 href text not null check (href ~ '^/[^/]' and length(href) <= 320),
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index notifications_inbox_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;
grant select, update(read_at) on public.notifications to authenticated;
create policy notifications_read_own on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()));

create function public.notify_course_note() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.notifications(user_id, actor_id, kind, title, body, href)
 select e.user_id, new.author_id, 'new_note', 'New notes in your course',
        left(new.title, 180), '/notes/' || new.id::text
 from public.enrollments e where e.course_id = new.course_id and e.user_id <> new.author_id;
 return new;
end;
$$;
create trigger notify_course_note_insert after insert on public.notes
 for each row execute function public.notify_course_note();

create function public.notify_partner_acceptance() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status = 'accepted' and old.status is distinct from 'accepted' then
   insert into public.notifications(user_id, actor_id, kind, title, body, href)
   values (new.requester_id, new.addressee_id, 'partner_accepted', 'Study partner request accepted',
     'A classmate accepted your study partner request.', '/partners');
 end if;
 return new;
end;
$$;
create trigger notify_partner_accept after update of status on public.connections
 for each row execute function public.notify_partner_acceptance();

create function public.notify_group_post() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.notifications(user_id, actor_id, kind, title, body, href)
 select gm.user_id, new.author_id, 'group_message', 'New study group message',
       left(new.body, 180), '/groups/' || new.group_id::text
 from public.group_members gm where gm.group_id = new.group_id and gm.user_id <> new.author_id;
 return new;
end;
$$;
create trigger notify_group_post_insert after insert on public.group_posts
 for each row execute function public.notify_group_post();

-- Student reports and course-owner review queue. No direct client writes.
create table public.course_reports (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 target_type text not null check (target_type in ('note','material','post')),
 target_id uuid not null,
 reason text not null check (reason in ('copyright','exam','harassment','spam','other')),
 details text not null default '' check (length(details) <= 600),
 status text not null default 'open' check (status in ('open','dismissed','removed')),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index course_reports_review_idx on public.course_reports(course_id,status,created_at desc);
create index course_reports_reporter_idx on public.course_reports(reporter_id,created_at desc);
alter table public.course_reports enable row level security;
revoke all on public.course_reports from anon, authenticated;
grant select on public.course_reports to authenticated;
create policy course_reports_own on public.course_reports for select to authenticated
 using (reporter_id = (select auth.uid()));

-- Removing an unauthorized member bans rejoining with an old link/code.
create table public.course_bans (
 course_id uuid not null references public.courses(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 banned_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key (course_id,user_id)
);
create index course_bans_user_idx on public.course_bans(user_id);
alter table public.course_bans enable row level security;
revoke all on public.course_bans from anon, authenticated;

-- Authenticated callers cannot bypass the ban by calling join_course_by_code.
create or replace function public.join_course_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_course uuid;
begin
 if v_user is null then raise exception 'Sign in to join courses' using errcode='28000'; end if;
 if p_code is null or p_code !~ '^[0-9A-F]{12}$' then return null; end if;
 select c.id into v_course from public.courses c where c.join_code = p_code;
 if v_course is null then return null; end if;
 if exists(select 1 from public.course_bans b where b.course_id=v_course and b.user_id=v_user)
   then raise exception 'You do not have permission to rejoin this course' using errcode='42501'; end if;
 insert into public.enrollments(user_id, course_id) values(v_user,v_course) on conflict do nothing;
 return v_course;
end;
$$;
revoke all on function public.join_course_by_code(text) from public, anon;
grant execute on function public.join_course_by_code(text) to authenticated;

create function public.rotate_course_invite(p_course uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.courses where id=p_course and created_by=auth.uid())
 then raise exception 'Only the course creator can rotate its invite' using errcode='42501'; end if;
 v_code := upper(left(replace(gen_random_uuid()::text,'-',''),12));
 update public.courses set join_code=v_code where id=p_course;
 return v_code;
end;
$$;
revoke all on function public.rotate_course_invite(uuid) from public,anon;
grant execute on function public.rotate_course_invite(uuid) to authenticated;

-- Single transaction: only verified course owner can ban and remove another member.
create function public.moderate_course_member(p_course uuid, p_member uuid, p_actor uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.courses c
                where c.id=p_course and c.created_by=p_actor and c.created_by <> p_member) then
   raise exception 'Not authorized to remove member' using errcode='42501';
 end if;
 insert into public.course_bans(course_id,user_id,banned_by)
 values(p_course,p_member,p_actor) on conflict (course_id,user_id) do nothing;
 delete from public.enrollments where course_id=p_course and user_id=p_member;
 return true;
end;
$$;
revoke all on function public.moderate_course_member(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.moderate_course_member(uuid,uuid,uuid) to service_role;

-- Prevent race / alternate inserts into enrollments after a course ban.
create function public.reject_banned_course_enrollment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if exists(select 1 from public.course_bans
   where user_id=new.user_id and course_id=new.course_id) then
   raise exception 'User cannot rejoin this course' using errcode='42501';
 end if;
 return new;
end;
$$;
create trigger reject_banned_course_enrollment before insert on public.enrollments
 for each row execute function public.reject_banned_course_enrollment();

-- Signed-in upload reservation: cap at 12 attempts per rolling 24 hours/user.
create table public.material_upload_reservations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 course_id uuid not null references public.courses(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index material_upload_reservations_user_idx
 on public.material_upload_reservations(user_id,created_at desc);
alter table public.material_upload_reservations enable row level security;
revoke all on public.material_upload_reservations from anon,authenticated;
create function public.reserve_material_upload(p_course uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid(); v_count integer;
begin
 if v_user is null or not public.is_enrolled(p_course) then
   raise exception 'Join course first' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('upload:'||v_user::text,0));
 select count(*) into v_count from public.material_upload_reservations
  where user_id=v_user and created_at>=now()-interval '24 hours';
 if v_count >= 12 then return false; end if;
 insert into public.material_upload_reservations(user_id,course_id) values(v_user,p_course);
 return true;
end;
$$;
revoke all on function public.reserve_material_upload(uuid) from public,anon;
grant execute on function public.reserve_material_upload(uuid) to authenticated;

-- Structured meeting times and RSVPs; legacy free-text meeting_time retained.
alter table public.study_groups
 add column meeting_starts_at timestamptz,
 add column meeting_ends_at timestamptz,
 add constraint valid_group_meeting_window check (
   (meeting_starts_at is null and meeting_ends_at is null)
   or (meeting_starts_at is not null and meeting_ends_at > meeting_starts_at
       and meeting_ends_at <= meeting_starts_at + interval '8 hours')
 );
create index study_groups_meeting_idx on public.study_groups(course_id,meeting_starts_at);

create table public.group_rsvps (
 group_id uuid not null references public.study_groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null check (status in ('going','maybe','not_going')),
 updated_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create index group_rsvps_user_idx on public.group_rsvps(user_id);
alter table public.group_rsvps enable row level security;
revoke all on public.group_rsvps from anon,authenticated;
grant select,insert,update(status,updated_at),delete on public.group_rsvps to authenticated;
create policy rsvps_read_members on public.group_rsvps for select to authenticated
 using (public.is_group_member(group_id));
create policy rsvps_insert_self on public.group_rsvps for insert to authenticated
 with check (user_id=(select auth.uid()) and public.is_group_member(group_id));
create policy rsvps_update_self on public.group_rsvps for update to authenticated
 using (user_id=(select auth.uid()) and public.is_group_member(group_id))
 with check (user_id=(select auth.uid()) and public.is_group_member(group_id));
create policy rsvps_delete_self on public.group_rsvps for delete to authenticated
 using (user_id=(select auth.uid()));

-- Trigger functions aren't callable as RPCs.
revoke execute on function
 public.notify_course_note(), public.notify_partner_acceptance(),
 public.notify_group_post(), public.reject_banned_course_enrollment()
from public,anon,authenticated;
