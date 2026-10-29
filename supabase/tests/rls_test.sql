-- Row level security tests for supabase/migrations.
-- Run with scripts/test-db.sh (needs a local Postgres). Each check prints
-- "ok: ..."; any failure stops the script with "FAIL".
\set ON_ERROR_STOP 1
-- Users
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@tulane.edu','{"full_name":"Amelia A"}'),
 ('00000000-0000-0000-0000-00000000000b','b@tulane.edu','{"full_name":"Ben B"}'),
 ('00000000-0000-0000-0000-00000000000c','c@tulane.edu','{"full_name":"Cara C"}');

create or replace function pg_temp.act(u text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role','authenticated')::text, false);
  execute 'set role authenticated';
end $$;
create or replace function pg_temp.check(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok: %', label;
end $$;
-- Run sql, expect an error
create or replace function pg_temp.expect_fail(q text, label text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise notice 'ok (blocked: %): %', sqlerrm, label;
    return;
  end;
  raise exception 'FAIL (should have been blocked): %', label;
end $$;

select pg_temp.check((select count(*) from profiles) = 3, 'signup trigger creates profiles');
select pg_temp.check((select full_name from profiles where id='00000000-0000-0000-0000-00000000000a') = 'Amelia A', 'full_name copied from metadata');
select pg_temp.check((select count(*) from contact_cards) = 3, 'signup trigger creates contact cards');

-- A creates a course
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
insert into courses (id, code, title, term, instructor, created_by, join_code)
  values ('10000000-0000-0000-0000-000000000001','MATH 3090','Linear Algebra','Fall 2026','Prof. Lee','00000000-0000-0000-0000-00000000000a','ABCDEF123456');
select pg_temp.check((select members_count from courses where id='10000000-0000-0000-0000-000000000001') = 1, 'creator auto-enrolled, count=1');
select pg_temp.expect_fail($q$insert into courses (code,title,term,created_by) values ('X 1','Fake course','Fall 2026','00000000-0000-0000-0000-00000000000b')$q$, 'cannot create course as someone else');
select pg_temp.expect_fail($q$update courses set members_count = 999$q$, 'cannot edit counters');
select pg_temp.expect_fail($q$insert into notes (course_id, author_id, title, lecture_date, content) values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','Direct','2026-10-01','this is long enough content for a note')$q$, 'students cannot insert notes directly (server-only)');
reset role;

-- Server (service role) inserts a note for A
set role service_role;
insert into notes (id, course_id, author_id, title, lecture_date, topic, content) values
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a',
  'Eigenvalues intro','2026-10-01','Eigenvalues','An eigenvector v of matrix A satisfies Av = lambda v. The characteristic polynomial det(A - lambda I) = 0 gives eigenvalues.');
reset role;
select pg_temp.check((select notes_count from courses where id='10000000-0000-0000-0000-000000000001') = 1, 'notes_count trigger');

-- B is not enrolled
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from courses) = 0, 'course rows and invite codes hidden from non-members');
select pg_temp.check((select count(*) from search_courses('MATH',20)) = 1, 'search finds course without leaking its invite code');
select pg_temp.check((select count(*) from search_courses('DOESNOTEXIST',20)) = 0, 'search respects query');
select pg_temp.expect_fail($q$select join_code from search_courses('MATH',20)$q$, 'catalog RPC never returns join codes');
select pg_temp.check((select count(*) from notes) = 0, 'non-member cannot read notes');
select pg_temp.check((select count(*) from profiles where id <> auth.uid()) = 0, 'non-classmate profiles hidden');
select pg_temp.expect_fail($q$insert into connections (requester_id, addressee_id) values ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a')$q$, 'cannot request non-classmate');
select pg_temp.expect_fail($q$insert into enrollments (user_id, course_id) values ('00000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000001')$q$, 'cannot enroll someone else');
select pg_temp.expect_fail($q$insert into enrollments (user_id, course_id) values (auth.uid(),'10000000-0000-0000-0000-000000000001')$q$, 'cannot self-enroll without a code');
select pg_temp.check(public.join_course_by_code('ABCDEF000000') is null, 'wrong code rejected');
select pg_temp.check((select count(*) from notes) = 0, 'wrong code cannot expose notes');
select pg_temp.check(public.join_course_by_code('ABCDEF123456') = '10000000-0000-0000-0000-000000000001'::uuid, 'valid code grants enrollment');
select pg_temp.check((select count(*) from notes) = 1, 'member can read notes');
select pg_temp.check((select count(*) from profiles) = 2, 'classmate profile visible');
select pg_temp.check((select count(*) from contact_cards) = 1, 'classmate contact hidden before connecting');
insert into note_reactions (note_id, user_id) values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select helpful_count from notes) = 1, 'helpful count trigger');
with d as (delete from notes returning 1) select pg_temp.check((select count(*) from d) = 0, 'cannot delete others notes');
reset role;
select pg_temp.check((select count(*) from notes) = 1, 'note still exists');

