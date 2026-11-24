-- Saved translation and summary of a page, and the new statuses "translated" and "summarized".
-- Run once in the Supabase dashboard (SQL Editor) BEFORE deploying the code that uses them:
-- without these columns, listing, translating and summarizing manuscripts fail.

-- translation: {"type": "full" | "sentences" | "lines", "lines": [{"index": 0, "text": "..."}]}
-- summary: a short English summary of the translation
-- Both are empty until the page is translated / summarized, and cleared when it is transcribed again.
alter table public.manuscript_files
  add column if not exists translation jsonb,
  add column if not exists summary text;

grant update (translation, summary) on table public.manuscript_files to service_role;

-- Replace the checks on status and content_type (whatever their names are) with wider ones
do $$
declare
  old_check record;
begin
  for old_check in
    select conname from pg_constraint
    where conrelid = 'public.manuscript_files'::regclass
      and contype = 'c'
      and (pg_get_constraintdef(oid) ilike '%status%' or pg_get_constraintdef(oid) ilike '%content_type%')
  loop
    execute format('alter table public.manuscript_files drop constraint %I', old_check.conname);
  end loop;
end $$;

-- uploading → uploaded → transcribing → transcribed → corrected → translating → translated
-- → summarizing → summarized. The backend only stores the finished steps; "…ing" is shown
-- by the frontend while a step runs.
alter table public.manuscript_files
  add constraint manuscript_files_status_check check (status in (
    'uploading', 'uploaded', 'transcribing', 'transcribed', 'corrected',
    'translating', 'translated', 'summarizing', 'summarized'
  ));

-- Images that browsers cannot show (e.g. TIFF) are stored as PNG, and a PDF as the PNG
-- of its first page, so only these types are stored
alter table public.manuscript_files
  add constraint manuscript_files_content_type_check check (content_type in (
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf'
  ));

notify pgrst, 'reload schema';
