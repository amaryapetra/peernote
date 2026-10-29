-- Class materials can be any file type (documents, spreadsheets, images,
-- audio, code...), not just PDF and PowerPoint. file_type now holds the
-- file's lowercase extension, or 'file' when it has none.
alter table public.course_materials drop constraint if exists course_materials_file_type_check;
alter table public.course_materials add constraint course_materials_file_type_check
  check (file_type ~ '^[a-z0-9]{1,16}$');

-- Uploads go through the server, which blocks executables and stores only
-- PDFs and images with a type browsers will display; everything else is saved
-- as application/octet-stream and always downloaded. So the bucket no longer
-- needs its own type list.
update storage.buckets set allowed_mime_types = null where id = 'course-materials';
