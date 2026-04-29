-- Phase 4: Embassy leadership metrics, activity, member directory, president-only membership RPCs.
-- Drops direct UPDATE on memberships for chapter leaders (presidents use RPCs; admins unchanged).

ALTER TABLE public.ambassador_memberships
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles (id);

CREATE INDEX IF NOT EXISTS ambassador_memberships_updated_by_idx ON public.ambassador_memberships (updated_by);

DROP POLICY IF EXISTS "Chapter leaders update ambassador memberships in chapter" ON public.ambassador_memberships;

-- ── Metrics (chapter leaders + admin) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_chapter_metrics (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    total_edits bigint,
    total_photos_added bigint,
    total_building_visits bigint,
    period_start timestamptz,
    period_end timestamptz,
    prev_total_edits bigint,
    prev_total_photos_added bigint,
    prev_total_building_visits bigint,
    prev_period_start timestamptz,
    prev_period_end timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - make_interval(days => greatest(p_days, 1));
  v_prev_end timestamptz := v_start;
  v_prev_start timestamptz := v_prev_end - make_interval(days => greatest(p_days, 1));
BEGIN
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id)) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.created_at >= v_start
        AND al.created_at < v_end) AS total_edits,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.table_name = 'buildings'
        AND al.operation = 'UPDATE'
        AND al.created_at >= v_start
        AND al.created_at < v_end
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL) AS total_photos_added,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.user_buildings ub
        INNER JOIN public.buildings b ON b.id = ub.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND ub.status::text = 'visited'
        AND ub.visited_at IS NOT NULL
        AND ub.visited_at >= v_start
        AND ub.visited_at < v_end) AS total_building_visits,
    v_start AS period_start,
    v_end AS period_end,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.created_at >= v_prev_start
        AND al.created_at < v_prev_end) AS prev_total_edits,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.table_name = 'buildings'
        AND al.operation = 'UPDATE'
        AND al.created_at >= v_prev_start
        AND al.created_at < v_prev_end
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL) AS prev_total_photos_added,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.user_buildings ub
        INNER JOIN public.buildings b ON b.id = ub.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND ub.status::text = 'visited'
        AND ub.visited_at IS NOT NULL
        AND ub.visited_at >= v_prev_start
        AND ub.visited_at < v_prev_end) AS prev_total_building_visits,
    v_prev_start AS prev_period_start,
    v_prev_end AS prev_period_end;
END;
$$;

-- ── Per-member activity (chapter leaders + admin) ─────────────────────────

CREATE OR REPLACE FUNCTION public.get_chapter_ambassador_activity (
  p_chapter_id uuid,
  p_days integer DEFAULT 30
)
  RETURNS TABLE (
    user_id uuid,
    username text,
    avatar_url text,
    role text,
    edits_count bigint,
    photos_added bigint,
    last_active_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_end timestamptz := timezone('utc'::text, now());
  v_start timestamptz := v_end - make_interval(days => greatest(p_days, 1));
BEGIN
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id)) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    m.user_id,
    COALESCE(p.username, '')::text AS username,
    p.avatar_url::text,
    m.role::text,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.user_id = m.user_id
        AND al.created_at >= v_start
        AND al.created_at < v_end) AS edits_count,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.user_id = m.user_id
        AND al.table_name = 'buildings'
        AND al.operation = 'UPDATE'
        AND al.created_at >= v_start
        AND al.created_at < v_end
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL) AS photos_added,
    (
      SELECT
        MAX(al.created_at)
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
        AND al.user_id = m.user_id) AS last_active_at
  FROM
    public.ambassador_memberships m
    INNER JOIN public.profiles p ON p.id = m.user_id
  WHERE
    m.chapter_id = p_chapter_id
    AND m.status = 'active'
  ORDER BY
    last_active_at DESC NULLS LAST,
    username ASC NULLS LAST;
END;
$$;

-- ── Member directory with login email (chapter leaders + admin) ──────────

CREATE OR REPLACE FUNCTION public.get_chapter_members_with_contact (
  p_chapter_id uuid
)
  RETURNS TABLE (
    membership_id uuid,
    user_id uuid,
    username text,
    avatar_url text,
    email text,
    role text,
    exco_responsibility text,
    status text,
    joined_at timestamptz,
    invited_by uuid)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id)) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.ambassador_chapters c
    WHERE
      c.id = p_chapter_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    m.id AS membership_id,
    m.user_id,
    COALESCE(p.username, '')::text AS username,
    p.avatar_url::text,
    COALESCE(au.email, '')::text AS email,
    m.role::text,
    m.exco_responsibility::text,
    m.status::text,
    m.joined_at,
    m.invited_by
  FROM
    public.ambassador_memberships m
    INNER JOIN public.profiles p ON p.id = m.user_id
    LEFT JOIN auth.users au ON au.id = m.user_id
  WHERE
    m.chapter_id = p_chapter_id
  ORDER BY
    m.joined_at ASC;
