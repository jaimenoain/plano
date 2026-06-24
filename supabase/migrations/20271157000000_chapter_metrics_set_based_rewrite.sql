-- Forensic rewrite: get_chapter_metrics — the leaderboard "per-row scope helper"
-- disease, uncured (backend-latency audit, 2026-06-22)
--
-- Sibling RPC get_chapter_ambassador_activity was rewritten set-based in
-- 20271151000000 to stop calling public._building_in_ambassador_chapter_scope()
-- once per audit-log/photo/visit row (which trips Supabase's 8s statement_timeout
-- → HTTP 500 on active/national chapters). get_chapter_metrics — which powers the
-- same /embassy/leadership dashboard — was NEVER given the same treatment and
-- still calls the per-row scope function inside SIX correlated COUNT subqueries
-- across building_audit_logs, review_images and user_buildings (current + prior
-- period). It has the identical 500-timeout signature documented in its own file
-- header (20271135000000).
--
-- Fix (mirrors 20271151000000 exactly):
--   Materialise the chapter's building set ONCE into a `scoped_buildings` CTE,
--   then drive every COUNT off `INNER JOIN scoped_buildings` instead of the
--   row-by-row SECURITY DEFINER scope call. The `chapter` + `scoped_buildings`
--   CTEs are copied verbatim from the shipped leaderboard rewrite, whose scope
--   logic is the team-validated, output-equivalent inlining of
--   _building_in_ambassador_chapter_scope().
--
-- Output parity: each metric keeps its ORIGINAL predicate semantics — notably
-- the visits metric still filters on `status = 'visited'` + `visited_at` (NOT
-- created_at), and edits still count ALL audit-log rows in scope. The ONLY
-- change is replacing `buildings b ... WHERE _building_in_ambassador_chapter_scope(b.id, …)`
-- with `scoped_buildings sb`, which is set-equivalent (the CTE already filters
-- is_deleted = FALSE and the same scope). Combined with the new
-- idx_building_audit_logs_building_id_created_at / idx_user_buildings_building_id
-- indexes (20271156000000), this clears the last instance of the documented
-- timeout disease.
--
-- Auth guard, signature, return columns, REVOKE/GRANT all preserved exactly.
--
-- NEEDS APPLY in the Supabase SQL Editor (this project applies migrations by
-- hand). Verify row parity against the live function on a representative chapter
-- before/after if desired — output is intended to be identical, only faster.

DROP FUNCTION IF EXISTS public.get_chapter_metrics(uuid, integer);

CREATE FUNCTION public.get_chapter_metrics (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    total_edits                bigint,
    total_photos_added         bigint,
    total_building_visits      bigint,
    period_start               timestamptz,
    period_end                 timestamptz,
    prev_total_edits           bigint,
    prev_total_photos_added    bigint,
    prev_total_building_visits bigint,
    prev_period_start          timestamptz,
    prev_period_end            timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end        timestamptz := timezone('utc'::text, now());
  v_start      timestamptz := v_end      - make_interval(days => greatest(p_days, 1));
  v_prev_end   timestamptz := v_start;
  v_prev_start timestamptz := v_prev_end - make_interval(days => greatest(p_days, 1));
BEGIN
  IF NOT (
    public.is_admin()
    OR public.is_chapter_leader(p_chapter_id)
    OR public.is_national_president_of_local_chapter_parent(p_chapter_id)
  ) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_chapters c WHERE c.id = p_chapter_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH
    chapter AS (
      SELECT c.id, c.type, c.locality_id, c.country_code
      FROM   public.ambassador_chapters c
      WHERE  c.id = p_chapter_id
    ),
    -- Materialise the chapter's building set ONCE. Verbatim from the shipped
    -- leaderboard rewrite (20271151000000): the output-equivalent inlining of
    -- public._building_in_ambassador_chapter_scope(b.id, p_chapter_id).
    scoped_buildings AS MATERIALIZED (
      SELECT b.id AS building_id
      FROM   public.buildings b
             CROSS JOIN chapter c
      WHERE  COALESCE(b.is_deleted, FALSE) = FALSE
        AND  (
          (c.type = 'local'
            AND b.locality_id IS NOT NULL
            AND b.locality_id = c.locality_id)
          OR (c.type = 'national'
            AND (
              upper(COALESCE(b.country_code, '')) = c.country_code
              OR EXISTS (
                SELECT 1
                FROM   public.localities l
                WHERE  l.id = b.locality_id
                  AND  upper(l.country_code) = c.country_code
              )
            )
          )
        )
    )
  SELECT
    -- Current period: total edits (all audit-log rows, chapter-scoped).
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
             INNER JOIN scoped_buildings sb ON sb.building_id = al.building_id
      WHERE  al.created_at >= v_start
        AND  al.created_at <  v_end
    ) AS total_edits,

    -- Current period: photos uploaded (review_images via building_posts).
    (
      SELECT COUNT(*)::bigint
      FROM   public.review_images ri
             INNER JOIN public.building_posts bp ON bp.id = ri.review_id
             INNER JOIN scoped_buildings sb     ON sb.building_id = bp.building_id
      WHERE  ri.created_at >= v_start
        AND  ri.created_at <  v_end
    ) AS total_photos_added,

    -- Current period: building visits (status = 'visited', by visited_at).
    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
             INNER JOIN scoped_buildings sb ON sb.building_id = ub.building_id
      WHERE  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_start
        AND  ub.visited_at <  v_end
    ) AS total_building_visits,

    v_start AS period_start,
    v_end   AS period_end,

    -- Prior period: total edits.
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
             INNER JOIN scoped_buildings sb ON sb.building_id = al.building_id
      WHERE  al.created_at >= v_prev_start
        AND  al.created_at <  v_prev_end
    ) AS prev_total_edits,

    -- Prior period: photos uploaded (review_images).
    (
      SELECT COUNT(*)::bigint
      FROM   public.review_images ri
             INNER JOIN public.building_posts bp ON bp.id = ri.review_id
             INNER JOIN scoped_buildings sb     ON sb.building_id = bp.building_id
      WHERE  ri.created_at >= v_prev_start
        AND  ri.created_at <  v_prev_end
    ) AS prev_total_photos_added,

    -- Prior period: building visits.
    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
             INNER JOIN scoped_buildings sb ON sb.building_id = ub.building_id
      WHERE  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_prev_start
        AND  ub.visited_at <  v_prev_end
    ) AS prev_total_building_visits,

    v_prev_start AS prev_period_start,
    v_prev_end   AS prev_period_end;
END;
$$;

REVOKE ALL    ON FUNCTION public.get_chapter_metrics(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_metrics(uuid, integer) TO authenticated;

-- Refresh PostgREST's function-signature cache so the new body routes immediately.
NOTIFY pgrst, 'reload schema';
