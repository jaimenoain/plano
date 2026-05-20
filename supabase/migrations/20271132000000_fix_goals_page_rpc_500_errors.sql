-- Fix: /embassy/goals — 500 errors on get_ambassador_my_audit_timeline and
-- get_chapter_ambassador_activity (feedback a6a4c786-422a-405d-ba2d-35b226c37ca1).
--
-- Root cause analysis:
--   Both RPCs returned HTTP 500, indicating a PostgreSQL runtime exception (not a
--   permission denial, which would be 403, or a missing function, which would be 404).
--   The two functions share a common dependency on public.building_audit_logs. The most
--   probable causes are:
--     (a) A DROP+CREATE cycle in a prior migration lost GRANT EXECUTE on one or both
--         functions, making PostgREST unable to execute them as the authenticated role.
--     (b) An intermediate schema state (duplicate-timestamp migrations, partially-applied
--         fixes) left get_chapter_ambassador_activity with a function body that references
--         an object not yet present in the live DB (e.g. outreach_log, or an updated
--         column/helper that was dropped/renamed mid-cycle).
--     (c) The live function body differs from the latest migration due to Supabase's
--         migration tracker silently skipping duplicate-timestamp files.
--
-- Fix:
--   Unconditional DROP + CREATE + REVOKE ALL + GRANT EXECUTE for both functions,
--   using the definitive latest bodies. Also recreates the two internal helper
--   functions to guarantee their state is consistent.
--
-- ── 0. Internal helpers (idempotent) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public._ambassador_can_access_chapter (p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    public.is_admin ()
    OR EXISTS (
      SELECT 1
      FROM   public.ambassador_memberships m
      WHERE  m.user_id    = (SELECT auth.uid())
        AND  m.chapter_id = p_chapter_id
        AND  m.status     = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public._building_in_ambassador_chapter_scope (p_building_id uuid, p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM   public.buildings b
             CROSS JOIN public.ambassador_chapters c
      WHERE  b.id = p_building_id
        AND  c.id = p_chapter_id
        AND  COALESCE(b.is_deleted, FALSE) = FALSE
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
    );
$$;


-- ── 1. Personal audit timeline ────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_ambassador_my_audit_timeline (integer);

CREATE FUNCTION public.get_ambassador_my_audit_timeline (p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id               uuid,
    building_id      uuid,
    building_name    text,
    building_slug    text,
    building_short_id integer,
    table_name       text,
    operation        text,
    created_at       timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    al.id,
    al.building_id,
    COALESCE(bu.name, '')::text          AS building_name,
    COALESCE(bu.slug, '')::text          AS building_slug,
    bu.short_id::integer                 AS building_short_id,
    al.table_name::text,
    al.operation::text,
    al.created_at
  FROM
    public.building_audit_logs al
    LEFT JOIN public.buildings bu ON bu.id = al.building_id
  WHERE
    al.user_id = (SELECT auth.uid())
  ORDER BY
    al.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_my_audit_timeline(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_my_audit_timeline(integer) TO authenticated;


-- ── 2. Chapter ambassador activity (leaderboard) ──────────────────────────────
-- Uses the definitive body from 20271128000000: photos counted directly from
-- review_images (joined via building_posts), not from hero_image_url audit log
-- transitions. total_score and ORDER BY include photos_added.

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
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_chapters c WHERE c.id = p_chapter_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH activity AS (
    SELECT
      m.user_id,
      COALESCE(p.username, '')::text   AS username,
      p.avatar_url::text               AS avatar_url,
      m.role::text                     AS role,

      -- Data edits: audit log rows that are NOT moderation approvals
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
          AND  al.table_name NOT IN (
                 'ambassador_approval',
                 'ambassador_photo_approval',
                 'ambassador_credit_approval'
               )
      )                                AS edits_count,

      -- Photo uploads: count directly from review_images → building_posts → buildings
      (
        SELECT COUNT(*)::bigint
        FROM   public.review_images ri
        INNER JOIN public.building_posts bp ON bp.id = ri.review_id
        INNER JOIN public.buildings b ON b.id = bp.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  ri.user_id    = m.user_id
          AND  ri.created_at >= v_start
          AND  ri.created_at <  v_end
      )                                AS photos_added,

      -- Building visits logged in the period, chapter-scoped
      (
        SELECT COUNT(*)::bigint
        FROM   public.user_buildings ub
        INNER JOIN public.buildings b ON b.id = ub.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  ub.user_id    = m.user_id
          AND  ub.created_at >= v_start
          AND  ub.created_at <  v_end
      )                                AS visits_count,

      -- Firms claimed as steward in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.company_stewards cs
        WHERE  cs.user_id    = m.user_id
          AND  cs.created_at >= v_start
          AND  cs.created_at <  v_end
      )                                AS firms_claimed_count,

      -- Moderation approvals (buildings, photos, credits) in the period, chapter-scoped
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.table_name IN (
                 'ambassador_approval',
                 'ambassador_photo_approval',
                 'ambassador_credit_approval'
               )
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
      )                                AS moderation_count,

      -- Outreach interactions logged in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.outreach_log ol
        WHERE  ol.ambassador_id = m.user_id
          AND  ol.created_at   >= v_start
          AND  ol.created_at   <  v_end
      )                                AS outreach_count,

      -- Last active: latest of audit-log, outreach, or photo upload timestamps
      GREATEST(
        (
          SELECT MAX(al.created_at)
          FROM   public.building_audit_logs al
          INNER JOIN public.buildings b ON b.id = al.building_id
                 AND COALESCE(b.is_deleted, FALSE) = FALSE
          WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
            AND  al.user_id = m.user_id
        ),
        (
          SELECT MAX(ol.created_at)
          FROM   public.outreach_log ol
          WHERE  ol.ambassador_id = m.user_id
        ),
        (
          SELECT MAX(ri.created_at)
          FROM   public.review_images ri
          INNER JOIN public.building_posts bp ON bp.id = ri.review_id
          INNER JOIN public.buildings b ON b.id = bp.building_id
                 AND COALESCE(b.is_deleted, FALSE) = FALSE
          WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
            AND  ri.user_id = m.user_id
        )
      )                                AS last_active_at

    FROM
      public.ambassador_memberships m
      INNER JOIN public.profiles p ON p.id = m.user_id
    WHERE
      m.chapter_id = p_chapter_id
      AND m.status = 'active'
  )
  SELECT
    a.user_id,
    a.username,
    a.avatar_url,
    a.role,
    a.edits_count,
    a.photos_added,
    a.visits_count,
    a.firms_claimed_count,
    a.moderation_count,
    a.outreach_count,
    (
      a.edits_count
      + a.photos_added
      + a.visits_count
      + a.firms_claimed_count
      + a.moderation_count
      + a.outreach_count
    )::bigint                          AS total_score,
    a.last_active_at
  FROM activity a
  ORDER BY
    (
      a.edits_count
      + a.photos_added
      + a.visits_count
      + a.firms_claimed_count
      + a.moderation_count
      + a.outreach_count
    ) DESC,
    a.last_active_at DESC NULLS LAST,
    a.username ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) TO authenticated;
