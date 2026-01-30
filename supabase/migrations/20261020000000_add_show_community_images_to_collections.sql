ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS show_community_images BOOLEAN NOT NULL DEFAULT true;