-- Connections: B -> A
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
insert into connections (id, requester_id, addressee_id, course_id, message) values
 ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','Study for the midterm?');
with u as (update connections set status='accepted' returning 1) select pg_temp.check((select count(*) from u) = 0, 'requester cannot accept own request');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_fail($q$insert into connections (requester_id, addressee_id) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b')$q$, 'no duplicate connection in the other direction');
select pg_temp.expect_fail($q$update connections set requester_id = auth.uid()$q$, 'cannot rewrite requester (column grant)');
update connections set status='accepted', responded_at=now() where id='30000000-0000-0000-0000-000000000001';
select pg_temp.check((select count(*) from contact_cards) = 2, 'contact visible after accept');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from connections) = 0, 'outsider cannot see connections');
select pg_temp.check((select count(*) from contact_cards) = 1, 'outsider sees only own contact');
reset role;

-- Study groups with capacity 2
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
insert into study_groups (id, course_id, name, capacity, created_by) values
 ('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Midterm crew',2,'00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select members_count from study_groups) = 1, 'group creator auto-joined');
insert into group_posts (group_id, author_id, body) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','Library 3rd floor at 7?');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from study_groups) = 0, 'non-member cannot see groups');
select pg_temp.expect_fail($q$insert into group_members (group_id, user_id) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c')$q$, 'cannot join group of course you are not in');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from group_posts) = 0, 'enrolled non-member cannot read group posts');
insert into group_members (group_id, user_id) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from group_posts) = 1, 'member reads group posts');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
select pg_temp.check(public.join_course_by_code('ABCDEF123456') = '10000000-0000-0000-0000-000000000001'::uuid, 'second classmate joins with invite code');
select pg_temp.check((select count(*) from study_groups) = 1, 'member sees groups after joining course');
select pg_temp.expect_fail($q$insert into group_members (group_id, user_id) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c')$q$, 'group full');
select pg_temp.check((select count(*) from contact_cards) = 1, 'classmate still cannot see contacts without connection');
select pg_temp.check((select count(*) from search_course_notes('10000000-0000-0000-0000-000000000001','what is an eigenvalue', 5)) = 1, 'search finds note');
select pg_temp.check((select count(*) from search_course_notes('10000000-0000-0000-0000-000000000001','zebra', 5)) = 0, 'search no false match');
select pg_temp.check((select count(*) from search_course_notes('10000000-0000-0000-0000-000000000001','', 5)) = 0, 'empty search safe');
select pg_temp.check((select count(*) from ai_insights) = 0, 'no insights yet');
insert into ai_insights (user_id, course_id, kind, content) values ('00000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000001','ask','{}');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from ai_insights) = 0, 'insights private');
reset role;

-- B leaves the course => removed from group, counts updated
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
delete from enrollments where user_id = auth.uid();
reset role;
select pg_temp.check((select members_count from study_groups) = 1, 'leaving course leaves groups');
select pg_temp.check((select members_count from courses) = 2, 'course members_count after leave');

-- anon gets nothing
set role anon;
select pg_temp.expect_fail($q$select * from courses$q$, 'anon blocked');
reset role;
-- AI quota: reservations must be atomic and may not be inserted directly.
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_fail($q$insert into ai_usage (user_id, kind) values (auth.uid(), 'ask')$q$,
  'cannot bypass quota with direct insert');
select pg_temp.check(public.consume_ai_quota('ask'), 'first AI request allowed');
do $quota_test$
declare i int;
begin
  for i in 2..30 loop
    if not public.consume_ai_quota('ask') then
      raise exception 'FAIL: quota rejected valid request %', i;
    end if;
  end loop;
end $quota_test$;
select pg_temp.check(not public.consume_ai_quota('ask'), '31st AI request rejected');
select pg_temp.check((select count(*) from ai_usage where user_id = auth.uid() and kind = 'ask') = 30,
  'quota never writes more than 30 reservations');
