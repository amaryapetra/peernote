-- Raise the class materials and notes file limit from 25 MB to 50 MB, the
-- largest single file Supabase Storage accepts on the free plan.
update storage.buckets set file_size_limit = 52428800 where id = 'course-materials';
