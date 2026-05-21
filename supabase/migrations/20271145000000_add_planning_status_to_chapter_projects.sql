-- Add 'planning' as a valid project status (before 'active').
-- Feedback bc06dd78-c4f9-4464-a52a-557d325ffda9

-- Drop the constraint regardless of which prior migration last set it
-- (20271017000000 had draft absent; 20271107000001 added draft).
ALTER TABLE public.chapter_projects
  DROP CONSTRAINT IF EXISTS chapter_projects_status_check;

ALTER TABLE public.chapter_projects
  ADD CONSTRAINT chapter_projects_status_check
  CHECK (status IN ('draft', 'planning', 'active', 'completed', 'archived'));
