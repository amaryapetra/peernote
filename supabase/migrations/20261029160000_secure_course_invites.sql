-- Protect course notes with invite codes enforced by the database.
-- Previous six-digit codes were disclosed by the searchable courses table.
alter table public.courses
  alter column join_code set default upper(encode(gen_random_bytes(6), 'hex'));
update public.courses set join_code = upper(encode(gen_random_bytes(6), 'hex'));
alter table public.courses
  add constraint courses_join_code_format check (join_code ~ '^[0-9A-F]{12}$');

-- Course records include invite codes: keep them visible only to members.
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select to authenticated
  using (public.is_enrolled(id));

-- Remove bypass: no direct enrollment, even when passing a valid user ID.
drop policy if exists enrollments_insert_self on public.enrollments;
revoke insert on table public.enrollments from authenticated;

-- Search only non-sensitive course metadata, without returning join codes.
create function public.search_courses(p_query text, p_limit integer default 20)
returns table (
  id uuid, code text, title text, term text, instructor text,
  school text, members_count integer
)
language plpgsql stable security definer
set search_path = ''
as $$
declare v_query text := trim(left(coalesce(p_query, ''), 60));
begin
  if auth.uid() is null then
    raise exception 'Sign in to search courses' using errcode = '28000';
  end if;
  if length(v_query) = 0 then return; end if;
  return query
    select c.id, c.code, c.title, c.term, c.instructor, c.school, c.members_count
    from public.courses c
    where c.code ilike '%' || v_query || '%'
       or c.title ilike '%' || v_query || '%'
       or c.instructor ilike '%' || v_query || '%'
    order by c.members_count desc, c.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 20);
end;
$$;
revoke all on function public.search_courses(text, integer) from public, anon;
grant execute on function public.search_courses(text, integer) to authenticated;

-- Code comparison and enrollment occur in one database-controlled function.
create function public.join_course_by_code(p_code text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_course uuid;
begin
  if v_user is null then
    raise exception 'Sign in to join courses' using errcode = '28000';
  end if;
  if p_code is null or p_code !~ '^[0-9A-F]{12}$' then
    return null;
  end if;
  select c.id into v_course from public.courses c where c.join_code = p_code;
  if v_course is null then return null; end if;
  insert into public.enrollments (user_id, course_id)
    values (v_user, v_course)
    on conflict do nothing;
  return v_course;
end;
$$;
revoke all on function public.join_course_by_code(text) from public, anon;
grant execute on function public.join_course_by_code(text) to authenticated;

-- Keep RLS helpers available to authenticated policies, not anonymous RPC users.
revoke execute on function
  public.can_see_group(uuid), public.has_any_connection(uuid),
  public.is_connected(uuid), public.is_enrolled(uuid),
  public.is_group_member(uuid), public.shares_course(uuid)
from public, anon;
grant execute on function
  public.can_see_group(uuid), public.has_any_connection(uuid),
  public.is_connected(uuid), public.is_enrolled(uuid),
  public.is_group_member(uuid), public.shares_course(uuid)
to authenticated;

-- Trigger functions never need to be callable as public RPCs.
revoke execute on function
  public.check_group_capacity(), public.enroll_course_creator(),
  public.handle_new_user(), public.join_group_creator(),
  public.leave_course_groups(), public.sync_course_members_count(),
  public.sync_course_notes_count(), public.sync_group_members_count(),
  public.sync_note_helpful_count()
from public, anon, authenticated;

alter function public.touch_updated_at() set search_path = pg_catalog;