END;
$$;

-- ── President: invite member (INSERT bypass) ──────────────────────────────

CREATE OR REPLACE FUNCTION public.president_invite_ambassador_member (
  p_chapter_id uuid,
  p_user_id uuid,
  p_role text,
  p_exco_responsibility text DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
  v_chapter public.ambassador_chapters;
  v_amb_count integer;
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF NOT public.is_chapter_president (p_chapter_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_role NOT IN ('ambassador', 'exco') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF p_role = 'exco' AND (p_exco_responsibility IS NULL OR trim(p_exco_responsibility) = '') THEN
    RAISE EXCEPTION 'exco_requires_responsibility';
  END IF;
  IF p_role = 'ambassador' AND p_exco_responsibility IS NOT NULL THEN
    RAISE EXCEPTION 'invalid_exco_for_role';
  END IF;
  SELECT
    * INTO v_chapter
  FROM
    public.ambassador_chapters
  WHERE
    id = p_chapter_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'chapter_not_found';
  END IF;
  IF EXISTS (
    SELECT
      1
    FROM
      public.ambassador_memberships m
    WHERE
      m.user_id = p_user_id) THEN
    RAISE EXCEPTION 'user_already_has_membership';
  END IF;
  IF p_role = 'ambassador' THEN
    SELECT
      COUNT(*)::integer INTO v_amb_count
    FROM
      public.ambassador_memberships m
    WHERE
      m.chapter_id = p_chapter_id
      AND m.role = 'ambassador'
      AND m.status = 'active';
    IF v_amb_count >= v_chapter.max_ambassadors THEN
      RAISE EXCEPTION 'chapter_full';
    END IF;
  END IF;
  INSERT INTO public.ambassador_memberships (chapter_id, user_id, role, exco_responsibility, status, invited_by)
    VALUES (p_chapter_id, p_user_id, p_role, CASE WHEN p_role = 'exco' THEN trim(p_exco_responsibility)::text ELSE NULL END, 'active', v_uid)
  RETURNING
    id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

-- ── President: update membership role / status ────────────────────────────

CREATE OR REPLACE FUNCTION public.president_update_chapter_membership (
  p_membership_id uuid,
  p_role text,
  p_exco_responsibility text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_uid uuid := auth.uid ();
  v_row public.ambassador_memberships;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT
    * INTO v_row
  FROM
    public.ambassador_memberships
  WHERE
    id = p_membership_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership_not_found';
  END IF;
  IF NOT public.is_chapter_president (v_row.chapter_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_row.user_id = v_uid AND p_role IS NOT NULL AND p_role::text <> v_row.role::text THEN
    RAISE EXCEPTION 'cannot_change_own_role';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('president', 'exco', 'ambassador') THEN
    RAISE EXCEPTION 'invalid_role';
  END IF;
  IF COALESCE(p_role, v_row.role) = 'exco' THEN
    IF p_exco_responsibility IS NULL OR trim(p_exco_responsibility) = '' THEN
      IF v_row.role <> 'exco' OR v_row.exco_responsibility IS NULL THEN
        RAISE EXCEPTION 'exco_requires_responsibility';
      END IF;
    END IF;
  END IF;
  IF COALESCE(p_role, v_row.role) <> 'exco' AND p_exco_responsibility IS NOT NULL AND trim(p_exco_responsibility) <> '' THEN
    RAISE EXCEPTION 'invalid_exco_for_role';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'inactive', 'pending_review') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  UPDATE
    public.ambassador_memberships m
  SET
    role = COALESCE(p_role, m.role),
    exco_responsibility = CASE
      WHEN COALESCE(p_role, m.role) = 'exco' THEN CASE
          WHEN p_exco_responsibility IS NOT NULL AND trim(p_exco_responsibility) <> '' THEN trim(p_exco_responsibility)::text
          ELSE m.exco_responsibility
        END
      ELSE NULL::text
    END,
    status = COALESCE(p_status, m.status),
    updated_by = v_uid
  WHERE
    m.id = p_membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_chapter_metrics (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_chapter_ambassador_activity (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_chapter_members_with_contact (uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.president_invite_ambassador_member (uuid, uuid, text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.president_update_chapter_membership (uuid, text, text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_chapter_metrics (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_chapter_ambassador_activity (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_chapter_members_with_contact (uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.president_invite_ambassador_member (uuid, uuid, text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.president_update_chapter_membership (uuid, text, text, text) TO authenticated;
