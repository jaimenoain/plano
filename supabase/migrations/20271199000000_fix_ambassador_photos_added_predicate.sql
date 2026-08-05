-- Fix: the Embassy "photos added" metric reads 0 on the national overview and
-- programme health admin pages, and always has.
--
-- types-neutral: no table, column, or RPC signature changes — this replaces
-- the bodies of two existing functions only.
--
-- ROOT CAUSE
-- ----------
-- Six leaderboard/metric RPCs originally detected a photo contribution with:
--
--     old_data ->> 'hero_image_url' IS (effectively) NULL
--     AND new_data ->> 'hero_image_url' IS NOT NULL
--
-- against building_audit_logs. That predicate has never matched anything,
-- before or after ADR 0028's delta-encoding migration (confirmed by replaying
-- the pre-backfill restore point locally and querying it directly: 0 matches
-- both before and after, while 783 rows carry a non-empty
-- new_data->>'hero_image_url' in both). The reason: ambassadors upload photos
-- through the "save note" flow, which inserts directly into review_images.
-- The audit trigger only fires on a `buildings` UPDATE, so a photo upload
-- produces no audit row at all. `buildings.hero_image_url` is a separate,
-- rarely-touched curation field (set from the admin building editor, see
-- 20260725000000_add_hero_image_url.sql) and even then it is normally
-- overwritten from one URL to another, never NULL -> value, because
-- `community_preview_url` — not `hero_image_url` — is what the
-- review_images-driven trigger in 20261102000000_optimize_building_thumbnails.sql
-- keeps populated. No audit row has ever recorded a building gaining its
-- first hero image.
--
-- This is the same silent-zero class as 20271196000000
-- (fix_moderation_metric_predicate) and was already independently discovered
-- and fixed for get_chapter_metrics and get_chapter_ambassador_activity in
-- 20271128000000_count_real_photo_uploads_in_chapter_activity.sql (counting
-- review_images directly, chapter-scoped via building_posts) and carried
-- forward through their later rewrites. get_my_ambassador_impact,
-- get_my_ambassador_goals and compute_weekly_digest_payloads already count
-- review_images too (20271184000000, 20271185000000, 20271193000000).
--
-- The two RPCs below are the only ones still on the dead predicate — verified
-- against the live database with:
--
--   select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prokind = 'f'
--     and pg_get_functiondef(p.oid) ilike '%old_data%hero_image_url%';
--
-- which returns exactly get_programme_health_summary and
-- get_national_chapter_overview. Both are fixed here the same way: count
-- review_images rows in the window instead of the audit-log predicate.
--
-- Both functions were also still using `revoke all on function ... from
-- public` without naming anon/authenticated (docs/migrations.md), which
-- leaves them anon-callable despite the internal is_admin()/is_chapter_president()
-- guard. Since both are being re-created here anyway, their grants are
-- re-asserted the correct way in the same statement.

