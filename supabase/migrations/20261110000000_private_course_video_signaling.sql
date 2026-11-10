-- Every PeerNote WebRTC room has one private realtime channel, accessible only
-- to current course members. Media flows over WebRTC, not through Supabase.
-- The topic uses the existing private room UUID stored in course_video_rooms.
-- Do not add broad realtime policies that override these checks.
create policy "Course members receive video signaling"
on realtime.messages for select to authenticated
using (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.course_video_rooms room
    where (select realtime.topic()) = 'course-video:' || room.room_id::text
      and public.is_enrolled(room.course_id)
  )
);

create policy "Course members send video signaling"
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast', 'presence')
  and exists (
    select 1 from public.course_video_rooms room
    where (select realtime.topic()) = 'course-video:' || room.room_id::text
      and public.is_enrolled(room.course_id)
  )
);
