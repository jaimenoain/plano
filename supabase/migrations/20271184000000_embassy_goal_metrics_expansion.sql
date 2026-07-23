-- Roadmap 2.4 — Suggested goals + broader metrics.
--
-- ambassador_goals.metric only supported edits/photos/visits/firms_claimed — the
-- spec's "blank-page problem" is compounded by moderation, outreach, events, and
-- research contributions being unable to count toward any goal. This migration:
--
--   1. Widens the metric CHECK constraint to add moderation/outreach/events/research.
--   2. Extends get_my_ambassador_goals() with a counting branch per new metric:
--        - moderation mirrors get_chapter_ambassador_activity's moderation_count
--          filter (building_audit_logs.table_name IN the three approval tags).
--          Known pre-existing gap, not fixed here: ambassador_approve_video tags
--          its audit row table_name='building_posts', so video approvals are not
--          counted as moderation anywhere in the app today.
--        - outreach mirrors that RPC's outreach_agg (outreach_log.ambassador_id
--          stores the profile/user id, per the Phase-1 outreach fix).
--        - events and research are new signals nobody had queried before:
--          embassy_event_discoveries already stamps reviewed_by/reviewed_at/
--          status='published' on publish (20271141000000), and
--          ambassador_apply_building_research already tags its audit row with
--          operation='ai_research_apply', distinct from generic edits
--          (20271130000000) — no schema change needed for either, just the query.
--   3. Adds the one supporting index the events branch is missing (outreach_log and
--      building_audit_logs already have (user, created_at) indexes from prior
--      migrations that cover the new moderation/outreach/research branches).
--
-- types-neutral: ambassador_goals.metric stays a text column (CHECK constraint
-- widened only) and get_my_ambassador_goals' signature/RETURNS is unchanged — gen-types
-- confirmed a zero-diff run.

-- ─── 1. Widen the metric CHECK constraint ──────────────────────────────────────

ALTER TABLE public.ambassador_goals DROP CONSTRAINT IF EXISTS ambassador_goals_metric_check;
ALTER TABLE public.ambassador_goals ADD CONSTRAINT ambassador_goals_metric_check CHECK (metric IN (
  'edits', 'photos', 'firms_claimed', 'visits',
  'moderation', 'outreach', 'events', 'research'
));

-- ─── 2. get_my_ambassador_goals — four new counting branches ───────────────────

CREATE OR REPLACE FUNCTION public.get_my_ambassador_goals ()
  RETURNS TABLE (
    id uuid,
    user_id uuid,
    title text,
    target_value integer,
    current_value integer,
    metric text,
    status text,
    due_date timestamptz,
    created_at timestamptz,
    updated_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    g.id,
    g.user_id,
    g.title,
    g.target_value,
    CASE g.metric
    WHEN 'photos' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.review_images ri
        WHERE
          ri.user_id = v_uid
          AND ri.created_at >= g.created_at), 0)
    WHEN 'edits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.created_at >= g.created_at), 0)
    WHEN 'visits' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.user_buildings ub
        WHERE
          ub.user_id = v_uid
          AND ub.status::text = 'visited'
          AND COALESCE(ub.visited_at, ub.created_at) >= g.created_at), 0)
    WHEN 'firms_claimed' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.company_stewards cs
        WHERE
          cs.user_id = v_uid
          AND cs.role = 'owner'::public.company_steward_role
          AND cs.created_at >= g.created_at), 0)
    WHEN 'moderation' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.table_name IN ('ambassador_approval', 'ambassador_photo_approval', 'ambassador_credit_approval')
          AND al.created_at >= g.created_at), 0)
    WHEN 'outreach' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.outreach_log ol
        WHERE
          ol.ambassador_id = v_uid
          AND ol.created_at >= g.created_at), 0)
    WHEN 'events' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.embassy_event_discoveries ed
        WHERE
          ed.reviewed_by = v_uid
          AND ed.status = 'published'
          AND ed.reviewed_at >= g.created_at), 0)
    WHEN 'research' THEN
      COALESCE((
        SELECT
          COUNT(*)::integer
        FROM
          public.building_audit_logs al
        WHERE
          al.user_id = v_uid
          AND al.operation = 'ai_research_apply'
          AND al.created_at >= g.created_at), 0)
    ELSE
      g.current_value
    END AS current_value,
    g.metric,
    g.status,
    g.due_date,
    g.created_at,
    g.updated_at
  FROM
    public.ambassador_goals g
  WHERE
    g.user_id = v_uid
  ORDER BY
    g.created_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ambassador_goals () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_ambassador_goals () TO authenticated;

-- ─── 3. Supporting index for the new events branch ──────────────────────────────

CREATE INDEX IF NOT EXISTS idx_embassy_event_discoveries_reviewed_by_status_reviewed_at
  ON public.embassy_event_discoveries (reviewed_by, status, reviewed_at);
