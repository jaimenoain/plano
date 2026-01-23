-- Add is_deleted column to buildings table (Soft Delete)
-- Note: If the database is still using 'films' table, this migration should be adjusted to target 'films'.
ALTER TABLE IF EXISTS public.buildings ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
