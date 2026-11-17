-- Let authenticated students search by a full invite code in the same
-- Find a course search used for names, course codes, and instructors.
-- A code must match exactly. Do not expose course join_code to search clients.
create or replace function public.search_courses(p_query text, p_limit integer default 20)
returns table (
  id uuid, code text, title text, term text, instructor text,
  school text, members_count integer
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_query text := trim(left(coalesce(p_query, ''), 60));
begin
  if auth.uid() is null then
    raise exception 'Sign in to search courses' using errcode = '28000';
  end if;
  if length(v_query) = 0 then return; end if;

  -- Only complete 12-character hexadecimal codes use the private-code path.
  -- Searching by partial code must not reveal any private invitation details.
  if v_query ~ '^[0-9A-Fa-f]{12}$' then
    return query
      select c.id, c.code, c.title, c.term, c.instructor, c.school, c.members_count
      from public.courses c
      where c.join_code = upper(v_query)
      limit least(greatest(coalesce(p_limit, 20), 1), 20);
  else
    return query
      select c.id, c.code, c.title, c.term, c.instructor, c.school, c.members_count
      from public.courses c
      where c.code ilike '%' || v_query || '%'
         or c.title ilike '%' || v_query || '%'
         or c.instructor ilike '%' || v_query || '%'
      order by c.members_count desc, c.created_at desc
      limit least(greatest(coalesce(p_limit, 20), 1), 20);
  end if;
end;
$$;

revoke all on function public.search_courses(text, integer) from public, anon;
grant execute on function public.search_courses(text, integer) to authenticated;
