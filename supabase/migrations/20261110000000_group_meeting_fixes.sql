-- Study group meeting fixes.
-- 1. Organizers could not set or change a meeting time: the meeting columns
--    added in 20261108000000 were never granted to signed-in students.
-- 2. Leaving a group (or being removed from its course) kept the student's
--    RSVP, so they still got meeting reminders.

grant update (meeting_starts_at, meeting_ends_at) on public.study_groups to authenticated;

-- Clear any RSVPs left behind by students who already left their group.
delete from public.group_rsvps r
where not exists (
  select 1 from public.group_members gm where gm.group_id = r.group_id and gm.user_id = r.user_id
);

create function public.clear_rsvp_on_group_leave()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.group_rsvps where group_id = old.group_id and user_id = old.user_id;
  return null;
end;
$$;
revoke execute on function public.clear_rsvp_on_group_leave() from public, anon, authenticated;

create trigger group_members_clear_rsvp after delete on public.group_members
  for each row execute function public.clear_rsvp_on_group_leave();

-- Only remind students who are still in the group.
create or replace function public.enqueue_group_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
 with candidate as (
   select g.id as group_id, r.user_id, g.meeting_starts_at,
    case
     when g.meeting_starts_at between now()+interval '23 hours 45 minutes' and now()+interval '24 hours 15 minutes'
       then '24h'
     when g.meeting_starts_at between now()+interval '45 minutes' and now()+interval '75 minutes'
       then '1h'
    end as window_label
   from public.study_groups g
   join public.group_rsvps r on r.group_id=g.id
   join public.group_members gm on gm.group_id=r.group_id and gm.user_id=r.user_id
   where g.meeting_starts_at is not null and r.status in ('going','maybe')
    and (
      g.meeting_starts_at between now()+interval '23 hours 45 minutes' and now()+interval '24 hours 15 minutes'
      or g.meeting_starts_at between now()+interval '45 minutes' and now()+interval '75 minutes'
    )
 ), delivery as (
   insert into public.group_reminder_deliveries(group_id,user_id,meeting_starts_at,window_label)
   select group_id,user_id,meeting_starts_at,window_label from candidate
   on conflict do nothing
   returning group_id,user_id,meeting_starts_at,window_label
 )
 insert into public.notifications(user_id,kind,title,body,href)
 select d.user_id,'meeting_reminder',
  case when d.window_label='24h' then 'Study group meets tomorrow' else 'Study group starts soon' end,
  left(g.name,280), '/groups/'||d.group_id::text
 from delivery d join public.study_groups g on g.id=d.group_id;
 get diagnostics v_count=row_count;
 delete from public.group_reminder_deliveries where created_at<now()-interval '90 days';
 return v_count;
end;
$$;
revoke execute on function public.enqueue_group_reminders() from public,anon,authenticated;
grant execute on function public.enqueue_group_reminders() to service_role;
