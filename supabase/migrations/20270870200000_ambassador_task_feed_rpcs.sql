-- Embassy task feed: chapter-scoped building/company queries + personal audit timeline.
-- SECURITY DEFINER RPCs; callers must be active members of p_chapter_id (or admin).
-- Apply via Supabase SQL Editor after prior ambassador migrations.

-- ── Internal helpers (no EXECUTE grant to authenticated) ─────────────────

CREATE OR REPLACE FUNCTION public._ambassador_can_access_chapter (p_chapter_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
  SELECT
    public.is_admin ()
    OR EXISTS (
      SELECT
        1
      FROM
        public.ambassador_memberships m
      WHERE
        m.user_id = (SELECT auth.uid())
        AND m.chapter_id = p_chapter_id
        AND m.status = 'active');

$$;

CREATE OR REPLACE FUNCTION public._building_in_ambassador_chapter_scope (p_building_id uuid, p_chapter_id uuid)
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
        public.buildings b
        CROSS JOIN public.ambassador_chapters c
      WHERE
        b.id = p_building_id
        AND c.id = p_chapter_id
        AND COALESCE(b.is_deleted, FALSE) = FALSE
        AND (
          (c.type = 'local'
            AND b.locality_id IS NOT NULL
            AND b.locality_id = c.locality_id)
          OR (c.type = 'national'
            AND (
              upper(COALESCE(b.country_code, '')) = c.country_code
              OR EXISTS (
                SELECT
                  1
                FROM
                  public.localities l
                WHERE
                  l.id = b.locality_id
                  AND upper(l.country_code) = c.country_code)))));

$$;

REVOKE ALL ON FUNCTION public._ambassador_can_access_chapter (uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public._building_in_ambassador_chapter_scope (uuid, uuid) FROM PUBLIC;

-- ── Task feed RPCs ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ambassador_buildings_without_photos (p_chapter_id uuid, p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    short_id integer,
    slug text,
    name text,
    city text,
    country text,
    popularity_score double precision,
    hero_image_url text)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
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
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.popularity_score::double precision,
    b.hero_image_url::text
  FROM
    public.buildings b
  WHERE
    COALESCE(b.is_deleted, FALSE) = FALSE
    AND public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
    AND b.hero_image_url IS NULL
    AND NOT EXISTS (
      SELECT
        1
      FROM
        public.user_buildings ub
        INNER JOIN public.review_images ri ON ri.review_id = ub.id
      WHERE
        ub.building_id = b.id)
  ORDER BY
    b.popularity_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_buildings_missing_metadata (p_chapter_id uuid, p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    short_id integer,
    slug text,
    name text,
    city text,
    country text,
    popularity_score double precision,
    year_completed integer,
    has_styles boolean,
    has_architect_credit boolean)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
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
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.popularity_score::double precision,
    b.year_completed,
    EXISTS (
      SELECT
        1
      FROM
        public.building_styles bs
      WHERE
        bs.building_id = b.id) AS has_styles,
    EXISTS (
      SELECT
        1
      FROM
        public.building_credits bc
      WHERE
        bc.building_id = b.id
        AND bc.status IN ('active', 'verified')
        AND bc.credit_tier = 'primary'
        AND bc.role = 'design_architect') AS has_architect_credit
  FROM
    public.buildings b
  WHERE
    public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
    AND (
      b.year_completed IS NULL
      OR NOT EXISTS (
        SELECT
          1
        FROM
          public.building_styles bs2
        WHERE
          bs2.building_id = b.id)
      OR NOT EXISTS (
        SELECT
          1
        FROM
          public.building_credits bc2
        WHERE
          bc2.building_id = b.id
          AND bc2.status IN ('active', 'verified')
          AND bc2.credit_tier = 'primary'
          AND bc2.role = 'design_architect'))
  ORDER BY
    b.popularity_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_unclaimed_firms (p_chapter_id uuid, p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    slug text,
    name text,
    country text,
    building_count bigint,
    claim_status text)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
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
    co.id,
    co.slug::text,
    co.name::text,
    co.country::text,
    COUNT(DISTINCT b.id)::bigint AS building_count,
    co.claim_status::text
  FROM
    public.companies co
    INNER JOIN public.building_credits bc ON bc.company_id = co.id
      AND bc.status <> 'hidden'
    INNER JOIN public.buildings b ON b.id = bc.building_id
      AND COALESCE(b.is_deleted, FALSE) = FALSE
  WHERE
    co.claim_status = 'unclaimed'
    AND public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
  GROUP BY
    co.id,
    co.slug,
    co.name,
    co.country,
    co.claim_status
  ORDER BY
    SUM(b.popularity_score) DESC NULLS LAST,
    COUNT(DISTINCT b.id) DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_recent_buildings (p_chapter_id uuid, p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    short_id integer,
    slug text,
    name text,
    city text,
    country text,
    created_at timestamptz,
    hero_image_url text)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
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
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.created_at,
    b.hero_image_url::text
  FROM
    public.buildings b
  WHERE
    public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
    AND b.created_at IS NOT NULL
    AND b.created_at >= (timezone('utc'::text, now()) - interval '30 days')
  ORDER BY
    b.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ambassador_my_audit_timeline (p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    building_id uuid,
    building_name text,
    building_slug text,
    building_short_id integer,
    table_name text,
    operation text,
    created_at timestamptz)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    al.id,
    al.building_id,
    COALESCE(bu.name, '')::text AS building_name,
    COALESCE(bu.slug, '')::text AS building_slug,
    bu.short_id::integer AS building_short_id,
    al.table_name::text,
    al.operation::text,
    al.created_at
  FROM
    public.building_audit_logs al
    LEFT JOIN public.buildings bu ON bu.id = al.building_id
  WHERE
    al.user_id = (SELECT auth.uid())
  ORDER BY
    al.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_buildings_without_photos (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_ambassador_buildings_missing_metadata (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_ambassador_unclaimed_firms (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_ambassador_recent_buildings (uuid, integer) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_ambassador_my_audit_timeline (integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_ambassador_buildings_without_photos (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_buildings_missing_metadata (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_unclaimed_firms (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_recent_buildings (uuid, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_my_audit_timeline (integer) TO authenticated;
