-- 20270877000000_awards_discovery.sql rebuilt notifications_type_check without
-- the ambassador types added in 20270870100000_ambassador_applications.sql and
-- ambassador_membership_review added in 20270870500000_ambassador_phase6_location_review.sql.
-- Restore the full set.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'follow',
    'like',
    'comment',
    'recommendation',
    'friend_joined',
    'suggest_follow',
    'visit_request',
    'architect_verification',
    'ambassador_application_received',
    'ambassador_application_approved',
    'ambassador_application_rejected',
    'ambassador_membership_review',
    'award_win'
  ));
