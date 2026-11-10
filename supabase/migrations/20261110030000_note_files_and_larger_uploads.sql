-- Note files, larger uploads, and optional lecture dates for class materials.
-- 1. Students can share a PDF, photo, or document of their notes. It's stored
--    like a class material, tagged kind = 'notes', and shown on the Notes tab.
-- 2. Class materials no longer need a lecture date (note files still do).
-- 3. Files can be up to 25 MB. Browsers upload straight to storage through a
--    one-time signed link; the server checks each file before it's shared.

alter table public.course_materials
  add column kind text not null default 'material' check (kind in ('material', 'notes'));
alter table public.course_materials alter column lecture_date drop not null;
alter table public.course_materials add constraint course_materials_notes_check
  check (kind = 'material' or (source_type = 'file' and lecture_date is not null));

drop index if exists public.course_materials_course_date_idx;
create index course_materials_course_date_idx
  on public.course_materials(course_id, kind, lecture_date desc nulls last, created_at desc);

update storage.buckets set file_size_limit = 26214400 where id = 'course-materials';

-- Classmates get the same "new notes" alert for a notes file as for typed notes.
create function public.notify_course_note_file() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'notes' then
    insert into public.notifications(user_id, actor_id, kind, title, body, href)
    select e.user_id, new.uploaded_by, 'new_note', 'New notes in your course',
           left(new.title, 180), '/courses/' || new.course_id::text || '#file-' || new.id::text
    from public.enrollments e where e.course_id = new.course_id and e.user_id <> new.uploaded_by;
  end if;
  return new;
end;
$$;
revoke execute on function public.notify_course_note_file() from public, anon, authenticated;
create trigger notify_course_note_file_insert after insert on public.course_materials
  for each row execute function public.notify_course_note_file();
