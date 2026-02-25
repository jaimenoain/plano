ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'new_session', 'group_invitation', 'friend_joined', 'suggest_follow', 'session_reminder', 'group_activity', 'join_request', 'visit_request', 'recommendation', 'architect_verification'));

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS architect_id UUID REFERENCES public.architects(id) ON DELETE SET NULL;
