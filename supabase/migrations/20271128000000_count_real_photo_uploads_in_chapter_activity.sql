-- Fix: /embassy/leadership — Photography tool activity never appears in
-- chapter metrics or per-ambassador activity.
--
-- Root cause:
--   get_chapter_metrics.total_photos_added and
--   get_chapter_ambassador_activity.photos_added both counted "photo additions"
--   by inspecting building_audit_logs for hero_image_url changes from null → value.
--   But ambassadors upload photos through the building "save note" flow, which
--   inserts directly into review_images. The audit trigger only fires on
--   buildings UPDATE, so review_images inserts produce no audit log row.
--   hero_image_url is only changed when a hero is later promoted — a separate,
--   rare action. Result: the Photography tool's primary output (photo uploads)
--   never shows up on /embassy/leadership.
--
--   Additionally, get_chapter_ambassador_activity.total_score did not include
--   photos_added at all in either the score expression or the ORDER BY, so even
--   if photo counts were correct they would not affect the leaderboard ranking.
--
-- Fix:
--   • Both RPCs now count photos from review_images directly, joined to
--     building_posts → buildings and gated by _building_in_ambassador_chapter_scope.
--   • total_score and ORDER BY in the activity RPC now include photos_added.
--   • last_active_at also considers review_images.created_at so an ambassador
--     who only uploads photos still shows a recent timestamp.

-- ── 1. Chapter metrics ────────────────────────────────────────────────────────

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
      FROM   public.review_images ri
      INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      INNER JOIN public.buildings b ON b.id = bp.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ri.created_at >= v_start
        AND  ri.created_at <  v_end
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
      FROM   public.review_images ri
      INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      INNER JOIN public.buildings b ON b.id = bp.building_id
             AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE  public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
        AND  ri.created_at >= v_prev_start
        AND  ri.created_at <  v_prev_end
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


-- ── 2. Per-ambassador activity ────────────────────────────────────────────────

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

      -- Photo uploads: count review_images directly, chapter-scoped via building_posts
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

      -- Last active: latest of audit-log, outreach, or photo upload
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
    (
      a.edits_count
      + a.photos_added
      + a.visits_count
      + a.firms_claimed_count
      + a.moderation_count
      + a.outreach_count
    )::bigint AS total_score,
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
