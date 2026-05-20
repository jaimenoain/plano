-- Fix get_ambassador_recent_buildings: b.n does not exist; column is b.community_preview_url.
-- Migrations 20271105000000 and 20271110000000 were written with this typo, causing every
-- call to the RPC to fail with "column b.n does not exist" → "Failed to load buildings."
-- in the Moderation → Buildings tab.
-- This migration supersedes both and includes the full schema from 20271110000000
-- (moderated_at, moderated_by_username, approved-buildings filter).
-- Feedback id: a1514d04-8527-412d-9b44-412c70657dac

DROP FUNCTION IF EXISTS public.get_ambassador_recent_buildings(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_ambassador_recent_buildings(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 20
)
  RETURNS TABLE (
    id                    uuid,
    short_id              integer,
    slug                  text,
    name                  text,
    city                  text,
    country               text,
    address               text,
    lat                   float8,
    lng                   float8,
    created_at            timestamptz,
    hero_image_url        text,
    n                     text,
    added_by_username     text,
    moderated_at          timestamptz,
    moderated_by_username text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
      SELECT 1 FROM public.ambassador_chapters c WHERE c.id = p_chapter_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text              AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.address::text,
    ST_Y(b.location::geometry)::float8      AS lat,
    ST_X(b.location::geometry)::float8      AS lng,
    b.created_at,
    b.hero_image_url::text,
    b.community_preview_url::text           AS n,
    p_added.username::text                  AS added_by_username,
    b.moderated_at,
    p_mod.username::text                    AS moderated_by_username
  FROM
    public.buildings b
    LEFT JOIN public.profiles p_added ON p_added.id = b.created_by
    LEFT JOIN public.profiles p_mod   ON p_mod.id   = b.moderated_by
  WHERE
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    AND b.created_at IS NOT NULL
    AND b.created_at >= (timezone('utc'::text, now()) - interval '30 days')
    AND b.moderated_at IS NULL
  ORDER BY
    b.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_recent_buildings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_recent_buildings(uuid, integer) TO authenticated;
