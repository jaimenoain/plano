-- Phase 1: Hybrid scoring foundation for buildings search
--
-- What this migration does:
--   1. Adds search_vector tsvector column to buildings (maintained via trigger)
--   2. Adds GIN index on search_vector for fast @@ queries
--   3. Adds GIN trigram index on alt_name (name already has buildings_name_trgm_idx)
--   4. Creates search_buildings_v2 RPC — viewport-independent, typo-tolerant, ranked
--
-- Design decisions (documented here for future maintainers):
--
-- 'simple' dictionary not 'english': building names are multilingual (Tokyo,
-- Bilbao, Zaha Hadid, Renzo Piano, etc.). English stemming degrades non-English
-- proper nouns — "buildings" → "build" would miss exact matches. 'simple'
-- lowercases without stemming, which is correct for a proper-noun-heavy corpus.
--
-- No bbox parameter on search_buildings_v2: this is the architectural break from
-- get_map_clusters. Find mode returns results from anywhere on Earth; the map
-- follows results rather than constraining them. Searching "Shard" with the map
-- looking at Australia must return the Shard.
--
-- Regular CREATE INDEX (not CONCURRENTLY): migrations run inside a transaction
-- and CONCURRENTLY is incompatible with that. For large production tables (>50k
-- rows) prefer scheduling this during a low-traffic window or running the index
-- creation separately as a one-off CONCURRENTLY statement after the migration.

