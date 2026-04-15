-- =============================================================================
-- Migration: locality_06_add_region
-- Purpose:   Add optional region / region_slug columns to localities for
--            future subregion routing (e.g. US states, Spanish comunidades).
--            Columns are nullable and unused by any trigger or query at this stage.
--
-- Depends on: locality_05 (city_slug)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Add nullable region and region_slug columns
-- -----------------------------------------------------------------------------

ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS region text NULL;

COMMENT ON COLUMN public.localities.region IS
  '-- Reserved for subregion routing (e.g. US states, Spanish comunidades). Not yet exposed in any route.';

ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS region_slug text NULL;

COMMENT ON COLUMN public.localities.region_slug IS
  '-- Reserved for subregion routing (e.g. US states, Spanish comunidades). Not yet exposed in any route.';


-- -----------------------------------------------------------------------------
-- STEP 2: Verify
--
-- After applying, run these checks in psql or the Supabase SQL editor:
--
-- 1. Confirm the columns exist and are nullable:
--
--    \d localities
--    -- Expected: region and region_slug appear as nullable text columns
--
-- 2. Confirm existing rows are unaffected:
--
--    SELECT count(*) FROM localities WHERE region IS NOT NULL;
--    -- Expected: 0
-- -----------------------------------------------------------------------------
