-- In-app reminders for people who RSVP to a scheduled study group.
-- The reminder generator works without cron; Supabase pg_cron schedules it
-- automatically when available. Its activation is verified during rollout.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
 check (kind in ('new_note','partner_accepted','group_message','moderation','meeting_reminder'));

create table public.group_reminder_deliveries (
 group_id uuid not null references public.study_groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 meeting_starts_at timestamptz not null,
 window_label text not null check(window_label in ('24h','1h')),
 created_at timestamptz not null default now(),
 primary key(group_id,user_id,meeting_starts_at,window_label)
);
alter table public.group_reminder_deliveries enable row level security;
revoke all on public.group_reminder_deliveries from anon,authenticated;

create function public.enqueue_group_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
 with candidate as (
   select g.id as group_id, r.user_id, g.meeting_starts_at, g.name,
    case
     when g.meeting_starts_at between now()+interval '23 hours 45 minutes' and now()+interval '24 hours 15 minutes'
       then '24h'
     when g.meeting_starts_at between now()+interval '45 minutes' and now()+interval '75 minutes'
       then '1h'
    end as window_label
   from public.study_groups g
   join public.group_rsvps r on r.group_id=g.id
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

-- CI's minimal PostgreSQL doesn't ship pg_cron; the function remains testable.
-- On Supabase, install/schedule when extension is supported and available.
do $$
begin
 if exists (select 1 from pg_available_extensions where name='pg_cron') then
   execute 'create extension if not exists pg_cron';
   if exists(select 1 from pg_extension where extname='pg_cron') then
     execute 'select cron.schedule(''peernote-group-reminders'',''*/15 * * * *'',''select public.enqueue_group_reminders()'')';
   end if;
 end if;
exception when others then
 raise notice 'Supabase Cron not enabled automatically: %',sqlerrm;
end $$;
