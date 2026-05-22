-- Forensic rewrite: get_chapter_ambassador_activity — "Could not load the leaderboard"
-- (feedback 06d27345-8d11-49d6-a3aa-e41a8e7a825c, 2026-05-22)
--
-- Symptom: GET /rest/v1/rpc/get_chapter_ambassador_activity → HTTP 500 (not 403).
-- 500 means PostgreSQL itself raised an exception during execution — NOT a
-- missing GRANT EXECUTE (which surfaces as 403 via PostgREST) and NOT a missing
-- function (404). Prior migrations 20271132000000 and 20271149000000 wrote
-- identical function bodies and recreated GRANT EXECUTE; neither resolved the
-- production issue across multiple feedback cycles (258d60ac, 552a562c,
-- 06d27345). That rules out missing-grant and confirms a runtime fault inside
-- the function body itself.
--
-- Forensic diagnosis of the most likely runtime cause:
--   The previous body called `public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)`
--   ONCE PER ROW inside seven separate correlated subqueries (edits, photos,
--   visits, moderation, plus three GREATEST() max-time scans). For an active
--   chapter (e.g. @davolon's) with ~20 active members and tens of thousands of
--   building_audit_logs rows, this expands to hundreds of thousands of nested
--   SECURITY DEFINER function calls. Each call does a CROSS JOIN +
--   conditional locality EXISTS check. Supabase's default `statement_timeout`
--   (8s for `authenticated` role) cancels the query with
--   `ERROR: canceling statement due to statement timeout` → PostgREST 500.
--
-- Fix:
--   Materialise the "buildings in this chapter's scope" set ONCE per call into
--   a temporary CTE (`scoped_buildings`), then drive every count/MAX subquery
--   off a plain join with that CTE instead of calling the scope-check function
--   row-by-row. Net effect: one chapter-bounded buildings scan instead of
--   N × rows-per-table scope-function invocations. Functionally identical
--   output; orders of magnitude faster; no longer trips statement_timeout.
--
--   Helper functions are NOT redefined here — they already work and the prior
--   "lost GRANT" theory was wrong. We only DROP+CREATE the leaderboard RPC.
--
-- Also: NOTIFY pgrst at the end to refresh PostgREST's function-signature
-- schema cache, eliminating the rare case where the new body is in place but
-- PostgREST still routes to the stale plan.


-- ── Leaderboard RPC — set-based rewrite ────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_chapter_ambassador_activity(uuid, integer);

CREATE FUNCTION public.get_chapter_ambassador_activity (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    user_id              uuid,
    username             text,
    avatar_url           text,
    role                 text,
    edits_count          bigint,
    photos_added         bigint,
    visits_count         bigint,
    firms_claimed_count  bigint,
    moderation_count     bigint,
    outreach_count       bigint,
    total_score          bigint,
    last_active_at       timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end   timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - make_interval(days => greatest(p_days, 1));
BEGIN
  -- Auth: any active chapter member OR platform admin.
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  -- Sanity: chapter exists.
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
    -- Materialise the chapter's building set ONCE. All downstream subqueries
    -- join against this small set instead of invoking the scope function
    -- per audit-log/photo/visit row.
    scoped_buildings AS (
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
    ),
    members AS (
      SELECT
        m.user_id,
        COALESCE(p.username, '')::text AS username,
        p.avatar_url::text             AS avatar_url,
        m.role::text                   AS role
      FROM   public.ambassador_memberships m
             INNER JOIN public.profiles p ON p.id = m.user_id
      WHERE  m.chapter_id = p_chapter_id
        AND  m.status     = 'active'
    ),
    -- Per-member aggregates from building_audit_logs (edits + moderation).
    audit_agg AS (
      SELECT
        al.user_id,
        COUNT(*) FILTER (
          WHERE al.table_name NOT IN (
            'ambassador_approval',
            'ambassador_photo_approval',
            'ambassador_credit_approval'
          )
        )::bigint AS edits_count,
        COUNT(*) FILTER (
          WHERE al.table_name IN (
            'ambassador_approval',
            'ambassador_photo_approval',
            'ambassador_credit_approval'
          )
        )::bigint AS moderation_count,
        MAX(al.created_at) AS last_audit_at
      FROM   public.building_audit_logs al
             INNER JOIN scoped_buildings sb ON sb.building_id = al.building_id
      WHERE  al.created_at >= v_start
        AND  al.created_at <  v_end
        AND  al.user_id    IS NOT NULL
      GROUP BY al.user_id
    ),
    -- Per-member photo uploads (review_images joined via building_posts).
    photos_agg AS (
      SELECT
        ri.user_id,
        COUNT(*)::bigint AS photos_added,
        MAX(ri.created_at) AS last_photo_at
      FROM   public.review_images ri
             INNER JOIN public.building_posts bp ON bp.id = ri.review_id
             INNER JOIN scoped_buildings sb     ON sb.building_id = bp.building_id
      WHERE  ri.created_at >= v_start
        AND  ri.created_at <  v_end
      GROUP BY ri.user_id
    ),
    -- Per-member building visits.
    visits_agg AS (
      SELECT
        ub.user_id,
        COUNT(*)::bigint AS visits_count
      FROM   public.user_buildings ub
             INNER JOIN scoped_buildings sb ON sb.building_id = ub.building_id
      WHERE  ub.created_at >= v_start
        AND  ub.created_at <  v_end
      GROUP BY ub.user_id
    ),
    -- Per-member firms claimed (no chapter scope — claim itself is global).
    firms_agg AS (
      SELECT
        cs.user_id,
        COUNT(*)::bigint AS firms_claimed_count
      FROM   public.company_stewards cs
      WHERE  cs.created_at >= v_start
        AND  cs.created_at <  v_end
      GROUP BY cs.user_id
    ),
    -- Per-member outreach interactions.
    outreach_agg AS (
      SELECT
        ol.ambassador_id AS user_id,
        COUNT(*)::bigint AS outreach_count,
        MAX(ol.created_at) AS last_outreach_at
      FROM   public.outreach_log ol
      WHERE  ol.created_at >= v_start
        AND  ol.created_at <  v_end
      GROUP BY ol.ambassador_id
    )
  SELECT
    me.user_id,
    me.username,
    me.avatar_url,
    me.role,
    COALESCE(aa.edits_count,        0)::bigint           AS edits_count,
    COALESCE(pa.photos_added,       0)::bigint           AS photos_added,
    COALESCE(va.visits_count,       0)::bigint           AS visits_count,
    COALESCE(fa.firms_claimed_count, 0)::bigint          AS firms_claimed_count,
    COALESCE(aa.moderation_count,   0)::bigint           AS moderation_count,
    COALESCE(oa.outreach_count,     0)::bigint           AS outreach_count,
    (
      COALESCE(aa.edits_count,        0)
      + COALESCE(pa.photos_added,     0)
      + COALESCE(va.visits_count,     0)
      + COALESCE(fa.firms_claimed_count, 0)
      + COALESCE(aa.moderation_count, 0)
      + COALESCE(oa.outreach_count,   0)
    )::bigint                                            AS total_score,
    GREATEST(aa.last_audit_at, oa.last_outreach_at, pa.last_photo_at)
                                                         AS last_active_at
  FROM   members me
         LEFT JOIN audit_agg    aa ON aa.user_id = me.user_id
         LEFT JOIN photos_agg   pa ON pa.user_id = me.user_id
         LEFT JOIN visits_agg   va ON va.user_id = me.user_id
         LEFT JOIN firms_agg    fa ON fa.user_id = me.user_id
         LEFT JOIN outreach_agg oa ON oa.user_id = me.user_id
  ORDER BY
    (
      COALESCE(aa.edits_count,        0)
      + COALESCE(pa.photos_added,     0)
      + COALESCE(va.visits_count,     0)
      + COALESCE(fa.firms_claimed_count, 0)
      + COALESCE(aa.moderation_count, 0)
      + COALESCE(oa.outreach_count,   0)
    ) DESC,
    GREATEST(aa.last_audit_at, oa.last_outreach_at, pa.last_photo_at) DESC NULLS LAST,
    me.username ASC NULLS LAST;
END;
$$;

REVOKE ALL    ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) TO authenticated;


-- ── Refresh PostgREST schema cache so the new signature is routed immediately
NOTIFY pgrst, 'reload schema';
