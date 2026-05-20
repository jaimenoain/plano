-- get_president_directory: returns all active chapter presidents with their
-- chapter metadata, activity metrics, and ExCo member list for the
-- Programme → Presidents admin view.

DROP FUNCTION IF EXISTS get_president_directory();

CREATE FUNCTION get_president_directory()
RETURNS TABLE (
  president_user_id    uuid,
  president_username   text,
  president_avatar_url text,
  chapter_id           uuid,
  chapter_name         text,
  country_code         text,
  chapter_status       text,
  member_count         bigint,
  last_active_at       timestamptz,
  edits_30d            bigint,
  open_applications    bigint,
  member_since         timestamptz,
  exco_members         jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.user_id                                       AS president_user_id,
    p.username                                      AS president_username,
    p.avatar_url                                    AS president_avatar_url,
    c.id                                            AS chapter_id,
    c.name                                          AS chapter_name,
    c.country_code                                  AS country_code,
    c.status::text                                  AS chapter_status,
    (
      SELECT COUNT(*)
      FROM ambassador_memberships am2
      WHERE am2.chapter_id = c.id AND am2.status = 'active'
    )                                               AS member_count,
    (
      SELECT MAX(bal.created_at)
      FROM building_audit_logs bal
      WHERE bal.user_id = m.user_id
    )                                               AS last_active_at,
    (
      SELECT COUNT(*)
      FROM building_audit_logs bal
      WHERE bal.user_id = m.user_id
        AND bal.created_at >= NOW() - INTERVAL '30 days'
    )                                               AS edits_30d,
    (
      SELECT COUNT(*)
      FROM ambassador_applications aa
      WHERE aa.chapter_id = c.id AND aa.status = 'pending'
    )                                               AS open_applications,
    m.created_at                                    AS member_since,
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'user_id',             em.user_id,
            'username',            ep.username,
            'avatar_url',          ep.avatar_url,
            'exco_responsibility', em.exco_responsibility
          )
          ORDER BY em.created_at
        ),
        '[]'::jsonb
      )
      FROM ambassador_memberships em
      JOIN profiles ep ON ep.id = em.user_id
      WHERE em.chapter_id = c.id
        AND em.role = 'exco'
        AND em.status = 'active'
    )                                               AS exco_members
  FROM ambassador_memberships m
  JOIN profiles p ON p.id = m.user_id
  JOIN ambassador_chapters c ON c.id = m.chapter_id
  WHERE m.role = 'president'
    AND m.status = 'active'
  ORDER BY c.country_code, c.name;
$$;

REVOKE ALL ON FUNCTION get_president_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_president_directory() TO authenticated;
