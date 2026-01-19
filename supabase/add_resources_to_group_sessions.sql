ALTER TABLE public.group_sessions
ADD COLUMN IF NOT EXISTS resources jsonb DEFAULT '[]'::jsonb;
