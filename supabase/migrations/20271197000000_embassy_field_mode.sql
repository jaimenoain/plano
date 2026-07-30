-- Field mode for photography (Roadmap 4.3) — the buildings nearest you that need a photo.
--
-- public.get_ambassador_nearby_photo_gaps() answers "what should I photograph from where I am
-- standing": the caller's own chapter's photo gaps within a radius, nearest first, with
-- coordinates. /embassy/field renders it one-tap-from-the-camera on a phone.
--
-- ── Design notes ──
--
-- 1. A NEW FUNCTION, NOT A FLAG ON THE OLD ONE. get_ambassador_buildings_without_photos
--    returns no coordinates at all and sorts by popularity_score, so a client cannot compute
--    distance from what it returns. Distance ordering has to happen here, against the GiST
--    index buildings_location_idx. The two functions answer different questions and stay
--    separate; they share only the gap predicate, which is now identical in both.
--
-- 2. NO PER-ROW SCOPE HELPER. _building_in_ambassador_chapter_scope() is not called.
--    20271151000000's header records that per-row calls to it blew the statement timeout and
--    returned HTTP 500s. The chapter row is read once into locals and its locality/country
--    predicate inlined, the way compute_weekly_digest_payloads does it set-based.
--
-- 3. THE GAP PREDICATE WAS BROKEN, AND THIS FEATURE WOULD HAVE SAT ON IT. The old test was
--
--      NOT EXISTS (SELECT 1 FROM user_buildings ub
--                  JOIN review_images ri ON ri.review_id = ub.id
--                  WHERE ub.building_id = b.id)
--
--    but review_images.review_id is a FK to building_posts.id, NOT user_buildings.id. It has
--    worked by accident: 18009 of 18021 building_posts rows carry the same uuid as their
--    user_buildings row, a legacy 1:1 artefact. Every post created by the CURRENT code path
--    gets a fresh id and is invisible to that join — verified on prod, all 7 posts created
--    since April 2026 are invisible to it, and 3 buildings already list as needing photos
--    while having some. That includes every upload made through 2.2's in-tool sheet, which is
--    exactly what field mode uses: photograph a building and it would never leave the queue.
--    Both functions now join review_images through building_posts.
--    User-visible effect: buildings that already have photos stop being offered as gaps.
--
-- 4. BOUNDED INPUT. Radius is clamped to 50 km and limit to 100 in the body, so a hand-edited
--    request cannot turn a street-corner query into a table scan.
--
-- The 'no photos' bar stays strict — hero_image_url IS NULL and zero photos — which is
-- deliberately narrower than the map's 0 / 1-2 / 3+ gap buckets (20271103000000). In the
-- street you want somewhere that has nothing at all.

-- ─── 1. Nearest photo gaps ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ambassador_nearby_photo_gaps (
  p_chapter_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_meters integer DEFAULT 2000,
  p_limit integer DEFAULT 30)
  RETURNS TABLE (
    id uuid,
    short_id integer,
    slug text,
    name text,
    city text,
    lat double precision,
    lng double precision,
    dist_meters double precision,
    popularity_score double precision)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_chapter    public.ambassador_chapters%ROWTYPE;
  v_radius     integer := LEAST(GREATEST(COALESCE(p_radius_meters, 2000), 100), 50000);
  v_limit      integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
  v_origin     geography;
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
    RETURN;
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_chapter FROM public.ambassador_chapters c WHERE c.id = p_chapter_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_origin := st_point(p_lng, p_lat)::geography;

  RETURN QUERY
  SELECT
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text,
    b.name::text,
    b.city::text,
    st_y(b.location::geometry)::double precision,
    st_x(b.location::geometry)::double precision,
    st_distance(b.location, v_origin)::double precision AS dist_meters,
    b.popularity_score::double precision
  FROM
    public.buildings b
  WHERE
    COALESCE(b.is_deleted, FALSE) = FALSE
    AND b.location IS NOT NULL
    AND st_dwithin(b.location, v_origin, v_radius)
    -- Chapter scope, inlined — see design note 2.
    AND (
      (v_chapter.type = 'local'
        AND b.locality_id IS NOT NULL
        AND b.locality_id = v_chapter.locality_id)
      OR (v_chapter.type = 'national'
        AND (
          upper(COALESCE(b.country_code, '')) = v_chapter.country_code
          OR EXISTS (
            SELECT 1
            FROM   public.localities l
            WHERE  l.id = b.locality_id
              AND  upper(l.country_code) = v_chapter.country_code)))
    )
    -- Nothing photographed yet — see design note 3.
    AND b.hero_image_url IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM   public.review_images ri
             INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      WHERE  bp.building_id = b.id)
  ORDER BY
    dist_meters
  LIMIT v_limit;
END;
$$;

COMMENT ON FUNCTION public.get_ambassador_nearby_photo_gaps (uuid, double precision, double precision, integer, integer) IS
  'Roadmap 4.3. Buildings in the caller''s chapter with no photo at all, within p_radius_meters of (p_lat, p_lng), nearest first, with coordinates. Chapter scope is inlined (never the per-row helper); radius and limit are clamped.';

-- ─── 2. Same gap predicate in the list-view queue ─────────────────────────────
--
-- Body is the live definition verbatim (pg_get_functiondef, 2026-07-30) with only the
-- review_images join corrected, so the desk list and the field list can never disagree about
-- what counts as a gap.

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
        public.review_images ri
        INNER JOIN public.building_posts bp ON bp.id = ri.review_id
      WHERE
        bp.building_id = b.id)
  ORDER BY
    b.popularity_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- ─── 3. Grants ────────────────────────────────────────────────────────────────
--
-- REVOKE ... FROM PUBLIC is NOT sufficient on Supabase: ALTER DEFAULT PRIVILEGES grants
-- EXECUTE to anon and authenticated DIRECTLY at creation, so the roles must be named (#1671).
-- Field mode is an ambassador surface; the RPC gates on _ambassador_can_access_chapter, but
-- anon has no business reaching it at all.

REVOKE ALL ON FUNCTION public.get_ambassador_nearby_photo_gaps (uuid, double precision, double precision, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_ambassador_nearby_photo_gaps (uuid, double precision, double precision, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ambassador_buildings_without_photos (uuid, integer) TO authenticated;
