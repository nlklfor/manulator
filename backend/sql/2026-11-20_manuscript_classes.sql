-- Classes of a manuscript page, suggested by the classifier at upload and editable by the user.
-- Run once in the Supabase dashboard (SQL Editor) BEFORE deploying the code that uses them:
-- without these columns, uploading and listing manuscripts fail.
-- All four are optional: empty when the classifier could not tell and the user left them blank.
alter table public.manuscripts
  add column if not exists century text,   -- e.g. "13th century"
  add column if not exists script text,    -- e.g. "Textualis" (CLaMM script classes)
  add column if not exists language text,  -- e.g. "Latin"
  add column if not exists region text;    -- e.g. "Upper Rhine"
