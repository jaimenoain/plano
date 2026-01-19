-- Add availability to notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'new_session', 'group_invitation', 'friend_joined', 'suggest_follow', 'session_reminder', 'group_activity', 'join_request', 'recommendation', 'availability'));

-- Create table to track sent availability notifications to prevent duplicates
CREATE TABLE IF NOT EXISTS public.watchlist_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    film_id UUID REFERENCES public.films(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, film_id, provider_name)
);

-- Ensure profiles has necessary columns (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'country') THEN
        ALTER TABLE public.profiles ADD COLUMN country TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscribed_platforms') THEN
        ALTER TABLE public.profiles ADD COLUMN subscribed_platforms TEXT[];
    END IF;

    -- Ensure notifications has metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;
