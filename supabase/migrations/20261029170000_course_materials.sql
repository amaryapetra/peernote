-- Course materials are course-private and separate from student notes.
-- Uploaded documents require permission from the person sharing them.
create table public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  description text not null default '' check (char_length(description) <= 600),
  lecture_date date not null,
  source_type text not null check (source_type in ('file', 'link')),
  file_type text check (file_type in ('pdf', 'pptx')),
  file_name text check (char_length(file_name) between 1 and 180),
  storage_path text unique,
  link_url text,
  ai_allowed boolean not null default false,
  extracted_text text not null default '',
  sharing_confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint material_source_check check (
    (source_type = 'file' and file_type is not null and file_name is not null
      and storage_path is not null and link_url is null)
    or
    (source_type = 'link' and file_type is null and file_name is null
      and storage_path is null and link_url ~ '^https://[^[:space:]]+$'
      and not ai_allowed and extracted_text = '')
  )
);
create index course_materials_course_date_idx
  on public.course_materials(course_id, lecture_date desc, created_at desc);
alter table public.course_materials enable row level security;
create policy materials_read_members on public.course_materials for select to authenticated
  using (public.is_enrolled(course_id));
-- Writes are performed by server-side code after verifying course membership
-- and a sharing-permission acknowledgement. Never grant client write access.
revoke all on table public.course_materials from anon;
revoke insert, update, delete on table public.course_materials from authenticated;
grant select on table public.course_materials to authenticated;

-- Uploaded files remain private; no client-side writes are possible.
-- The server uploads using a service-role key after checking the user,
-- and reads are restricted by Supabase Storage's RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  4194304,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
on conflict (id) do nothing;

create policy "course_materials_member_read"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'course-materials'
    and exists (
      select 1 from public.course_materials m
      where m.storage_path = storage.objects.name
        and public.is_enrolled(m.course_id)
    )
  );
