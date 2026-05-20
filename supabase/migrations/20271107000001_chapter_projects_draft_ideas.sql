-- Allow any ambassador to submit a project idea as a draft.
-- Drafts are visible to their author and to chapter leadership.

-- 1. Extend the status check constraint to include 'draft'
ALTER TABLE public.chapter_projects
  DROP CONSTRAINT IF EXISTS chapter_projects_status_check;

ALTER TABLE public.chapter_projects
  ADD CONSTRAINT chapter_projects_status_check
  CHECK (status IN ('draft', 'active', 'completed', 'archived'));

-- 2. Tighten the SELECT policy so regular ambassadors cannot see other members' drafts
DROP POLICY IF EXISTS "Chapter members can view projects" ON public.chapter_projects;

CREATE POLICY "Chapter members can view projects"
  ON public.chapter_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid()
        AND chapter_id = chapter_projects.chapter_id
        AND status = 'active'
    )
    AND (
      -- non-draft items are visible to all chapter members
      chapter_projects.status != 'draft'
      -- authors can always see their own draft ideas
      OR chapter_projects.created_by = auth.uid()
    )
  );

-- 3. Allow any active ambassador to INSERT their own draft idea
--    (leadership INSERT is already covered by the FOR ALL policy)
CREATE POLICY "Ambassadors can submit draft ideas"
  ON public.chapter_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    chapter_projects.status = 'draft'
    AND chapter_projects.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.ambassador_memberships
      WHERE user_id = auth.uid()
        AND chapter_id = chapter_projects.chapter_id
        AND status = 'active'
    )
  );
