-- Allow platform admins (profiles.role IN ('admin','app_admin')) to view and
-- manage every chapter_projects row regardless of chapter membership.
--
-- Bug: /admin/ambassadors/campaigns "Ambassador ideas inbox" lists every draft
-- across every chapter. The SELECT policy added by 20271107000001 only allows
-- visibility to (a) active members of the same chapter for non-drafts and
-- (b) the author of the draft. The "Leadership can manage projects" FOR ALL
-- policy from 20271017000000 grants exco/president of one chapter access to
-- that one chapter only. Net effect: an admin who is not an active member
-- (or leader) of every chapter sees only a subset of drafts in the inbox.
-- Also blocks the Publish / Delete actions on drafts from other chapters.
--
-- Fix: add admin SELECT and FOR ALL policies using the existing is_admin()
-- helper (covers both 'admin' and 'app_admin' roles per 20270869000000).

DROP POLICY IF EXISTS "Admins can view all chapter projects" ON public.chapter_projects;

CREATE POLICY "Admins can view all chapter projects"
  ON public.chapter_projects
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all chapter projects" ON public.chapter_projects;

CREATE POLICY "Admins can manage all chapter projects"
  ON public.chapter_projects
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
