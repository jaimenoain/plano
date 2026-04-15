-- =============================================================================
-- Migration: locality_02_create_localities_table
-- Purpose:   Create the localities table, populate it from existing buildings
--            data, and add locality_id FK column to buildings.
--
-- Depends on: locality_01_normalize_buildings (country_code column must exist)
-- Must be applied BEFORE locality_03 (the trigger).
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS, INSERT ON CONFLICT DO NOTHING.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Create the localities table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.localities (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  city             text          NOT NULL,
  country          text          NOT NULL,  -- Canonical full name in English, e.g. 'United Kingdom'
  country_code     text          NOT NULL,  -- ISO 3166-1 alpha-2, e.g. 'GB'
  slug             text          NOT NULL,  -- URL-safe identifier, e.g. 'london-gb'

  -- Editorial content — null on auto-created rows, enriched manually later
  description      text,
  hero_image_url   text,

  -- SEO overrides — null falls back to generated defaults in the page loader
  meta_title       text,
  meta_description text,

  -- Geographic centre of the city (for map viewport on the locality page)
  -- Populated manually or via a future enrichment job
  lat              double precision,
  lng              double precision,

  -- Cached stat; kept up-to-date by the buildings trigger (locality_03)
  buildings_count  integer       NOT NULL DEFAULT 0,

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT localities_pkey PRIMARY KEY (id),
  CONSTRAINT localities_slug_unique UNIQUE (slug),
  CONSTRAINT localities_city_country_code_unique UNIQUE (city, country_code)
);

COMMENT ON TABLE public.localities IS
  'One row per distinct city/country combination that has at least one building. '
  'Auto-created by the buildings trigger when a new city is first seen. '
  'Enriched manually with description, hero image, and SEO fields.';

COMMENT ON COLUMN public.localities.slug IS
  'URL-safe, stable identifier derived from city + country_code at creation time. '
  'Format: {slugified-city}-{lower(country_code)}, e.g. ''london-gb'', ''new-york-us''. '
  'Never auto-updated after creation — renaming requires a manual migration with redirects.';

COMMENT ON COLUMN public.localities.buildings_count IS
  'Count of non-deleted buildings whose locality_id = this row. '
  'Updated by the sync_building_locality trigger on buildings. '
  'Treat as an approximate cache — use a direct COUNT for authoritative values.';


-- -----------------------------------------------------------------------------
-- STEP 2: Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS localities_slug_idx
  ON public.localities (slug);

CREATE INDEX IF NOT EXISTS localities_country_code_idx
  ON public.localities (country_code);

CREATE INDEX IF NOT EXISTS localities_buildings_count_idx
  ON public.localities (buildings_count DESC);


-- -----------------------------------------------------------------------------
-- STEP 3: Row-Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.localities ENABLE ROW LEVEL SECURITY;

-- All localities are publicly readable (locality pages are public)
CREATE POLICY "localities_select"
  ON public.localities
  FOR SELECT
  USING (true);

-- Only admins can create localities manually (auto-creation goes through the
-- trigger which runs as SECURITY DEFINER, bypassing RLS)
CREATE POLICY "localities_insert"
  ON public.localities
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Only admins can update editorial fields (description, hero_image_url, etc.)
CREATE POLICY "localities_update"
  ON public.localities
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Localities are never deleted directly; they become empty if all buildings
-- in that city are deleted, which is an acceptable state.
-- No DELETE policy.


-- -----------------------------------------------------------------------------
-- STEP 4: Helper function to generate a locality slug
--
-- Produces a stable, URL-safe slug from city + country_code.
-- Uses the same slugify logic as src/lib/utils.ts (lowercase, hyphens).
-- Defined here so it can be reused in the trigger (locality_03).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.make_locality_slug(p_city text, p_country_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          trim(p_city) || '-' || trim(p_country_code),
          '[^a-zA-Z0-9\s-]', '', 'g'  -- remove non-alphanumeric (keep spaces/hyphens)
        ),
        '\s+', '-', 'g'               -- spaces → hyphens
      ),
      '-+', '-', 'g'                  -- collapse multiple hyphens
    )
  );
$$;

COMMENT ON FUNCTION public.make_locality_slug(text, text) IS
  'Generates a URL-safe locality slug from a city name and ISO country code. '
  'Example: make_locality_slug(''New York'', ''US'') → ''new-york-us''. '
  'Used during initial population and in the buildings trigger.';


-- -----------------------------------------------------------------------------
-- STEP 5: Populate localities from existing buildings data
--
-- One row per distinct (city, country_code) pair with at least one building.
-- Rows where country_code is NULL (unmapped countries from migration 01) are
-- skipped — fix those first, then re-run this step.
-- -----------------------------------------------------------------------------

INSERT INTO public.localities (city, country, country_code, slug, buildings_count)
SELECT
  city,
  country,
  country_code,
  public.make_locality_slug(city, country_code) AS slug,
  buildings_count
FROM (
  SELECT DISTINCT ON (city, country_code)
    initcap(trim(b.city))                    AS city,
    initcap(trim(b.country))                 AS country,
    b.country_code                           AS country_code,
    count(*) OVER (
      PARTITION BY initcap(trim(b.city)), b.country_code
    )::integer                               AS buildings_count
  FROM public.buildings b
  WHERE b.city         IS NOT NULL
    AND b.country      IS NOT NULL
    AND b.country_code IS NOT NULL
    AND (b.is_deleted = false OR b.is_deleted IS NULL)
  ORDER BY
    city,
    country_code,
    count(*) OVER (PARTITION BY initcap(trim(b.city)), b.country_code) DESC
) deduped
ON CONFLICT (city, country_code)
  DO UPDATE SET
    buildings_count = EXCLUDED.buildings_count,
    updated_at      = now();


-- -----------------------------------------------------------------------------
-- STEP 6: Add locality_id FK column to buildings
-- -----------------------------------------------------------------------------

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS locality_id uuid
    REFERENCES public.localities (id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.buildings.locality_id IS
  'FK to localities. Set automatically by the sync_building_locality trigger '
  'when a building is inserted or its city/country is updated. '
  'NULL means the building has no city/country, or city could not be matched.';

CREATE INDEX IF NOT EXISTS buildings_locality_id_idx
  ON public.buildings (locality_id)
  WHERE locality_id IS NOT NULL;


-- -----------------------------------------------------------------------------
-- STEP 7: Backfill locality_id on existing buildings
-- -----------------------------------------------------------------------------

UPDATE public.buildings b
SET locality_id = l.id
FROM public.localities l
WHERE b.city         = l.city
  AND b.country_code = l.country_code
  AND b.locality_id  IS NULL
  AND b.city         IS NOT NULL
  AND b.country_code IS NOT NULL;


-- -----------------------------------------------------------------------------
-- STEP 8: Post-migration audit
--
-- Check how many buildings are still missing a locality_id:
--
--   SELECT count(*) AS missing_locality
--   FROM buildings
--   WHERE locality_id IS NULL
--     AND city IS NOT NULL
--     AND (is_deleted = false OR is_deleted IS NULL);
--
-- These will be buildings whose country_code was NULL (unmapped country names).
-- Fix those in migration 01, then re-run Steps 4–7 above.
-- -----------------------------------------------------------------------------
