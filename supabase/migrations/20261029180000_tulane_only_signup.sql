-- Enforce Tulane-only new registrations at the authentication database
-- boundary, including direct calls to Supabase Auth. Existing accounts stay
-- untouched; this BEFORE INSERT trigger applies only to future users.
--
-- This is also a fallback for projects where the Before User Created Auth Hook
-- is not configured. Confirmation emails remain required for email ownership.
create or replace function public.enforce_tulane_signup_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or lower(btrim(new.email)) !~ '^[^@[:space:]]+@tulane[.]edu$' then
    raise exception 'A valid @tulane.edu email is required to sign up.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_tulane_signup_email() from public, anon, authenticated;
drop trigger if exists enforce_tulane_signup_email_on_create on auth.users;
create trigger enforce_tulane_signup_email_on_create
before insert on auth.users
for each row execute function public.enforce_tulane_signup_email();
