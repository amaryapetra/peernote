-- Course video calls are back. Each course's call link is a random room ID that
-- only enrolled members can read. A Jitsi link can't check membership itself,
-- so the course creator gets a fresh room whenever they remove a student or
-- reset the invite; anyone holding the old link lands in an empty room.

-- Courses created before the video room migration ran.
insert into public.course_video_rooms (course_id)
select id from public.courses on conflict (course_id) do nothing;

create or replace function public.rotate_course_invite(p_course uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
 if auth.uid() is null or not exists(
  select 1 from public.courses where id=p_course and created_by=auth.uid())
 then raise exception 'Only the course creator can rotate its invite' using errcode='42501'; end if;
 v_code := upper(left(replace(gen_random_uuid()::text,'-',''),12));
 update public.courses set join_code=v_code where id=p_course;
 update public.course_video_rooms set room_id=gen_random_uuid() where course_id=p_course;
 return v_code;
end;
$$;

create or replace function public.moderate_course_member(p_course uuid, p_member uuid, p_actor uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.courses c
                where c.id=p_course and c.created_by=p_actor and c.created_by <> p_member) then
   raise exception 'Not authorized to remove member' using errcode='42501';
 end if;
 insert into public.course_bans(course_id,user_id,banned_by)
 values(p_course,p_member,p_actor) on conflict (course_id,user_id) do nothing;
 delete from public.enrollments where course_id=p_course and user_id=p_member;
 update public.course_video_rooms set room_id=gen_random_uuid() where course_id=p_course;
 return true;
end;
$$;
