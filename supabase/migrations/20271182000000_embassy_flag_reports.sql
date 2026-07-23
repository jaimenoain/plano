-- Reports must be able to reference flagged CONTENT, not only profiles.
--
-- The admin moderation queue (/admin/moderation) has always treated
-- reports.reported_id as a content id — it probes building_posts and comments
-- to enrich each row — but the column's FK to profiles(id) made any
-- content-targeting insert fail. Nothing in the app has ever been able to
-- write a content report; the embassy Moderation flag button was a no-op.
--
-- Drop the mistaken FK and record the target kind explicitly so the admin
-- queue no longer has to guess by probing tables.

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_id_fkey;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS content_type text;

COMMENT ON COLUMN public.reports.content_type IS
  'What reported_id points at: building | photo (review_images) | video (building_posts) | credit (building_credits) | review | comment. NULL = legacy row (user report or pre-column content report); the admin UI probes tables for those.';
