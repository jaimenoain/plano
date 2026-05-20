-- Add moderated_at / moderated_by to buildings so ambassador approvals persist.
-- Rebuilds get_ambassador_recent_buildings to exclude approved buildings and surface
-- the approver username. Adds ambassador_approve_building() SECURITY DEFINER RPC.
-- Feedback id: 984713ff-7652-41c1-9901-8999753eba6a

-- ─── 1. Schema additions ────────────────────────────────────────────────────

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS moderated_at  timestamptz  NULL,
  ADD COLUMN IF NOT EXISTS moderated_by  uuid         NULL
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. Approve RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_approve_building(p_building_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  -- Resolve caller's active chapter
  SELECT chapter_id INTO v_chapter_id
  FROM public.ambassador_memberships
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'not_ambassador'
      USING HINT = 'Caller is not an active ambassador';
  END IF;

  -- Building must be within chapter scope
  IF NOT public._building_in_ambassador_chapter_scope(p_building_id, v_chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope'
      USING HINT = 'Building is not in this ambassador''s chapter scope';
  END IF;

  -- Stamp approval (idempotent — no-op when already moderated)
  UPDATE public.buildings
  SET
    moderated_at = now(),
    moderated_by = auth.uid()
  WHERE id = p_building_id
    AND is_deleted IS NOT TRUE
    AND moderated_at IS NULL;

  -- Audit trail
  INSERT INTO public.building_audit_logs (building_id, user_id, operation, table_name, new_data)
  VALUES (
    p_building_id,
    auth.uid(),
    'ambassador_approval',
    'buildings',
    jsonb_build_object(
      'moderated_at', now(),
      'moderated_by',  auth.uid()
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_approve_building(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_approve_building(uuid) TO authenticated;

-- ─── 3. Rebuild get_ambassador_recent_buildings ──────────────────────────────
-- Excludes already-approved buildings (moderated_at IS NOT NULL).
-- Returns moderated_at + moderated_by_username so the UI can surface approver info
-- for buildings that were just approved (cached before the filter takes effect).
-- Postgres forbids changing RETURNS TABLE columns via CREATE OR REPLACE (42P13); drop first.

DROP FUNCTION IF EXISTS public.get_ambassador_recent_buildings(uuid, integer);

CREATE OR REPLACE FUNCTION public.get_ambassador_recent_buildings(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 20
)
  RETURNS TABLE (
    id                   uuid,
    short_id             integer,
    slug                 text,
    name                 text,
    city                 text,
    country              text,
    address              text,
    lat                  float8,
    lng                  float8,
    created_at           timestamptz,
    hero_image_url       text,
    n                    text,
    added_by_username    text,
    moderated_at         timestamptz,
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
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    AND b.created_at IS NOT NULL
    AND b.created_at >= (timezone('utc'::text, now()) - interval '30 days')
    AND b.moderated_at IS NULL    -- exclude already-approved buildings
  ORDER BY
    b.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_recent_buildings(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_recent_buildings(uuid, integer) TO authenticated;