-- 1. Ensure pg_trgm extension is present (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add the search_vector column (nullable initially — backfill below)
ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. Trigger function: recomputes search_vector on every relevant column change.
--    Weights: name/alt_name = A (highest), aliases = B, address/city = C, country = D.
CREATE OR REPLACE FUNCTION public.update_building_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name,     '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.alt_name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.aliases, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.address,  '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.city,     '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.country,  '')), 'D');
  RETURN NEW;
END;
$$;

-- 4. Trigger: fires on INSERT and on UPDATE of the indexed columns only
DROP TRIGGER IF EXISTS buildings_search_vector_update ON public.buildings;
CREATE TRIGGER buildings_search_vector_update
  BEFORE INSERT OR UPDATE OF name, alt_name, aliases, address, city, country
  ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.update_building_search_vector();

-- 5. Backfill existing rows
UPDATE public.buildings
SET search_vector =
  setweight(to_tsvector('simple', COALESCE(name,     '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(alt_name, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(array_to_string(aliases, ' '), '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(address,  '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(city,     '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(country,  '')), 'D')
WHERE search_vector IS NULL;

-- 6. GIN index for full-text @@ queries
CREATE INDEX IF NOT EXISTS buildings_search_vector_gin_idx
  ON public.buildings USING GIN (search_vector);

-- 7. Trigram index on alt_name
--    buildings.name already has buildings_name_trgm_idx from migration 20260427000000.
--    alt_name has no index; add one to support similarity() calls on it.
CREATE INDEX IF NOT EXISTS buildings_alt_name_trgm_idx
  ON public.buildings USING GIN (alt_name gin_trgm_ops);

-- 8. search_buildings_v2
--
--    Returns up to p_limit buildings ranked by a composite score:
--      0.6 × ts_rank_cd (full-text relevance)
--    + 0.3 × trigram similarity (typo tolerance, name/alt_name)
--    + 0.1 × log-normalised popularity (tiebreaker)
--
--    A row qualifies if the tsquery matches OR trigram similarity ≥ 0.2.
--    This threshold keeps noisy single-character matches out while catching
--    common transpositions ("shrd" → "Shard", "renz" → "Renzo Piano").
--
--    Ranking weights live in one place (the SELECT list) for easy tuning.
--
--    No bbox parameter. Filters mirror the existing filter contract so that
--    Phase 2 can swap in this RPC mechanically.
CREATE OR REPLACE FUNCTION public.search_buildings_v2(
  p_query    text,
  p_limit    int     DEFAULT 20,
  p_offset   int     DEFAULT 0,
  p_filters  jsonb   DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id               uuid,
  name             text,
  slug             text,
  alt_name         text,
  hero_image_url   text,
  lat              double precision,
  lng              double precision,
  city             text,
  country          text,
  year_completed   int,
  popularity_score int,
  tier_rank        text,
  credit_names     text[],
  rank_score       double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_query               text;
  v_tsquery             tsquery;
  v_category_id         uuid;
  v_typology_ids        uuid[];
  v_attribute_ids       uuid[];
  v_credit_company_id   uuid;
  v_credit_roles        text[];
  v_construction_statuses text[];
  v_size_categories     text[];
  v_min_size_sqm        numeric;
  v_max_size_sqm        numeric;
  v_min_storeys         int;
  v_max_storeys         int;
  v_award_id            uuid;
  v_award_outcome       text;
  v_award_year_from     int;
  v_award_year_to       int;
  v_cities_filter       text[];
  v_country_filter      text;
  v_year                int;
  v_access_levels       text[];
  v_access_logistics    text[];
  v_access_costs        text[];
BEGIN
  v_query := NULLIF(trim(p_query), '');
  IF v_query IS NULL THEN
    RETURN;
  END IF;

  -- websearch_to_tsquery handles apostrophes, ampersands, quoted phrases, etc.
  -- Wrap in a nested block so malformed input falls back to NULL (trigram-only).
  BEGIN
    v_tsquery := websearch_to_tsquery('simple', v_query);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;

  -- Parse optional filters
  IF p_filters IS NOT NULL THEN
    IF p_filters ? 'category_id' AND p_filters->>'category_id' IS NOT NULL THEN
      BEGIN v_category_id := (p_filters->>'category_id')::uuid; EXCEPTION WHEN OTHERS THEN v_category_id := NULL; END;
    END IF;
    IF p_filters ? 'typology_ids' AND jsonb_typeof(p_filters->'typology_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'typology_ids')::uuid) INTO v_typology_ids; EXCEPTION WHEN OTHERS THEN v_typology_ids := NULL; END;
    END IF;
    IF p_filters ? 'attribute_ids' AND jsonb_typeof(p_filters->'attribute_ids') = 'array' THEN
      BEGIN SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'attribute_ids')::uuid) INTO v_attribute_ids; EXCEPTION WHEN OTHERS THEN v_attribute_ids := NULL; END;
    END IF;
    IF p_filters ? 'credit_company_id' AND p_filters->>'credit_company_id' IS NOT NULL THEN
      BEGIN v_credit_company_id := (p_filters->>'credit_company_id')::uuid; EXCEPTION WHEN OTHERS THEN v_credit_company_id := NULL; END;
    END IF;
    IF p_filters ? 'credit_roles' AND jsonb_typeof(p_filters->'credit_roles') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'credit_roles')) INTO v_credit_roles;
    END IF;
    IF p_filters ? 'construction_statuses' AND jsonb_typeof(p_filters->'construction_statuses') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'construction_statuses')) INTO v_construction_statuses;
    END IF;
    IF p_filters ? 'size_categories' AND jsonb_typeof(p_filters->'size_categories') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'size_categories')) INTO v_size_categories;
    END IF;
    IF p_filters ? 'min_size_sqm' AND p_filters->>'min_size_sqm' IS NOT NULL THEN
      BEGIN v_min_size_sqm := (p_filters->>'min_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_min_size_sqm := NULL; END;
    END IF;
    IF p_filters ? 'max_size_sqm' AND p_filters->>'max_size_sqm' IS NOT NULL THEN
      BEGIN v_max_size_sqm := (p_filters->>'max_size_sqm')::numeric; EXCEPTION WHEN OTHERS THEN v_max_size_sqm := NULL; END;
    END IF;
    IF p_filters ? 'min_storeys' AND p_filters->>'min_storeys' IS NOT NULL THEN
      BEGIN v_min_storeys := (p_filters->>'min_storeys')::int; EXCEPTION WHEN OTHERS THEN v_min_storeys := NULL; END;
    END IF;
    IF p_filters ? 'max_storeys' AND p_filters->>'max_storeys' IS NOT NULL THEN
      BEGIN v_max_storeys := (p_filters->>'max_storeys')::int; EXCEPTION WHEN OTHERS THEN v_max_storeys := NULL; END;
    END IF;
    IF p_filters ? 'award_id' AND p_filters->>'award_id' IS NOT NULL THEN
      BEGIN v_award_id := (p_filters->>'award_id')::uuid; EXCEPTION WHEN OTHERS THEN v_award_id := NULL; END;
    END IF;
    IF p_filters ? 'award_outcome' AND p_filters->>'award_outcome' IS NOT NULL THEN
      v_award_outcome := p_filters->>'award_outcome';
    END IF;
    IF p_filters ? 'award_year_from' AND p_filters->>'award_year_from' IS NOT NULL THEN
      BEGIN v_award_year_from := (p_filters->>'award_year_from')::int; EXCEPTION WHEN OTHERS THEN v_award_year_from := NULL; END;
    END IF;
    IF p_filters ? 'award_year_to' AND p_filters->>'award_year_to' IS NOT NULL THEN
      BEGIN v_award_year_to := (p_filters->>'award_year_to')::int; EXCEPTION WHEN OTHERS THEN v_award_year_to := NULL; END;
    END IF;
    IF p_filters ? 'cities' AND jsonb_typeof(p_filters->'cities') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'cities')) INTO v_cities_filter;
    END IF;
    IF p_filters ? 'country' AND p_filters->>'country' IS NOT NULL THEN
      v_country_filter := p_filters->>'country';
    END IF;
    IF p_filters ? 'year' AND p_filters->>'year' IS NOT NULL THEN
      BEGIN v_year := (p_filters->>'year')::int; EXCEPTION WHEN OTHERS THEN v_year := NULL; END;
    END IF;
    IF p_filters ? 'access_levels' AND jsonb_typeof(p_filters->'access_levels') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_levels')) INTO v_access_levels;
    END IF;
    IF p_filters ? 'access_logistics' AND jsonb_typeof(p_filters->'access_logistics') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_logistics')) INTO v_access_logistics;
    END IF;
    IF p_filters ? 'access_costs' AND jsonb_typeof(p_filters->'access_costs') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_filters->'access_costs')) INTO v_access_costs;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.slug,
    b.alt_name,
    main_image_url(b)                   AS hero_image_url,
    ST_Y(b.location::geometry)          AS lat,
    ST_X(b.location::geometry)          AS lng,
    b.city,
    b.country,
    b.year_completed,
    b.popularity_score,
    b.tier_rank::text                   AS tier_rank,
    COALESCE(credits_lateral.names, '{}'::text[]) AS credit_names,
    -- Composite rank: ts_rank_cd (full-text) + trigram similarity + log-popularity
    (
      0.6 * COALESCE(ts_rank_cd(b.search_vector, v_tsquery), 0.0)
      + 0.3 * GREATEST(
          similarity(b.name, v_query),
          COALESCE(similarity(b.alt_name, v_query), 0.0)
        )
      + 0.1 * (
          log(GREATEST(1.0, COALESCE(b.popularity_score, 0)::float + 100.0))
          / log(1100.0)
        )
    )                                   AS rank_score
  FROM public.buildings b
  LEFT JOIN LATERAL (
    SELECT array_agg(DISTINCT COALESCE(p.name, c.name))
           FILTER (WHERE COALESCE(p.name, c.name) IS NOT NULL) AS names
    FROM public.building_credits bc
    LEFT JOIN public.people    p ON p.id = bc.person_id
    LEFT JOIN public.companies c ON c.id = bc.company_id
    WHERE bc.building_id = b.id
      AND bc.status NOT IN ('hidden')
  ) credits_lateral ON true
  WHERE
    (b.is_deleted IS FALSE OR b.is_deleted IS NULL)
    AND b.location IS NOT NULL
    -- Text match gate: tsquery hit OR trigram similarity above threshold on name/alt_name.
    -- Threshold 0.2 catches common transpositions without surfacing unrelated noise.
    AND (
      (v_tsquery IS NOT NULL AND b.search_vector @@ v_tsquery)
      OR similarity(b.name, v_query) >= 0.2
      OR COALESCE(similarity(b.alt_name, v_query), 0.0) >= 0.2
    )
    -- Optional filters below — no silent status exclusions
    AND (v_category_id IS NULL OR b.functional_category_id = v_category_id)
    AND (v_typology_ids IS NULL OR cardinality(v_typology_ids) = 0 OR EXISTS (
      SELECT 1 FROM public.building_functional_typologies bft
      WHERE bft.building_id = b.id AND bft.typology_id = ANY(v_typology_ids)
    ))
    AND (v_attribute_ids IS NULL OR cardinality(v_attribute_ids) = 0 OR EXISTS (
      SELECT 1 FROM public.building_attributes batt
      WHERE batt.building_id = b.id AND batt.attribute_id = ANY(v_attribute_ids)
    ))
    AND public.building_matches_credit_filters(b.id, v_credit_company_id, v_credit_roles)
    AND (v_construction_statuses IS NULL OR cardinality(v_construction_statuses) = 0
         OR b.status::text = ANY(v_construction_statuses))
    AND (v_size_categories IS NULL OR cardinality(v_size_categories) = 0
         OR b.size_category = ANY(v_size_categories))
    AND (v_min_size_sqm IS NULL OR v_min_size_sqm = 0 OR b.size_sqm >= v_min_size_sqm)
    AND (v_max_size_sqm IS NULL OR b.size_sqm <= v_max_size_sqm)
    AND (v_min_storeys IS NULL OR v_min_storeys <= 1 OR b.storeys >= v_min_storeys)
    AND (v_max_storeys IS NULL OR b.storeys <= v_max_storeys)
    AND (v_award_id IS NULL OR b.id IN (
      SELECT building_id
      FROM public.get_buildings_with_awards(v_award_id, v_award_outcome, v_award_year_from, v_award_year_to)
    ))
    AND (v_cities_filter IS NULL OR cardinality(v_cities_filter) = 0
         OR b.city = ANY(v_cities_filter))
    AND (v_country_filter IS NULL OR b.country = v_country_filter)
    AND (v_year IS NULL OR b.year_completed = v_year)
    AND (v_access_levels IS NULL OR cardinality(v_access_levels) = 0
         OR b.access_level::text = ANY(v_access_levels))
    AND (v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0
         OR b.access_logistics::text = ANY(v_access_logistics))
    AND (v_access_costs IS NULL OR cardinality(v_access_costs) = 0
         OR b.access_cost::text = ANY(v_access_costs))
  ORDER BY rank_score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_buildings_v2(text, int, int, jsonb) TO anon, authenticated;
