-- Add verification and soft delete columns to buildings table

ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

ALTER TABLE public.buildings
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
