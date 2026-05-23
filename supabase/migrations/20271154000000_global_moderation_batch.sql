-- Global moderation batch: when an ambassador's chapter tab is "All clear",
-- offer a batch of content from other locations, prioritising localities that
-- have no active local chapter.
--
-- Provides four FETCH RPCs (photos, videos, credits, buildings) and two APPROVE
-- RPCs (buildings and credits — photos/videos already approve without scope checks).
-- All RPCs are SECURITY DEFINER and callable by any active ambassador.
--
-- Feedback id: 14c1a488-3aa1-42a1-9d5b-fd4d533d138d
-- Page: /embassy/contribute?tool=curation

-- ─── Helper: is building NOT in the excluded chapter's scope? ─────────────────
-- Inline in each RPC — no new helper function needed.

-- ─── 1. get_global_moderation_photos ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_global_moderation_photos(
  p_exclude_chapter_id uuid,
  p_limit              integer DEFAULT 20
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
  -- Caller must be an active ambassador
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
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
    NOT public._building_in_ambassador_chapter_scope(b.id, p_exclude_chapter_id)
    AND ri.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    -- Uncharted localities first (no active local chapter covering this building)
    (CASE
      WHEN b.locality_id IS NULL THEN 2
      WHEN NOT EXISTS (
        SELECT 1 FROM public.ambassador_chapters ac
        WHERE  ac.type       = 'local'
          AND  ac.status     = 'active'
          AND  ac.locality_id = b.locality_id
      ) THEN 0
      ELSE 1
    END) ASC,
    ri.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_global_moderation_photos(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_moderation_photos(uuid, integer) TO authenticated;

-- ─── 2. get_global_moderation_videos ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_global_moderation_videos(
  p_exclude_chapter_id uuid,
  p_limit              integer DEFAULT 20
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
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
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
    NOT public._building_in_ambassador_chapter_scope(b.id, p_exclude_chapter_id)
    AND bp.video_url IS NOT NULL
    AND bp.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    (CASE
      WHEN b.locality_id IS NULL THEN 2
      WHEN NOT EXISTS (
        SELECT 1 FROM public.ambassador_chapters ac
        WHERE  ac.type       = 'local'
          AND  ac.status     = 'active'
          AND  ac.locality_id = b.locality_id
      ) THEN 0
      ELSE 1
    END) ASC,
    bp.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_global_moderation_videos(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_moderation_videos(uuid, integer) TO authenticated;

-- ─── 3. get_global_moderation_credits ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_global_moderation_credits(
  p_exclude_chapter_id uuid,
  p_limit              integer DEFAULT 20
)
  RETURNS TABLE (
    id                uuid,
    created_at        timestamptz,
    role              text,
    building_id       uuid,
    building_name     text,
    building_slug     text,
    building_short_id integer,
    entity_name       text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bc.id,
    bc.created_at,
    bc.role::text,
    b.id                                AS building_id,
    b.name::text                        AS building_name,
    COALESCE(b.slug, '')::text          AS building_slug,
    b.short_id::integer                 AS building_short_id,
    COALESCE(pe.name, co.name)::text    AS entity_name
  FROM
    public.building_credits bc
    JOIN  public.buildings b   ON b.id = bc.building_id
    LEFT JOIN public.people     pe ON pe.id = bc.person_id
    LEFT JOIN public.companies  co ON co.id = bc.company_id
  WHERE
    NOT public._building_in_ambassador_chapter_scope(b.id, p_exclude_chapter_id)
    AND bc.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    (CASE
      WHEN b.locality_id IS NULL THEN 2
      WHEN NOT EXISTS (
        SELECT 1 FROM public.ambassador_chapters ac
        WHERE  ac.type       = 'local'
          AND  ac.status     = 'active'
          AND  ac.locality_id = b.locality_id
      ) THEN 0
      ELSE 1
    END) ASC,
    bc.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_global_moderation_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_moderation_credits(uuid, integer) TO authenticated;

-- ─── 4. get_global_moderation_buildings ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_global_moderation_buildings(
  p_exclude_chapter_id uuid,
  p_limit              integer DEFAULT 20
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
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text             AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.address::text,
    ST_Y(b.location::geometry)::float8     AS lat,
    ST_X(b.location::geometry)::float8     AS lng,
    b.created_at,
    b.hero_image_url::text,
    b.community_preview_url::text          AS n,
    p_added.username::text                 AS added_by_username,
    b.moderated_at,
    p_mod.username::text                   AS moderated_by_username
  FROM
    public.buildings b
    LEFT JOIN public.profiles p_added ON p_added.id = b.created_by
    LEFT JOIN public.profiles p_mod   ON p_mod.id   = b.moderated_by
  WHERE
    NOT public._building_in_ambassador_chapter_scope(b.id, p_exclude_chapter_id)
    AND b.created_at IS NOT NULL
    AND b.created_at >= (timezone('utc'::text, now()) - interval '30 days')
    AND b.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    (CASE
      WHEN b.locality_id IS NULL THEN 2
      WHEN NOT EXISTS (
        SELECT 1 FROM public.ambassador_chapters ac
        WHERE  ac.type       = 'local'
          AND  ac.status     = 'active'
          AND  ac.locality_id = b.locality_id
      ) THEN 0
      ELSE 1
    END) ASC,
    b.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_global_moderation_buildings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_moderation_buildings(uuid, integer) TO authenticated;

-- ─── 5. ambassador_approve_building_global ────────────────────────────────────
-- Mirrors ambassador_approve_building but without the chapter-scope guard.
-- Any active ambassador can approve buildings outside their chapter scope.

CREATE OR REPLACE FUNCTION public.ambassador_approve_building_global(p_building_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  UPDATE public.buildings
  SET
    moderated_at = now(),
    moderated_by = v_user_id
  WHERE id = p_building_id
    AND is_deleted IS NOT TRUE
    AND moderated_at IS NULL;

  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    p_building_id,
    v_user_id,
    'ambassador_approval',
    'buildings',
    jsonb_build_object(
      'moderated_at', now(),
      'moderated_by',  v_user_id,
      'global',        true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_building_global(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_building_global(uuid) TO authenticated;

-- ─── 6. ambassador_approve_credit_global ─────────────────────────────────────
-- Mirrors ambassador_approve_credit but without the chapter-scope guard.

CREATE OR REPLACE FUNCTION public.ambassador_approve_credit_global(p_credit_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_building_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  SELECT building_id INTO v_building_id
  FROM public.building_credits
  WHERE id = p_credit_id;

  IF v_building_id IS NULL THEN
    RAISE EXCEPTION 'credit_not_found'
      USING HINT = 'Credit does not exist';
  END IF;

  UPDATE public.building_credits
  SET
    moderated_at = now(),
    moderated_by = v_user_id
  WHERE id = p_credit_id
    AND moderated_at IS NULL;

  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    v_building_id,
    v_user_id,
    'ambassador_credit_approval',
    'building_credits',
    jsonb_build_object(
      'credit_id',    p_credit_id,
      'moderated_at', now(),
      'moderated_by', v_user_id,
      'global',       true
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_credit_global(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_credit_global(uuid) TO authenticated;
