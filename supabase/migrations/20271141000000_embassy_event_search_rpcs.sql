-- Migration: embassy event discovery publish/discard RPCs
-- Two SECURITY DEFINER functions for the Events review tool.
-- Writes happen server-side; RLS restricts direct client INSERT/DELETE.

-- ─── ambassador_publish_event_discovery ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_publish_event_discovery(
  p_discovery_id uuid
)
RETURNS uuid   -- the new events.id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_disc       record;
  v_loc        record;
  v_base_slug  text;
  v_slug       text;
  v_suffix     int  := 0;
  v_event_id   uuid;
  v_location   geography;
BEGIN
  -- 1. Load discovery
  SELECT * INTO v_disc
    FROM embassy_event_discoveries
   WHERE id = p_discovery_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'discovery_not_found' USING HINT = 'Discovery does not exist';
  END IF;
  IF v_disc.status <> 'pending' THEN
    RAISE EXCEPTION 'discovery_not_pending' USING HINT = 'Discovery has already been reviewed';
  END IF;

  -- 2. Ambassador scope check
  IF NOT public._ambassador_can_access_chapter(v_disc.chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope' USING HINT = 'Discovery is not in your chapter scope';
  END IF;

  -- 3. Locality metadata for URL construction
  SELECT country_code, city_slug INTO v_loc
    FROM localities
   WHERE id = v_disc.locality_id;

  -- 4. Generate unique slug from title
  v_base_slug := lower(
    regexp_replace(
      regexp_replace(v_disc.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
  -- Truncate to avoid overly long slugs
  v_base_slug := substring(v_base_slug from 1 for 80);
  v_slug := v_base_slug;

  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM events WHERE slug = v_slug);
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  END LOOP;

  -- 5. Build geography point if coordinates are available
  IF v_disc.lat IS NOT NULL AND v_disc.lng IS NOT NULL THEN
    v_location := ST_SetSRID(ST_MakePoint(v_disc.lng, v_disc.lat), 4326)::geography;
  END IF;

  -- 6. Insert into events
  INSERT INTO events (
    title,
    description,
    slug,
    start_at,
    end_at,
    address,
    location,
    external_link,
    cover_image_url,
    submitted_by_user_id,
    is_self_hosted,
    claim_status,
    locality_id,
    country_code,
    city_slug
  ) VALUES (
    v_disc.title,
    v_disc.description,
    v_slug,
    v_disc.start_at,
    v_disc.end_at,
    v_disc.address,
    v_location,
    v_disc.external_link,
    v_disc.cover_image_url,
    v_user_id,
    false,
    'unclaimed',
    v_disc.locality_id,
    v_loc.country_code,
    v_loc.city_slug
  )
  RETURNING id INTO v_event_id;

  -- 7. Mark discovery published
  UPDATE embassy_event_discoveries
     SET status           = 'published',
         published_event_id = v_event_id,
         reviewed_at      = now(),
         reviewed_by      = v_user_id
   WHERE id = p_discovery_id;

  -- Note: building_audit_logs.building_id is NOT NULL (FK → buildings),
  -- so it cannot be used for event-publish telemetry. A dedicated events
  -- audit log can be added in a follow-up migration if needed.

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_publish_event_discovery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_publish_event_discovery(uuid) TO authenticated;

COMMENT ON FUNCTION public.ambassador_publish_event_discovery IS
  'Publishes an AI-discovered event discovery to the live events table.
   Verifies the caller is an active ambassador with scope over the discovery''s chapter.';

-- ─── ambassador_discard_event_discovery ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ambassador_discard_event_discovery(
  p_discovery_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_disc    record;
BEGIN
  -- 1. Load discovery
  SELECT * INTO v_disc
    FROM embassy_event_discoveries
   WHERE id = p_discovery_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'discovery_not_found' USING HINT = 'Discovery does not exist';
  END IF;
  IF v_disc.status <> 'pending' THEN
    RAISE EXCEPTION 'discovery_not_pending' USING HINT = 'Discovery has already been reviewed';
  END IF;

  -- 2. Ambassador scope check
  IF NOT public._ambassador_can_access_chapter(v_disc.chapter_id) THEN
    RAISE EXCEPTION 'out_of_scope' USING HINT = 'Discovery is not in your chapter scope';
  END IF;

  -- 3. Mark discarded
  UPDATE embassy_event_discoveries
     SET status      = 'discarded',
         reviewed_at = now(),
         reviewed_by = v_user_id
   WHERE id = p_discovery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ambassador_discard_event_discovery(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_discard_event_discovery(uuid) TO authenticated;

COMMENT ON FUNCTION public.ambassador_discard_event_discovery IS
  'Discards an AI-discovered event discovery after verifying ambassador chapter scope.';