select pg_temp.expect_fail($q$select public.consume_ai_quota('invalid')$q$, 'unknown AI usage kind rejected');
reset role;

-- Function hardening must not break RLS helpers or database triggers.
select pg_temp.check(not has_function_privilege('anon', 'public.is_enrolled(uuid)', 'EXECUTE'), 'anonymous cannot execute RLS helper');
select pg_temp.check(has_function_privilege('authenticated', 'public.is_enrolled(uuid)', 'EXECUTE'), 'RLS helper remains callable by members');
select pg_temp.check(not has_function_privilege('anon', 'public.join_course_by_code(text)', 'EXECUTE'), 'anonymous cannot join through RPC');
select pg_temp.check(not has_function_privilege('authenticated', 'public.enroll_course_creator()', 'EXECUTE'), 'trigger function is not a public RPC');
select pg_temp.check((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='touch_updated_at' and 'search_path=pg_catalog' = any(p.proconfig)) = 1, 'timestamp trigger search path fixed');

-- Course materials: metadata, private storage, and sharing restrictions.
set role service_role;
insert into course_materials (
  id, course_id, uploaded_by, title, lecture_date, source_type,
  file_type, file_name, storage_path, ai_allowed, extracted_text
) values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-00000000000a',
  'Authorized lecture slides', '2026-10-01', 'file',
  'pdf', 'lecture.pdf', '10000000-0000-0000-0000-000000000001/a/lecture.pdf', true,
  'These slides explain eigenvectors.'
);
insert into storage.objects(bucket_id, name) values
('course-materials', '10000000-0000-0000-0000-000000000001/a/lecture.pdf');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from course_materials) = 1, 'course member reads materials');
select pg_temp.check((select count(*) from storage.objects where bucket_id='course-materials') = 1, 'course member reads private slide');
select pg_temp.expect_fail($q$insert into course_materials(course_id,uploaded_by,title,lecture_date,source_type,link_url) values
('10000000-0000-0000-0000-000000000001', auth.uid(), 'Direct link','2026-10-01','link','https://example.com')$q$, 'cannot bypass permission acknowledgement');
select pg_temp.expect_fail($q$insert into storage.objects(bucket_id,name) values ('course-materials','fake')$q$, 'clients cannot upload storage objects directly');
select pg_temp.expect_fail($q$update course_materials set file_type = 'docx'$q$, 'clients cannot change material rows');
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from course_materials) = 0, 'former course member cannot read material rows');
select pg_temp.check((select count(*) from storage.objects where bucket_id='course-materials') = 0, 'former course member cannot read private slides');
reset role;
set role anon;
select pg_temp.expect_fail($q$select * from course_materials$q$, 'anonymous materials blocked');
reset role;
-- Any file extension is allowed, but it must be a plain lowercase extension.
set role service_role;
insert into course_materials (course_id, uploaded_by, title, lecture_date, source_type, file_type, file_name, storage_path)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Reading list', '2026-10-02', 'file',
  'docx', 'reading.docx', '10000000-0000-0000-0000-000000000001/a/reading.docx');
select pg_temp.check(true, 'materials accept any file extension');
select pg_temp.expect_fail($q$insert into course_materials (course_id, uploaded_by, title, lecture_date, source_type, file_type, file_name, storage_path)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Bad type', '2026-10-02', 'file',
  '../x', 'x', '10000000-0000-0000-0000-000000000001/a/x')$q$, 'file type must be a plain extension');
reset role;

-- Authentication signup restriction: valid university emails only.
select pg_temp.expect_fail($q$insert into auth.users (id,email) values ('a0000000-0000-0000-0000-000000000001','outsider@gmail.com')$q$, 'reject non-Tulane signup');
select pg_temp.expect_fail($q$insert into auth.users (id,email) values ('a0000000-0000-0000-0000-000000000002','student@tulane.edu.evil.com')$q$, 'reject misleading Tulane suffix');
select pg_temp.expect_fail($q$insert into auth.users (id,email) values ('a0000000-0000-0000-0000-000000000003',null)$q$, 'reject account without email');
insert into auth.users (id,email) values ('a0000000-0000-0000-0000-000000000004','student@tulane.edu');
select pg_temp.check((select count(*) from auth.users where id='a0000000-0000-0000-0000-000000000004') = 1, 'allow Tulane signup');
select pg_temp.check((select count(*) from auth.users where email='a@tulane.edu') = 1, 'existing accounts preserved');

\echo ALL_RLS_TESTS_PASSED
