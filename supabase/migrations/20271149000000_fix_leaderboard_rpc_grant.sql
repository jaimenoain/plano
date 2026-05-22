-- Fix: Leaderboard on /embassy/goals — "Could not load the leaderboard"
-- (feedback 258d60ac-9bbf-465d-8471-1a78183cddde, 2026-05-21)
--
-- Root cause:
--   get_chapter_ambassador_activity has a lost GRANT EXECUTE in the live DB from
--   a prior DROP+CREATE cycle in migration 20271112000000 (which did DROP+CREATE
--   without a GRANT). Subsequent migrations (20271117000000, 20271126000000,
--   20271128000000) rewrote the function body but may not have been applied. The
--   fix migration 20271132000000 was written but has not been applied to the live
--   DB (it remained in KNOWN_ISSUES). This migration supersedes 20271132000000
--   with a later timestamp so Supabase's tracker treats it as a fresh file.
--
-- The RPC already returns ALL active ambassador_memberships (including members
-- with zero activity — all count subqueries return 0 rather than NULL), so no
-- change to the query logic is needed.
--
-- Feedback ids: 258d60ac-9bbf-465d-8471-1a78183cddde (current),
--               1b73c182-e724-40b1-a849-8c78c2d3db37 (original — same root cause)
-- Page: /embassy/goals

-- ── 0. Internal helpers (idempotent) ──────────────────────────────────────────

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


-- ── 1. Personal audit timeline ─────────────────────────────────────────────────

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


-- ── 2. Chapter ambassador activity (leaderboard) ───────────────────────────────
-- Definitive body from 20271128000000: photos counted from review_images
-- (joined via building_posts → buildings), not hero_image_url audit-log
-- transitions. Includes ALL active ambassador_memberships — zero-point members
-- appear with all counts at 0, satisfying the requirement to show every
-- ambassador regardless of activity level.

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
