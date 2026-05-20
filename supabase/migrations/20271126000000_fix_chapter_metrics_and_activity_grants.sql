-- Fix: /embassy/leadership - "Could not load chapter metrics" and "Could not load activity"
--
-- Root causes:
--   1. get_chapter_metrics was only ever created with CREATE OR REPLACE (never DROP+CREATE+GRANT).
--      Some PostgreSQL/PostgREST environments silently lose EXECUTE grants when function bodies
--      are replaced. This migration uses DROP+CREATE+GRANT to guarantee the permission is set.
--
--   2. get_chapter_ambassador_activity had its GRANT EXECUTE revoked by migration
--      20271112000000 (which used DROP+CREATE without a GRANT). Migration 20271117000000 was
--      written to fix this but may not have been applied to the live DB. This migration
--      re-applies the same fix idempotently (same function body as 20271117000000).
--
-- Feedback id: 6a636d1d-dbe6-4a34-b4fc-154cf09e0599

-- ── 1. Chapter metrics (chapter leaders + national presidents + admin) ────────

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
  SELECT
    -- Current period
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.created_at >= v_start
        AND  al.created_at <  v_end
    ) AS total_edits,

    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.table_name = 'buildings'
        AND  al.operation  = 'UPDATE'
        AND  al.created_at >= v_start
        AND  al.created_at <  v_end
        AND  NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND  NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL
    ) AS total_photos_added,

    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
      INNER JOIN public.buildings b ON b.id = ub.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_start
        AND  ub.visited_at <  v_end
    ) AS total_building_visits,

    v_start AS period_start,
    v_end   AS period_end,

    -- Prior period (for trend arrows)
    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.created_at >= v_prev_start
        AND  al.created_at <  v_prev_end
    ) AS prev_total_edits,

    (
      SELECT COUNT(*)::bigint
      FROM   public.building_audit_logs al
      INNER JOIN public.buildings b ON b.id = al.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  al.table_name = 'buildings'
        AND  al.operation  = 'UPDATE'
        AND  al.created_at >= v_prev_start
        AND  al.created_at <  v_prev_end
        AND  NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND  NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL
    ) AS prev_total_photos_added,

    (
      SELECT COUNT(*)::bigint
      FROM   public.user_buildings ub
      INNER JOIN public.buildings b ON b.id = ub.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ub.status::text = 'visited'
        AND  ub.visited_at IS NOT NULL
        AND  ub.visited_at >= v_prev_start
        AND  ub.visited_at <  v_prev_end
    ) AS prev_total_building_visits,

    v_prev_start AS prev_period_start,
    v_prev_end   AS prev_period_end;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_metrics(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_metrics(uuid, integer) TO authenticated;


-- ── 2. Ambassador activity (any active chapter member) ────────────────────────
-- Identical to 20271117000000; re-applied here in case that migration was not
-- yet executed against the live DB.

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
      COALESCE(p.username, '')::text                                       AS username,
      p.avatar_url::text                                                   AS avatar_url,
      m.role::text                                                         AS role,

      -- Data edits: audit log entries that are NOT moderation approvals
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
      )                                                                    AS edits_count,

      -- Photo additions: hero_image_url changed null → value
      (
        SELECT COUNT(*)::bigint
        FROM   public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  al.user_id    = m.user_id
          AND  al.table_name = 'buildings'
          AND  al.operation  = 'UPDATE'
          AND  al.created_at >= v_start
          AND  al.created_at <  v_end
          AND  NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
          AND  NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL
      )                                                                    AS photos_added,

      -- Building visits logged in the period, scoped to chapter
      (
        SELECT COUNT(*)::bigint
        FROM   public.user_buildings ub
        INNER JOIN public.buildings b ON b.id = ub.building_id
               AND COALESCE(b.is_deleted, FALSE) = FALSE
        WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
          AND  ub.user_id    = m.user_id
          AND  ub.created_at >= v_start
          AND  ub.created_at <  v_end
      )                                                                    AS visits_count,

      -- Architect firms claimed as steward in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.company_stewards cs
        WHERE  cs.user_id    = m.user_id
          AND  cs.created_at >= v_start
          AND  cs.created_at <  v_end
      )                                                                    AS firms_claimed_count,

      -- Moderation approvals (buildings, photos, credits) in the period, scoped to chapter
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
      )                                                                    AS moderation_count,

      -- Outreach interactions logged in the period
      (
        SELECT COUNT(*)::bigint
        FROM   public.outreach_log ol
        WHERE  ol.ambassador_id = m.user_id
          AND  ol.created_at   >= v_start
          AND  ol.created_at   <  v_end
      )                                                                    AS outreach_count,

      -- Last active: latest of audit-log or outreach activity
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
        )
      )                                                                    AS last_active_at

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
    (a.edits_count + a.visits_count + a.firms_claimed_count + a.moderation_count + a.outreach_count)::bigint AS total_score,
    a.last_active_at
  FROM activity a
  ORDER BY
    (a.edits_count + a.visits_count + a.firms_claimed_count + a.moderation_count + a.outreach_count) DESC,
    a.last_active_at DESC NULLS LAST,
    a.username ASC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_ambassador_activity(uuid, integer) TO authenticated;
