-- Fix: event-search route uses ambassador session (anon-key client) but all
-- write policies on embassy_event_search_runs and embassy_event_discoveries were
-- admin-only, silently blocking every non-admin ambassador.
--
-- Specifically:
--   1. POST /api/embassy/event-search inserts a run row → fails (admin-only INSERT).
--      Route returns 500; EmbassyLayout's fire-and-forget fetch swallows it silently.
--      last_event_search_at is never stamped → UI shows "Search in progress" forever.
--   2. Even if the run row succeeded, discovery INSERTs would also fail (admin-only).
--   3. markRunSuccess/markRunFailed UPDATEs on embassy_event_search_runs also fail.
--   4. markRunSuccess UPDATE on ambassador_chapters also fails (admin-only UPDATE).
--
-- Fixes:
--   A. GRANT INSERT/UPDATE on embassy_event_search_runs to authenticated.
--   B. Replace admin-only INSERT/UPDATE policies with ambassador-scoped ones.
--   C. GRANT INSERT on embassy_event_discoveries to authenticated.
--   D. Replace admin-only INSERT policy with ambassador-scoped one.
--   E. Add stamp_chapter_last_event_search_at() SECURITY DEFINER RPC so the route
--      can stamp only that column — keeping ambassador_chapters UPDATE admin-only
--      for all other fields.
--
-- Feedback id: b5ddb9a7-7434-4f6d-9917-7a9e50de0fac

-- ── A. Grants ─────────────────────────────────────────────────────────────────

GRANT INSERT, UPDATE ON public.embassy_event_search_runs TO authenticated;
GRANT INSERT ON public.embassy_event_discoveries TO authenticated;

-- ── B. embassy_event_search_runs policies ─────────────────────────────────────

DROP POLICY IF EXISTS "embassy_event_search_runs_insert_admin"
  ON public.embassy_event_search_runs;

CREATE POLICY "embassy_event_search_runs_insert_ambassador"
  ON public.embassy_event_search_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (public._ambassador_can_access_chapter(chapter_id));

DROP POLICY IF EXISTS "embassy_event_search_runs_update_admin"
  ON public.embassy_event_search_runs;

CREATE POLICY "embassy_event_search_runs_update_ambassador"
  ON public.embassy_event_search_runs
  FOR UPDATE
  TO authenticated
  USING  (public._ambassador_can_access_chapter(chapter_id))
  WITH CHECK (public._ambassador_can_access_chapter(chapter_id));

-- ── C. embassy_event_discoveries INSERT policy ────────────────────────────────

DROP POLICY IF EXISTS "embassy_event_discoveries_insert_admin"
  ON public.embassy_event_discoveries;

CREATE POLICY "embassy_event_discoveries_insert_ambassador"
  ON public.embassy_event_discoveries
  FOR INSERT
  TO authenticated
  WITH CHECK (public._ambassador_can_access_chapter(chapter_id));

-- ── D. stamp_chapter_last_event_search_at ─────────────────────────────────────
-- SECURITY DEFINER so an ambassador can stamp ONLY this column without needing
-- the broad UPDATE permission on ambassador_chapters (which remains admin-only).

CREATE OR REPLACE FUNCTION public.stamp_chapter_last_event_search_at(
  p_chapter_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope'
      USING HINT = 'Caller is not an active member of this chapter';
  END IF;

  UPDATE ambassador_chapters
     SET last_event_search_at = now()
   WHERE id = p_chapter_id;
END;
$$;

REVOKE ALL ON FUNCTION public.stamp_chapter_last_event_search_at(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.stamp_chapter_last_event_search_at(uuid) TO authenticated;

COMMENT ON FUNCTION public.stamp_chapter_last_event_search_at IS
  'Stamps last_event_search_at = now() on ambassador_chapters after a successful
   AI event search run. SECURITY DEFINER so the route can write this column without
   requiring broad UPDATE access on ambassador_chapters for ambassadors.';
