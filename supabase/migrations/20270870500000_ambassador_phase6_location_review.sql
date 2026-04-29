-- Phase 6: profile geography vs chapter mismatch → pending_review + notifications;
-- embassy access for pending_review; notification type; submit guard.

-- ── Notifications: ambassador_membership_review ─────────────────────────────

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'follow',
      'like',
      'comment',
      'recommendation',
      'friend_joined',
      'suggest_follow',
      'visit_request',
      'architect_verification',
      'ambassador_application_received',
      'ambassador_application_approved',
      'ambassador_application_rejected',
      'ambassador_membership_review'
    )
  );

-- ── Internal: free-text profile vs chapter geography (heuristic, mirrors client) ──

CREATE OR REPLACE FUNCTION public._ambassador_profile_matches_chapter (
  p_country text,
  p_location text,
  p_chapter public.ambassador_chapters
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_loc text := trim(coalesce(p_location, ''));
  v_cty text := trim(coalesce(p_country, ''));
  v_safe_loc text;
  v_safe_cty text;
  v_cc text;
BEGIN
  IF p_chapter.type = 'national' THEN
    v_cc := NULL;
    IF length(v_loc) >= 2 THEN
      v_safe_loc := replace(v_loc, '%', '');
      SELECT
        upper(l.country_code) INTO v_cc
      FROM
        public.localities l
      WHERE (l.city ILIKE '%' || v_safe_loc || '%'
        OR l.country ILIKE '%' || v_safe_loc || '%')
      LIMIT 1;
    END IF;
    IF v_cc IS NULL AND length(v_cty) >= 2 THEN
      v_safe_cty := replace(v_cty, '%', '');
      SELECT
        upper(l.country_code) INTO v_cc
      FROM
        public.localities l
      WHERE (l.country ILIKE '%' || v_safe_cty || '%')
      LIMIT 1;
    END IF;
    RETURN v_cc IS NOT NULL AND v_cc = upper(p_chapter.country_code);
  END IF;

  -- local chapter
  IF p_chapter.locality_id IS NULL THEN
    RETURN false;
  END IF;
  IF length(v_loc) < 2 THEN
    RETURN false;
  END IF;
  v_safe_loc := replace(v_loc, '%', '');
  RETURN EXISTS (
    SELECT
      1
    FROM
      public.localities l
    WHERE
      l.id = p_chapter.locality_id
      AND (l.city ILIKE '%' || v_safe_loc || '%'
        OR l.country ILIKE '%' || v_safe_loc || '%'));
END;
$$;

REVOKE ALL ON FUNCTION public._ambassador_profile_matches_chapter (text, text, public.ambassador_chapters) FROM PUBLIC;

-- ── True when user may open /embassy (active or location-review pending) ───

CREATE OR REPLACE FUNCTION public.has_embassy_portal_access ()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    EXISTS (
      SELECT
        1
      FROM
        public.ambassador_memberships m
      WHERE
        m.user_id = (SELECT auth.uid())
        AND m.status IN ('active', 'pending_review'));
$$;

REVOKE ALL ON FUNCTION public.has_embassy_portal_access () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_embassy_portal_access () TO authenticated;

-- ── After profile country/location save: flag membership + notify leaders ───

CREATE OR REPLACE FUNCTION public.sync_ambassador_membership_after_profile_geography ()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_m public.ambassador_memberships;
  v_chapter public.ambassador_chapters;
  v_matches boolean;
  v_actor_username text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT
    * INTO v_profile
  FROM
    public.profiles
  WHERE
    id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'no_profile');
  END IF;
  SELECT
    m.* INTO v_m
  FROM
    public.ambassador_memberships m
  WHERE
    m.user_id = v_uid
    AND m.status = 'active'
  FOR UPDATE
    OF m;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'no_active_membership');
  END IF;
  SELECT
    * INTO v_chapter
  FROM
    public.ambassador_chapters
  WHERE
    id = v_m.chapter_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('action', 'chapter_missing');
  END IF;
  v_matches := public._ambassador_profile_matches_chapter(v_profile.country, v_profile.location, v_chapter);
  IF v_matches THEN
    RETURN jsonb_build_object('action', 'still_matches');
  END IF;
  UPDATE
    public.ambassador_memberships
  SET
    status = 'pending_review'
  WHERE
    id = v_m.id;
  v_actor_username := v_profile.username;
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT
    lm.user_id,
    v_uid,
    'ambassador_membership_review'::text,
    jsonb_build_object('membership_id', v_m.id, 'chapter_id', v_chapter.id, 'chapter_name', v_chapter.name, 'member_username', coalesce(v_actor_username, 'member'))
  FROM
    public.ambassador_memberships lm
  WHERE
    lm.chapter_id = v_chapter.id
    AND lm.status = 'active'
    AND lm.role IN ('president', 'exco');
  RETURN jsonb_build_object('action', 'flagged_pending_review');
END;
$$;

REVOKE ALL ON FUNCTION public.sync_ambassador_membership_after_profile_geography () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sync_ambassador_membership_after_profile_geography () TO authenticated;

-- ── submit_ambassador_application: block active or pending_review membership ─

CREATE OR REPLACE FUNCTION public.submit_ambassador_application (
  p_chapter_id uuid,
  p_motivation_text text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_app_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF char_length(trim(p_motivation_text)) < 100 THEN
    RAISE EXCEPTION 'motivation_too_short';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = v_uid
      AND m.status IN ('active', 'pending_review')) THEN
    RAISE EXCEPTION 'already_member';
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id
      AND c.status IN ('active', 'forming')) THEN
    RAISE EXCEPTION 'invalid_chapter';
  END IF;
  INSERT INTO public.ambassador_applications (user_id, chapter_id, motivation_text)
    VALUES (v_uid, p_chapter_id, trim(p_motivation_text))
  RETURNING
    id INTO v_app_id;
  INSERT INTO public.notifications (user_id, actor_id, type, metadata)
  SELECT
    m.user_id,
    v_uid,
    'ambassador_application_received'::text,
    jsonb_build_object('application_id', v_app_id, 'chapter_id', p_chapter_id)
  FROM
    public.ambassador_memberships m
  WHERE
    m.chapter_id = p_chapter_id
    AND m.status = 'active'
    AND m.role IN ('president', 'exco');
  RETURN v_app_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'pending_exists';
END;
$$;
