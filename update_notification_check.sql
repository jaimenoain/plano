-- Update the check constraint for notifications.type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'like', 'comment', 'new_session', 'group_invitation', 'friend_joined', 'suggest_follow', 'session_reminder', 'group_activity', 'join_request'));
