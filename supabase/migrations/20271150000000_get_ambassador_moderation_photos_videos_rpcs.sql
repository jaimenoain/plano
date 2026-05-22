-- Adds get_ambassador_moderation_photos and get_ambassador_moderation_videos RPCs.
-- Root cause: fetchModerationPhotos() and fetchModerationVideos() fetched ALL
-- unmoderated content globally — no chapter or geography filter. Ambassadors were
-- seeing photos and videos from every city/country, not just their own chapter scope.
-- Fix: scope both fetches to the ambassador's chapter using the same
-- _building_in_ambassador_chapter_scope guard used by the credits and buildings RPCs.
-- Feedback id: b9c5a040-9108-4c36-829e-4413ab73bb14

CREATE OR REPLACE FUNCTION public.get_ambassador_moderation_photos(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 100
)
  RETURNS TABLE (
    id                uuid,
    created_at        timestamptz,
    storage_path      text,
    caption           text,
    building_id       uuid,
    building_name     text,
    building_slug     text,
    building_short_id integer
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

  RETURN QUERY
  SELECT
    ri.id,
    ri.created_at,
    ri.storage_path::text,
    ri.caption::text,
    b.id                               AS building_id,
    b.name::text                       AS building_name,
    COALESCE(b.slug, '')::text         AS building_slug,
    b.short_id::integer                AS building_short_id
  FROM
    public.review_images  ri
    JOIN public.building_posts bp ON bp.id = ri.review_id
    JOIN public.buildings      b  ON b.id  = bp.building_id
  WHERE
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    AND ri.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    ri.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_moderation_photos(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_moderation_photos(uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_ambassador_moderation_videos(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 20
)
  RETURNS TABLE (
    id                uuid,
    created_at        timestamptz,
    video_url         text,
    title             text,
    body              text,
    uploader_username text,
    building_id       uuid,
    building_name     text,
    building_slug     text,
    building_short_id integer
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

  RETURN QUERY
  SELECT
    bp.id,
    bp.created_at,
    bp.video_url::text,
    bp.title::text,
    bp.body::text,
    pr.username::text                  AS uploader_username,
    b.id                               AS building_id,
    b.name::text                       AS building_name,
    COALESCE(b.slug, '')::text         AS building_slug,
    b.short_id::integer                AS building_short_id
  FROM
    public.building_posts bp
    JOIN  public.buildings b  ON b.id  = bp.building_id
    LEFT JOIN public.profiles pr ON pr.id = bp.user_id
  WHERE
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    AND bp.video_url IS NOT NULL
    AND bp.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    bp.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_moderation_videos(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_moderation_videos(uuid, integer) TO authenticated;
