-- Phase 7: President Onboarding Tracker
-- Adds two RPCs:
--   get_president_onboarding_status(p_membership_id) — per-president checklist (president self-view)
--   get_president_onboarding_list()                  — all new presidents (<60d) with step counts (admin)

-- ─── Per-president checklist ──────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_president_onboarding_status(uuid);

CREATE FUNCTION public.get_president_onboarding_status(p_membership_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_chapter_id uuid;
  v_joined_at  timestamptz;
BEGIN
  SELECT user_id, chapter_id, joined_at
  INTO   v_user_id, v_chapter_id, v_joined_at
  FROM   ambassador_memberships
  WHERE  id = p_membership_id
    AND  role = 'president'
    AND  status = 'active';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'membership_id', p_membership_id,
    'days_in_role',  GREATEST(0, EXTRACT(EPOCH FROM (now() - v_joined_at))::integer / 86400),

    -- Step 1: avatar set + bio non-empty
    'profile_complete', COALESCE(
      (SELECT avatar_url IS NOT NULL AND bio IS NOT NULL AND bio <> ''
       FROM profiles WHERE id = v_user_id),
      false
    ),

    -- Step 2: chapter status = active
    'chapter_active', COALESCE(
      (SELECT status = 'active' FROM ambassador_chapters WHERE id = v_chapter_id),
      false
    ),

    -- Step 3: ≥ 2 active members in chapter (president + at least one other)
    'first_member_invited', (
      SELECT COUNT(*) >= 2
      FROM ambassador_memberships
      WHERE chapter_id = v_chapter_id AND status = 'active'
    ),

    -- Step 4: at least one application approved or rejected
    'first_application_reviewed', EXISTS(
      SELECT 1 FROM ambassador_applications
      WHERE chapter_id = v_chapter_id AND status IN ('approved', 'rejected')
    ),

    -- Step 5: president has made at least one building edit
    'first_audit_entry', EXISTS(
      SELECT 1 FROM building_audit_logs WHERE user_id = v_user_id
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_president_onboarding_status(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_president_onboarding_status(uuid) TO authenticated;


-- ─── Admin list: all new presidents with step counts ─────────────────────────

DROP FUNCTION IF EXISTS public.get_president_onboarding_list();

CREATE FUNCTION public.get_president_onboarding_list()
RETURNS TABLE (
  membership_id        uuid,
  president_user_id    uuid,
  president_username   text,
  president_avatar_url text,
  chapter_id           uuid,
  chapter_name         text,
  country_code         text,
  days_in_role         integer,
  steps_completed      integer,
  last_active_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    m.id                                                                    AS membership_id,
    m.user_id                                                               AS president_user_id,
    p.username::text                                                        AS president_username,
    p.avatar_url::text                                                      AS president_avatar_url,
    m.chapter_id                                                            AS chapter_id,
    c.name::text                                                            AS chapter_name,
    c.country_code::text                                                    AS country_code,
    GREATEST(0, EXTRACT(EPOCH FROM (now() - m.joined_at))::integer / 86400) AS days_in_role,
    (
      -- profile_complete
      CASE WHEN (p.avatar_url IS NOT NULL AND p.bio IS NOT NULL AND p.bio <> '') THEN 1 ELSE 0 END +
      -- chapter_active
      CASE WHEN c.status = 'active' THEN 1 ELSE 0 END +
      -- first_member_invited
      CASE WHEN (
        SELECT COUNT(*) FROM ambassador_memberships m2
        WHERE m2.chapter_id = m.chapter_id AND m2.status = 'active'
      ) >= 2 THEN 1 ELSE 0 END +
      -- first_application_reviewed
      CASE WHEN EXISTS(
        SELECT 1 FROM ambassador_applications aa
        WHERE aa.chapter_id = m.chapter_id AND aa.status IN ('approved', 'rejected')
      ) THEN 1 ELSE 0 END +
      -- first_audit_entry
      CASE WHEN EXISTS(
        SELECT 1 FROM building_audit_logs bal WHERE bal.user_id = m.user_id
      ) THEN 1 ELSE 0 END
    )::integer                                                              AS steps_completed,
    (
      SELECT MAX(bal2.created_at)
      FROM building_audit_logs bal2
      WHERE bal2.user_id = m.user_id
    )                                                                       AS last_active_at
  FROM ambassador_memberships m
  JOIN profiles p          ON p.id = m.user_id
  JOIN ambassador_chapters c ON c.id = m.chapter_id
  WHERE m.role = 'president'
    AND m.status = 'active'
    AND m.joined_at > now() - INTERVAL '60 days'
  ORDER BY days_in_role DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_president_onboarding_list() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_president_onboarding_list() TO authenticated;
