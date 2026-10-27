-- Atomically enforce per-user AI quotas, even under concurrent requests.
-- Run after the initial schema; do not replace the previous migration.

create or replace function public.consume_ai_quota(p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_limit integer;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_limit := case p_kind
    when 'integrity' then 40
    when 'gap_fill' then 15
    when 'catch_up' then 15
    when 'ask' then 30
    when 'transcribe' then 15
    else null
  end;
  if v_limit is null then
    raise exception 'Invalid AI usage kind' using errcode = '22023';
  end if;

  -- Serialize concurrent reservations for the same account/feature.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_kind, 0));

  select count(*) into v_count
    from public.ai_usage
   where user_id = v_user
     and kind = p_kind
     and created_at >= now() - interval '1 hour';

  if v_count >= v_limit then
    return false;
  end if;

  insert into public.ai_usage (user_id, kind) values (v_user, p_kind);
  return true;
end;
$$;

-- Only authenticated users can reserve usage; no direct inserts that bypass caps.
revoke all on function public.consume_ai_quota(text) from public;
revoke all on function public.consume_ai_quota(text) from anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
revoke insert on public.ai_usage from authenticated;
