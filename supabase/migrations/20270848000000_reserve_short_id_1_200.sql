-- Reserve short_id 1–200 for a curated list of featured buildings.
-- Any existing building that was auto-assigned a short_id in that range
-- gets re-assigned a higher value, and the sequence is advanced so new
-- inserts never land in 1–200 again.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reassign existing buildings whose short_id falls in [1, 200]
--    to fresh values drawn from a temporary sequence that starts well
--    above the current maximum.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_max_existing int;
  v_start int;
  seq_val int;
  rec RECORD;
BEGIN
  -- Find the highest short_id currently in use (could be > 200 already)
  SELECT COALESCE(MAX(short_id), 200) INTO v_max_existing FROM public.buildings;
  v_start := GREATEST(v_max_existing, 200) + 1;

  -- Create a temporary counter
  seq_val := v_start;

  -- Reassign each building in the reserved range
  FOR rec IN
    SELECT id FROM public.buildings WHERE short_id BETWEEN 1 AND 200 ORDER BY short_id
  LOOP
    UPDATE public.buildings SET short_id = seq_val WHERE id = rec.id;
    seq_val := seq_val + 1;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Advance the sequence so future auto-inserts start from 201 at minimum.
--    We set it to MAX(short_id) + 1 so there's no gap collision.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT setval(
  pg_get_serial_sequence('public.buildings', 'short_id'),
  GREATEST((SELECT MAX(short_id) FROM public.buildings), 200)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Update get_building_leaderboards() to return short_id + slug
--    so the frontend can generate canonical /building/:short_id/:slug URLs.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_building_leaderboards()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    most_visited JSON;
    top_rated JSON;
BEGIN
    SELECT json_agg(t) INTO most_visited
    FROM (
        SELECT
            b.id,
            b.short_id,
            b.slug,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            COUNT(ub.id) as visit_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        WHERE ub.status = 'visited'
        GROUP BY b.id
        ORDER BY visit_count DESC
        LIMIT 10
    ) t;

    SELECT json_agg(t) INTO top_rated
    FROM (
        SELECT
            b.id,
            b.short_id,
            b.slug,
            b.name,
            b.city,
            b.country,
            b.main_image_url,
            AVG(ub.rating)::numeric(10,1) as avg_rating,
            COUNT(ub.id) as rating_count
        FROM buildings b
        JOIN user_buildings ub ON b.id = ub.building_id
        WHERE ub.rating IS NOT NULL
        GROUP BY b.id
        HAVING COUNT(ub.id) >= 3
        ORDER BY avg_rating DESC, rating_count DESC
        LIMIT 10
    ) t;

    RETURN json_build_object(
        'most_visited', COALESCE(most_visited, '[]'::json),
        'top_rated', COALESCE(top_rated, '[]'::json)
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Update redeem_credit_removal_token() to also return building_short_id
--    so the removal thank-you page can link to the canonical building URL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.redeem_credit_removal_token(p_token_hex text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_trim text := lower(trim(p_token_hex));
  v_secret bytea;
  v_hash bytea;
  v_row public.credit_removal_tokens%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_building_id uuid;
  v_building_name text;
  v_building_slug text;
  v_building_short_id int;
BEGIN
  IF v_trim IS NULL OR length(v_trim) <> 64 OR v_trim !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  v_secret := decode(v_trim, 'hex');
  v_hash := extensions.digest(v_secret, 'sha256');

  SELECT * INTO v_row FROM public.credit_removal_tokens WHERE token_hash = v_hash FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unknown_token');
  END IF;

  IF v_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_used');
  END IF;

  IF v_row.expires_at <= v_now THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  UPDATE public.building_credits
  SET
    status = 'hidden'::public.credit_status_enum,
    updated_at = v_now
  WHERE id = v_row.credit_id;

  UPDATE public.credit_removal_tokens
  SET used_at = v_now
  WHERE id = v_row.id;

  SELECT b.id, b.name, b.slug, b.short_id
  INTO v_building_id, v_building_name, v_building_slug, v_building_short_id
  FROM public.building_credits bc
  JOIN public.buildings b ON b.id = bc.building_id
  WHERE bc.id = v_row.credit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'credit_id', v_row.credit_id,
    'building_id', v_building_id,
    'building_name', v_building_name,
    'building_slug', v_building_slug,
    'building_short_id', v_building_short_id
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_credit_removal_token(text) IS
  'Redeem one-time credit removal link: hide building_credit, set token used_at; returns building summary (including short_id) for UI CTA.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Update get_discovery_feed() to return short_id
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS get_discovery_feed(uuid, int, int, text, uuid, uuid[], uuid[], uuid[], text, text);

CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_user_id uuid,
  p_limit int,
  p_offset int,
  p_city_filter text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_typology_ids uuid[] DEFAULT NULL,
  p_attribute_ids uuid[] DEFAULT NULL,
  p_architect_ids uuid[] DEFAULT NULL,
  p_country_filter text DEFAULT NULL,
  p_region_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  short_id int,
  name text,
  address text,
  city text,
  country text,
  year_completed int,
  slug text,
  main_image_url text,
  save_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.short_id,
    b.name,
    b.address,
    b.city,
    b.country,
    b.year_completed,
    b.slug,
    main_image_url(b) as main_image_url,
    count(ub.id) as save_count
  FROM
    buildings b
  LEFT JOIN
    user_buildings ub ON b.id = ub.building_id
  WHERE
    (p_city_filter IS NULL OR p_city_filter = '' OR b.city ILIKE p_city_filter)
    AND
    (p_country_filter IS NULL OR p_country_filter = '' OR b.country ILIKE p_country_filter)
    AND
    (p_region_filter IS NULL OR p_region_filter = '' OR b.address ILIKE '%' || p_region_filter || '%')
    AND
    NOT EXISTS (
      SELECT 1
      FROM user_buildings my_ub
      WHERE my_ub.building_id = b.id
      AND my_ub.user_id = p_user_id
    )
    AND
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND
    (p_category_id IS NULL OR b.functional_category_id = p_category_id)
    AND
    (p_typology_ids IS NULL OR cardinality(p_typology_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_functional_typologies bft
      WHERE bft.building_id = b.id
      AND bft.typology_id = ANY(p_typology_ids)
    ))
    AND
    (p_attribute_ids IS NULL OR cardinality(p_attribute_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_attributes ba
      WHERE ba.building_id = b.id
      AND ba.attribute_id = ANY(p_attribute_ids)
    ))
    AND
    (p_architect_ids IS NULL OR cardinality(p_architect_ids) = 0 OR EXISTS (
      SELECT 1 FROM building_architects bar
      WHERE bar.building_id = b.id
      AND bar.architect_id = ANY(p_architect_ids)
    ))
  GROUP BY
    b.id
  HAVING
    (b.hero_image_url IS NOT NULL OR b.community_preview_url IS NOT NULL)
    OR
    BOOL_OR(ub.video_url IS NOT NULL)
  ORDER BY
    save_count DESC,
    b.id
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$;
