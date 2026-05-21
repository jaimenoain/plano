-- Chapter Performance Ranking RPC
-- Returns all chapters with contribution metrics for a given period.
-- p_period_days: number of days to look back; NULL means all time.

CREATE OR REPLACE FUNCTION public.get_chapter_performance_ranking(p_period_days int DEFAULT 30)
RETURNS TABLE (
  chapter_id            uuid,
  chapter_name          text,
  country_code          text,
  chapter_type          text,
  member_count          bigint,
  edits                 bigint,
  photos_added          bigint,
  new_members           bigint,
  applications_approved bigint,
  last_activity_date    timestamptz,
  score                 bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_period_start := CASE
    WHEN p_period_days IS NULL OR p_period_days = 0 THEN NULL
    ELSE now() - (p_period_days || ' days')::interval
  END;

  RETURN QUERY
  WITH chapter_metrics AS (
    SELECT
      c.id                  AS chapter_id,
      c.name                AS chapter_name,
      c.country_code        AS country_code,
      c.type                AS chapter_type,
      -- current active member count
      (
        SELECT COUNT(*)
        FROM ambassador_memberships am
        WHERE am.chapter_id = c.id AND am.status = 'active'
      ) AS member_count,
      -- edits from building_audit_logs in period, scoped to chapter geography
      (
        SELECT COUNT(DISTINCT bal.id)
        FROM building_audit_logs bal
        JOIN buildings b ON b.id = bal.building_id AND (b.is_deleted IS NOT TRUE)
        WHERE (v_period_start IS NULL OR bal.created_at >= v_period_start)
          AND (
            (c.type = 'local'    AND b.locality_id                = c.locality_id)
            OR
            (c.type = 'national' AND upper(b.country_code::text)  = upper(c.country_code))
          )
      ) AS edits,
      -- photos from review_images in period, scoped to chapter geography
      (
        SELECT COUNT(ri.id)
        FROM review_images ri
        JOIN building_posts bp ON bp.id = ri.review_id
        JOIN buildings b ON b.id = bp.building_id AND (b.is_deleted IS NOT TRUE)
        WHERE (v_period_start IS NULL OR ri.created_at >= v_period_start)
          AND (
            (c.type = 'local'    AND b.locality_id                = c.locality_id)
            OR
            (c.type = 'national' AND upper(b.country_code::text)  = upper(c.country_code))
          )
      ) AS photos_added,
      -- new active members who joined in the period
      (
        SELECT COUNT(*)
        FROM ambassador_memberships am
        WHERE am.chapter_id = c.id
          AND am.status = 'active'
          AND (v_period_start IS NULL OR am.created_at >= v_period_start)
      ) AS new_members,
      -- applications approved in the period
      (
        SELECT COUNT(*)
        FROM ambassador_applications aa
        WHERE aa.chapter_id = c.id
          AND aa.status = 'approved'
          AND (v_period_start IS NULL OR aa.reviewed_at >= v_period_start)
      ) AS applications_approved,
      -- last building_audit_log entry for the chapter (any time)
      (
        SELECT MAX(bal.created_at)
        FROM building_audit_logs bal
        JOIN buildings b ON b.id = bal.building_id AND (b.is_deleted IS NOT TRUE)
        WHERE (
          (c.type = 'local'    AND b.locality_id                = c.locality_id)
          OR
          (c.type = 'national' AND upper(b.country_code::text)  = upper(c.country_code))
        )
      ) AS last_activity_date
    FROM ambassador_chapters c
  )
  SELECT
    m.chapter_id,
    m.chapter_name,
    m.country_code,
    m.chapter_type,
    m.member_count,
    m.edits,
    m.photos_added,
    m.new_members,
    m.applications_approved,
    m.last_activity_date,
    (m.edits * 1 + m.photos_added * 2 + m.new_members * 5)::bigint AS score
  FROM chapter_metrics m
  ORDER BY score DESC, m.chapter_name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_performance_ranking(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chapter_performance_ranking(int) TO authenticated;
