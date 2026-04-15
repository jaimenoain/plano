-- =============================================================================
-- Migration: locality_08_fix_nonlatin_city_slugs
-- Purpose:   Fix city_slug values that are empty or start with '-' due to
--            non-Latin city names (Chinese, Armenian, Khmer, etc.) that
--            produce empty strings when passed through make_city_slug().
--
--            Strategy:
--            1. Extract the city portion from the legacy `slug` column by
--               stripping the trailing '-{country_code}' suffix.
--            2. If the extracted value is empty, OR it would duplicate another
--               row (either already-fixed or an existing clean row), fall back
--               to lower(country_code) || '-' || left(id::text, 8), which is
--               guaranteed unique by the UUID.
--
-- Depends on: locality_05 (city_slug column + unique constraint)
-- =============================================================================

UPDATE public.localities l
SET city_slug = candidate.new_slug
FROM (
  WITH affected AS (
    -- All rows that need fixing, with their candidate extracted slug
    SELECT
      id,
      country_code,
      trim(both '-' from
        regexp_replace(slug, '-' || lower(country_code) || '$', '')
      ) AS extracted
    FROM public.localities
    WHERE city_slug = '' OR city_slug IS NULL OR city_slug LIKE '-%'
  ),
  ranked AS (
    -- Number duplicates within the affected set per (country_code, extracted)
    -- so the second occurrence of "kuwait" gets rn=2 and falls back to UUID
    SELECT
      id,
      country_code,
      extracted,
      row_number() OVER (
        PARTITION BY country_code, extracted
        ORDER BY id
      ) AS rn
    FROM affected
  )
  SELECT
    id,
    CASE
      -- Empty extracted value, duplicate within affected set, or collides
      -- with an already-clean row → use UUID-based fallback
      WHEN extracted = ''
        OR rn > 1
        OR EXISTS (
          SELECT 1 FROM public.localities other
          WHERE other.country_code = ranked.country_code
            AND other.city_slug    = ranked.extracted
            AND other.id NOT IN (SELECT id FROM affected)
        )
      THEN lower(country_code) || '-' || left(id::text, 8)
      ELSE extracted
    END AS new_slug
  FROM ranked
) candidate
WHERE l.id = candidate.id;


-- =============================================================================
-- Verify after applying:
--
--   SELECT count(*) FROM localities WHERE city_slug = '' OR city_slug IS NULL;
--   -- Expected: 0
--
--   SELECT count(*) FROM localities WHERE city_slug LIKE '-%';
--   -- Expected: 0
--
--   SELECT city, country_code, city_slug FROM localities WHERE city_slug ~ '[^a-z0-9\-]';
--   -- Expected: 0 rows
-- =============================================================================
