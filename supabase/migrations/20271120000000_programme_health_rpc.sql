-- Programme Health Dashboard RPC
-- Returns pulse stats, 30-day activity trend, flagged chapters, and top 5 chapters
-- in a single call for /admin/programme/health.

CREATE OR REPLACE FUNCTION public.get_programme_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 2. Activity trend: daily edits + photos over last 30 days (UTC)
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
      DATE_TRUNC('day', created_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(*)                                               AS edits,
      COUNT(*) FILTER (
        WHERE table_name = 'buildings'
          AND operation  = 'UPDATE'
          AND NULLIF(TRIM(COALESCE(old_data->>'hero_image_url', '')), '') IS NULL
          AND NULLIF(TRIM(COALESCE(new_data->>'hero_image_url', '')), '') IS NOT NULL
      )                                                      AS photos
    FROM building_audit_logs
    WHERE created_at >= now() - interval '30 days'
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
$$;

REVOKE ALL ON FUNCTION public.get_programme_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_programme_health_summary() TO authenticated;
