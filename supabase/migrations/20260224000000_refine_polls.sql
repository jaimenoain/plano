
-- Create bucket
insert into storage.buckets (id, name, public)
values ('poll_images', 'poll_images', true)
on conflict (id) do nothing;

create policy "Poll images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'poll_images' );

create policy "Authenticated users can upload poll images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'poll_images' );

create policy "Authenticated users can update poll images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'poll_images' );

create policy "Authenticated users can delete poll images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'poll_images' );

-- Columns
ALTER TABLE poll_questions
ADD COLUMN IF NOT EXISTS response_type text NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_type text,
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_data jsonb;

ALTER TABLE poll_options
ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS tmdb_id integer;
