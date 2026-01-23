ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recommendation_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notifications_recommendation_id_fkey'
    ) THEN
        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_recommendation_id_fkey
        FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id);
    END IF;
END $$;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'group_invitation', 'recommendation', 'new_session', 'friend_joined', 'suggest_follow', 'session_reminder', 'group_activity', 'join_request', 'visit_request'));
