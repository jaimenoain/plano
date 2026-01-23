ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