-- ── 1. get_programme_health_summary ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_programme_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pulse          jsonb;
  v_activity_trend jsonb;
  v_flagged        jsonb;
  v_top_chapters   jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  -- 1. Pulse stats
  SELECT jsonb_build_object(
    'active_chapters',        COUNT(*) FILTER (WHERE status = 'active'),
    'forming_chapters',       COUNT(*) FILTER (WHERE status = 'forming'),
    'inactive_chapters',      COUNT(*) FILTER (WHERE status = 'inactive'),
    'active_chapters_delta',  COUNT(*) FILTER (WHERE status = 'active'   AND created_at >= now() - interval '30 days'),
    'forming_chapters_delta', COUNT(*) FILTER (WHERE status = 'forming'  AND created_at >= now() - interval '30 days'),
    'inactive_chapters_delta',COUNT(*) FILTER (WHERE status = 'inactive' AND created_at >= now() - interval '30 days'),
    'pending_applications', (
      SELECT COUNT(*) FROM ambassador_applications WHERE status = 'pending'
    ),
    'stale_applications', (
      SELECT COUNT(*) FROM ambassador_applications
      WHERE status = 'pending' AND created_at < now() - interval '7 days'
    )
  ) INTO v_pulse
  FROM ambassador_chapters;

  -- 2. Activity trend: daily edits + photos over last 30 days (UTC).
  -- Edits come from building_audit_logs; photos come from review_images
  -- directly (an upload never produces an audit_logs row — see header).
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'date',   day::text,
      'edits',  edits,
      'photos', photos
    ) ORDER BY day
  ), '[]'::jsonb)
  INTO v_activity_trend
  FROM (
    SELECT
      day,
      SUM(edits)::bigint  AS edits,
      SUM(photos)::bigint AS photos
    FROM (
      SELECT
        DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS day,
        COUNT(*) AS edits,
        0        AS photos
      FROM building_audit_logs
      WHERE created_at >= now() - interval '30 days'
      GROUP BY day

      UNION ALL

      SELECT
        DATE_TRUNC('day', ri.created_at AT TIME ZONE 'UTC')::date AS day,
        0        AS edits,
        COUNT(*) AS photos
      FROM review_images ri
      WHERE ri.created_at >= now() - interval '30 days'
      GROUP BY day
    ) per_source
    GROUP BY day
  ) t;

  -- 3. Flagged chapters (three flag types, returned as a flat list)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'chapter_id',   chapter_id,
      'chapter_name', chapter_name,
      'country_code', country_code,
      'flag_type',    flag_type,
      'flag_detail',  flag_detail
    )
  ), '[]'::jsonb)
  INTO v_flagged
  FROM (
    -- No active president
    SELECT
      c.id    AS chapter_id,
      c.name  AS chapter_name,
      c.country_code,
      'no_president'::text AS flag_type,
      NULL::text           AS flag_detail
    FROM ambassador_chapters c
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM ambassador_memberships am
        WHERE am.chapter_id = c.id
          AND am.role       = 'president'
          AND am.status     = 'active'
      )

    UNION ALL

    -- Active president with no audit log entries in the last 30 days
    SELECT
      c.id, c.name, c.country_code,
      'president_inactive'::text,
      p.username AS flag_detail
    FROM ambassador_chapters c
    JOIN ambassador_memberships am
      ON  am.chapter_id = c.id
      AND am.role       = 'president'
      AND am.status     = 'active'
    JOIN profiles p ON p.id = am.user_id
    WHERE c.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM building_audit_logs bal
        WHERE bal.user_id    = am.user_id
          AND bal.created_at >= now() - interval '30 days'
      )

    UNION ALL

    -- Forming chapter that has been forming for more than 60 days
    SELECT
      c.id, c.name, c.country_code,
      'forming_stalled'::text,
      EXTRACT(DAY FROM now() - c.created_at)::int::text AS flag_detail
    FROM ambassador_chapters c
    WHERE c.status     = 'forming'
      AND c.created_at < now() - interval '60 days'
  ) flags;

  -- 4. Top 5 active chapters by combined edits + photos in the last 30 days
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'chapter_id',        chapter_id,
      'chapter_name',      chapter_name,
      'country_code',      country_code,
      'member_count',      member_count,
      'contribution_count',contribution_count
    ) ORDER BY contribution_count DESC
  ), '[]'::jsonb)
  INTO v_top_chapters
  FROM (
    SELECT
      c.id   AS chapter_id,
      c.name AS chapter_name,
      c.country_code,
      (
        SELECT COUNT(*) FROM ambassador_memberships am
        WHERE am.chapter_id = c.id AND am.status = 'active'
      ) AS member_count,
      (
        SELECT COUNT(DISTINCT bal.id)
        FROM building_audit_logs bal
        JOIN buildings b ON b.id = bal.building_id AND (b.is_deleted IS NOT TRUE)
        WHERE bal.created_at >= now() - interval '30 days'
          AND (
            (c.type = 'local'    AND b.locality_id                  = c.locality_id)
            OR
            (c.type = 'national' AND upper(b.country_code::text)    = upper(c.country_code))
          )
      ) AS contribution_count
    FROM ambassador_chapters c
    WHERE c.status = 'active'
    ORDER BY contribution_count DESC
    LIMIT 5
  ) top;

  RETURN jsonb_build_object(
    'pulse',            v_pulse,
    'activity_trend',   v_activity_trend,
    'flagged_chapters', v_flagged,
    'top_chapters',     v_top_chapters
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_programme_health_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_programme_health_summary() TO authenticated;

-- ── 2. get_national_chapter_overview ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_national_chapter_overview (p_national_chapter_id uuid)
  RETURNS TABLE (
    chapter_id uuid,
    chapter_name text,
    locality_id uuid,
    member_count bigint,
    president_name text,
    edits_last_30d bigint,
    photos_last_30d bigint,
    last_activity_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - interval '30 days';
BEGIN
  IF NOT (public.is_admin () OR public.is_chapter_president (p_national_chapter_id)) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters nat
    WHERE
      nat.id = p_national_chapter_id
      AND nat.type = 'national') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    lc.id AS chapter_id,
    lc.name::text AS chapter_name,
    lc.locality_id,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_memberships m2
      WHERE
        m2.chapter_id = lc.id
        AND m2.status = 'active') AS member_count,
    COALESCE((
      SELECT
        p.username::text
      FROM
        public.ambassador_memberships pm
        INNER JOIN public.profiles p ON p.id = pm.user_id
      WHERE
        pm.chapter_id = lc.id
        AND pm.role = 'president'
        AND pm.status = 'active'
      ORDER BY
        pm.joined_at ASC
      LIMIT 1), ''::text) AS president_name,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, lc.id)
        AND al.created_at >= v_start
        AND al.created_at < v_end) AS edits_last_30d,
    -- Photos: count review_images directly (chapter-scoped via
    -- building_posts -> buildings). A photo upload never produces a
    -- building_audit_logs row, so that table cannot answer this — see header.
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.review_images ri
        INNER JOIN public.building_posts bp ON bp.id = ri.review_id
        INNER JOIN public.buildings b ON b.id = bp.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, lc.id)
        AND ri.created_at >= v_start
        AND ri.created_at < v_end) AS photos_last_30d,
    (
      SELECT
        MAX(al.created_at)
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, lc.id)) AS last_activity_at
  FROM
    public.ambassador_chapters lc
  WHERE
    lc.parent_chapter_id = p_national_chapter_id
    AND lc.type = 'local'
    AND lc.status = 'active'
  ORDER BY
    lc.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_national_chapter_overview (uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_national_chapter_overview (uuid) TO authenticated;
