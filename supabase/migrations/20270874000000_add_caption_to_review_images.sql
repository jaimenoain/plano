alter table public.review_images
  add column if not exists caption text;
