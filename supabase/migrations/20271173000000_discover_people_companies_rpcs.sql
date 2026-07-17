-- Viewport-bounded discover RPCs for the /search People & Companies tabs
-- (browse mode, i.e. no active query). Replaces the old client-side pipeline of
-- find_nearby_buildings (unbounded, per-row main_image_url()) + a 300-UUID
-- .in(building_id) filter + client-side credit tallying, which timed out at the
-- default world zoom.
--
-- Ranking: COUNT(DISTINCT building_id) of active/verified building_credits on
-- non-deleted buildings inside the bbox. The LIMIT is applied inside the
-- aggregate CTE so even a world-sized bbox only touches p_limit entity rows.
--
-- Bbox handling mirrors get_buildings_list exactly: clamp to valid lat/lng
-- ranges; viewports wider than 179° use the geometry && envelope (a geography
-- envelope that wide would wrap the short way). No antimeridian (west > east)
-- wrap — identical to get_buildings_list, so the tabs stay consistent with the
-- Buildings list.
--
-- SECURITY DEFINER matches the search_people_v2 / get_buildings_list family:
-- reads public data only, visibility enforced explicitly (credit status
-- active/verified, buildings not deleted). No caller-derived SQL.

CREATE OR REPLACE FUNCTION public.discover_people(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  claim_status text,
  nationality  text,
  avatar_url   text,
  credit_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH bbox AS (
    SELECT
      GREATEST(-90.0,  min_lat) AS s,
      LEAST(90.0,      max_lat) AS n,
      GREATEST(-180.0, min_lng) AS w,
      LEAST(180.0,     max_lng) AS e
  ),
  bbox_buildings AS (
    SELECT b.id
    FROM buildings b, bbox
    WHERE (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND b.location IS NOT NULL
      AND (
        ((bbox.e - bbox.w) > 179
          AND b.location::geometry && st_makeenvelope(bbox.w, bbox.s, bbox.e, bbox.n, 4326))
        OR ((bbox.e - bbox.w) <= 179
          AND b.location && st_makeenvelope(bbox.w, bbox.s, bbox.e, bbox.n, 4326)::geography)
      )
  ),
  ranked AS (
    SELECT bc.person_id, COUNT(DISTINCT bc.building_id) AS cnt
    FROM building_credits bc
    JOIN bbox_buildings bb ON bb.id = bc.building_id
    WHERE bc.person_id IS NOT NULL
      AND bc.status IN ('active', 'verified')
    GROUP BY bc.person_id
    ORDER BY cnt DESC, bc.person_id
    LIMIT p_limit
  )
  SELECT pe.id, pe.name, pe.slug, pe.claim_status::text,
         pe.nationality, pe.avatar_url, r.cnt::bigint AS credit_count
  FROM ranked r
  JOIN people pe ON pe.id = r.person_id
  ORDER BY r.cnt DESC, pe.name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.discover_people(double precision, double precision, double precision, double precision, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.discover_people(double precision, double precision, double precision, double precision, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.discover_companies(
  min_lat double precision,
  max_lat double precision,
  min_lng double precision,
  max_lng double precision,
  p_limit int DEFAULT 30
)
RETURNS TABLE (
  id           uuid,
  name         text,
  slug         text,
  claim_status text,
  country      text,
  logo_url     text,
  credit_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH bbox AS (
    SELECT
      GREATEST(-90.0,  min_lat) AS s,
      LEAST(90.0,      max_lat) AS n,
      GREATEST(-180.0, min_lng) AS w,
      LEAST(180.0,     max_lng) AS e
  ),
  bbox_buildings AS (
    SELECT b.id
    FROM buildings b, bbox
    WHERE (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
      AND b.location IS NOT NULL
      AND (
        ((bbox.e - bbox.w) > 179
          AND b.location::geometry && st_makeenvelope(bbox.w, bbox.s, bbox.e, bbox.n, 4326))
        OR ((bbox.e - bbox.w) <= 179
          AND b.location && st_makeenvelope(bbox.w, bbox.s, bbox.e, bbox.n, 4326)::geography)
      )
  ),
  ranked AS (
    SELECT bc.company_id, COUNT(DISTINCT bc.building_id) AS cnt
    FROM building_credits bc
    JOIN bbox_buildings bb ON bb.id = bc.building_id
    WHERE bc.company_id IS NOT NULL
      AND bc.status IN ('active', 'verified')
    GROUP BY bc.company_id
    ORDER BY cnt DESC, bc.company_id
    LIMIT p_limit
  )
  SELECT co.id, co.name, co.slug, co.claim_status::text,
         co.country, co.logo_url, r.cnt::bigint AS credit_count
  FROM ranked r
  JOIN companies co ON co.id = r.company_id
  ORDER BY r.cnt DESC, co.name ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.discover_companies(double precision, double precision, double precision, double precision, int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.discover_companies(double precision, double precision, double precision, double precision, int) TO anon, authenticated;
