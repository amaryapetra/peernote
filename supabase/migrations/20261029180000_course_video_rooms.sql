-- Supabase stores each course's stable video room identifier.
-- Media is delivered by Jitsi Meet; Supabase does not carry video or audio.
create table public.course_video_rooms (
  course_id uuid primary key references public.courses(id) on delete cascade,
  room_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
insert into public.course_video_rooms (course_id)
select id from public.courses on conflict (course_id) do nothing;
create or replace function public.create_course_video_room()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.course_video_rooms (course_id) values (new.id)
  on conflict (course_id) do nothing;
  return new;
end;
$$;
create trigger course_video_room_on_course_create
after insert on public.courses
for each row execute function public.create_course_video_room();
alter table public.course_video_rooms enable row level security;
create policy "Enrolled members can see video room"
on public.course_video_rooms for select to authenticated
using (public.is_enrolled(course_id));
revoke all on public.course_video_rooms from anon;
grant select on public.course_video_rooms to authenticated;
