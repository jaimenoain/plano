-- Phase 5: National chapter overview RPC; admin locality coverage + program stats;
-- allow national presidents to read metrics/members/activity for child local chapters.

CREATE OR REPLACE FUNCTION public.is_national_president_of_local_chapter_parent (p_chapter_id uuid)
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
        public.ambassador_chapters child
        INNER JOIN public.ambassador_chapters parent ON parent.id = child.parent_chapter_id
        INNER JOIN public.ambassador_memberships m ON m.chapter_id = parent.id
      WHERE
        child.id = p_chapter_id
        AND child.type = 'local'
        AND parent.type = 'national'
        AND m.user_id = (SELECT auth.uid())
        AND m.status = 'active'
        AND m.role = 'president');
$$;

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
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id) OR public.is_national_president_of_local_chapter_parent (p_chapter_id)) THEN
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
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id) OR public.is_national_president_of_local_chapter_parent (p_chapter_id)) THEN
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
  IF NOT (public.is_admin () OR public.is_chapter_leader (p_chapter_id) OR public.is_national_president_of_local_chapter_parent (p_chapter_id)) THEN
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
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.building_audit_logs al
        INNER JOIN public.buildings b ON b.id = al.building_id
          AND COALESCE(b.is_deleted, FALSE) = FALSE
      WHERE
        public._building_in_ambassador_chapter_scope (b.id, lc.id)
        AND al.table_name = 'buildings'
        AND al.operation = 'UPDATE'
        AND al.created_at >= v_start
        AND al.created_at < v_end
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
        AND NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL) AS photos_last_30d,
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

CREATE OR REPLACE FUNCTION public.get_admin_ambassador_locality_coverage ()
  RETURNS TABLE (
    locality_id uuid,
    city text,
    country text,
    country_code text,
    buildings_count integer,
    chapter_id uuid,
    chapter_name text,
    chapter_status text,
    chapter_member_count bigint)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public.is_admin () THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    l.id AS locality_id,
    l.city::text,
    l.country::text,
    l.country_code::text,
    l.buildings_count,
    ch.id AS chapter_id,
    ch.name::text AS chapter_name,
    ch.status::text AS chapter_status,
    CASE WHEN ch.id IS NULL THEN
      0::bigint
    ELSE
      (
        SELECT
          COUNT(*)::bigint
        FROM
          public.ambassador_memberships m
        WHERE
          m.chapter_id = ch.id
          AND m.status = 'active')
    END AS chapter_member_count
  FROM
    public.localities l
    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.name,
        c.status
      FROM
        public.ambassador_chapters c
      WHERE
        c.type = 'local'
        AND c.locality_id = l.id
      ORDER BY
        c.created_at ASC
      LIMIT 1) ch ON TRUE
  ORDER BY
    l.buildings_count DESC NULLS LAST,
    l.city ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_ambassador_program_stats ()
  RETURNS TABLE (
    total_active_memberships bigint,
    pending_applications bigint,
    chapters_active bigint,
    chapters_forming bigint,
    chapters_inactive bigint,
    members_by_country jsonb)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_by_country jsonb;
BEGIN
  IF NOT public.is_admin () THEN
    RETURN;
  END IF;
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object('country_code', t.country_code, 'active_count', t.cnt) ORDER BY t.cnt DESC, t.country_code), '[]'::jsonb) INTO v_by_country
  FROM (
    SELECT
      c.country_code,
      COUNT(*)::bigint AS cnt
    FROM
      public.ambassador_memberships m
      INNER JOIN public.ambassador_chapters c ON c.id = m.chapter_id
    WHERE
      m.status = 'active'
    GROUP BY
      c.country_code) t;
  RETURN QUERY
  SELECT
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_memberships m
      WHERE
        m.status = 'active') AS total_active_memberships,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_applications a
      WHERE
        a.status = 'pending') AS pending_applications,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_chapters c
      WHERE
        c.status = 'active') AS chapters_active,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_chapters c
      WHERE
        c.status = 'forming') AS chapters_forming,
    (
      SELECT
        COUNT(*)::bigint
      FROM
        public.ambassador_chapters c
      WHERE
        c.status = 'inactive') AS chapters_inactive,
    v_by_country;
END;
$$;

REVOKE ALL ON FUNCTION public.is_national_president_of_local_chapter_parent (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_national_president_of_local_chapter_parent (uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_national_chapter_overview (uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_national_chapter_overview (uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_ambassador_locality_coverage () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_ambassador_locality_coverage () TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_ambassador_program_stats () FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_ambassador_program_stats () TO authenticated;
