-- Add the `collection_collab_added` notification type: emitted when a collection
-- owner adds a collaborator directly (not via the request-to-collaborate flow, which
-- already emits collection_collab_accepted). Re-declare the FULL notifications type
-- set — the constraint is repeatedly dropped/rebuilt, so append by restating the whole
-- list (superset of 20271177000000_collection_collaboration_requests.sql) plus the new
-- type.

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
    'award_win',
    'feedback_status_updated',
    'feedback_notes_updated',
    'project_idea_submitted',
    'collection_collab_requested',
    'collection_collab_accepted',
    'collection_collab_rejected',
    'collection_collab_added'
  ));
