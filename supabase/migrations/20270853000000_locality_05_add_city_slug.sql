-- =============================================================================
-- Migration: locality_05_add_city_slug
-- Purpose:   Add city_slug to localities, backfill it, add UNIQUE constraint,
--            add make_city_slug() helper, and update sync_building_locality
--            trigger to populate city_slug on new/updated localities.
--
-- Depends on: locality_02 (localities table) + locality_03 (trigger)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Add city_slug column with a temporary default so backfill can run
-- -----------------------------------------------------------------------------

ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS city_slug text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.localities.city_slug IS
  'URL-safe city portion of the route, e.g. ''paris'', ''new-york''. '
  'Derived from city at creation time via make_city_slug(). '
  'Used together with country_code in the /architecture/:cc/:city route. '
  'Never auto-updated after creation — renaming requires a manual migration with redirects.';


-- -----------------------------------------------------------------------------
-- STEP 2: Backfill city_slug for all existing rows
-- -----------------------------------------------------------------------------

UPDATE public.localities
SET city_slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        trim(city),
        '[^a-zA-Z0-9\s-]', '', 'g'   -- remove non-alphanumeric (keep spaces/hyphens)
      ),
      '\s+', '-', 'g'                 -- spaces → hyphens
    ),
    '-+', '-', 'g'                    -- collapse multiple hyphens
  )
);


-- -----------------------------------------------------------------------------
-- STEP 3: Remove the default and add UNIQUE (country_code, city_slug)
-- -----------------------------------------------------------------------------

ALTER TABLE public.localities
  ALTER COLUMN city_slug DROP DEFAULT;

-- Cities with the same name in different countries are allowed; same city slug
-- in the same country is a duplicate.
ALTER TABLE public.localities
  ADD CONSTRAINT localities_country_code_city_slug_unique UNIQUE (country_code, city_slug);


-- -----------------------------------------------------------------------------
-- STEP 4: Add make_city_slug() helper
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.make_city_slug(p_city text)
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
          trim(p_city),
          '[^a-zA-Z0-9\s-]', '', 'g'   -- remove non-alphanumeric (keep spaces/hyphens)
        ),
        '\s+', '-', 'g'                 -- spaces → hyphens
      ),
      '-+', '-', 'g'                    -- collapse multiple hyphens
    )
  );
$$;

COMMENT ON FUNCTION public.make_city_slug(text) IS
  'Generates the city-only portion of a URL slug from a city name. '
  'Example: make_city_slug(''New York'') → ''new-york''. '
  'Mirrors make_locality_slug but without the country-code suffix. '
  'Used in the sync_building_locality trigger and during manual locality creation.';


-- -----------------------------------------------------------------------------
-- STEP 5: Update sync_building_locality trigger to populate city_slug
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_building_locality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locality_id  uuid;
  v_city         text;
  v_country      text;
  v_country_code text;
  v_slug         text;
  v_city_slug    text;
  v_old_locality uuid;
BEGIN

  -- ------------------------------------------------------------------
  -- Short-circuit: skip if none of the relevant columns changed
  -- (only applies to UPDATE — for INSERT we always proceed)
  -- ------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    IF NEW.city         IS NOT DISTINCT FROM OLD.city
    AND NEW.country     IS NOT DISTINCT FROM OLD.country
    AND NEW.country_code IS NOT DISTINCT FROM OLD.country_code
    AND NEW.is_deleted  IS NOT DISTINCT FROM OLD.is_deleted
    THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Remember the previous locality so we can update its count later
  v_old_locality := CASE WHEN TG_OP = 'UPDATE' THEN OLD.locality_id ELSE NULL END;

  -- ------------------------------------------------------------------
  -- If the building has no city or country, clear locality_id and exit
  -- ------------------------------------------------------------------
  IF NEW.city IS NULL OR trim(NEW.city) = ''
  OR NEW.country IS NULL OR trim(NEW.country) = ''
  THEN
    NEW.locality_id := NULL;

    -- Decrement old locality count if there was one
    IF v_old_locality IS NOT NULL THEN
      UPDATE public.localities
      SET
        buildings_count = GREATEST(0, (
          SELECT count(*)::integer
          FROM public.buildings
          WHERE locality_id = v_old_locality
            AND (is_deleted = false OR is_deleted IS NULL)
            AND id != NEW.id  -- exclude the row being updated
        )),
        updated_at = now()
      WHERE id = v_old_locality;
    END IF;

    RETURN NEW;
  END IF;

  -- ------------------------------------------------------------------
  -- Normalise city, country, and country_code
  -- (mirrors the normalization in migration 01)
  -- ------------------------------------------------------------------
  v_city    := initcap(trim(NEW.city));
  v_country := initcap(trim(NEW.country));

  -- Derive country_code if not already set
  v_country_code := COALESCE(
    NULLIF(trim(NEW.country_code), ''),
    public.country_name_to_code(NEW.country)
  );

  -- Propagate normalised values back onto the row
  NEW.city         := v_city;
  NEW.country      := v_country;
  NEW.country_code := v_country_code;

  -- If we still have no country_code, we cannot link to a locality
  IF v_country_code IS NULL THEN
    NEW.locality_id := NULL;
    RETURN NEW;
  END IF;

  -- ------------------------------------------------------------------
  -- Build slugs for a potential new locality
  -- ------------------------------------------------------------------
  v_slug      := public.make_locality_slug(v_city, v_country_code);
  v_city_slug := public.make_city_slug(v_city);

  -- ------------------------------------------------------------------
  -- Look up existing locality, or create a new one
  -- ------------------------------------------------------------------
  SELECT id INTO v_locality_id
  FROM public.localities
  WHERE city         = v_city
    AND country_code = v_country_code;

  IF v_locality_id IS NULL THEN
    -- First building in this city: create the locality row
    INSERT INTO public.localities (city, country, country_code, slug, city_slug)
    VALUES (v_city, v_country, v_country_code, v_slug, v_city_slug)
    ON CONFLICT (city, country_code)
      DO UPDATE SET
        city_slug  = EXCLUDED.city_slug,
        updated_at = now()   -- race-condition safety
    RETURNING id INTO v_locality_id;
  ELSE
    -- Ensure city_slug is populated (handles rows created before this migration)
    UPDATE public.localities
    SET city_slug = v_city_slug
    WHERE id = v_locality_id
      AND (city_slug IS NULL OR city_slug = '');
  END IF;

  -- Assign the locality to this building
  NEW.locality_id := v_locality_id;

  -- ------------------------------------------------------------------
  -- Update buildings_count on affected localities
  --
  -- We do a full recount (rather than +1/-1) to stay accurate in the
  -- face of bulk imports, soft-deletes, and concurrent writes.
  -- The index on buildings(locality_id) makes this fast.
  -- ------------------------------------------------------------------

  -- Update the new (or same) locality
  UPDATE public.localities
  SET
    buildings_count = (
      SELECT count(*)::integer
      FROM public.buildings
      WHERE locality_id = v_locality_id
        AND (is_deleted = false OR is_deleted IS NULL)
        -- For INSERT, the new row is not yet committed, so add 1 if not deleted
        AND id != NEW.id
    ) + CASE
          WHEN (NEW.is_deleted = false OR NEW.is_deleted IS NULL) THEN 1
          ELSE 0
        END,
    updated_at = now()
  WHERE id = v_locality_id;

  -- Update the old locality (if the building moved to a different city)
  IF v_old_locality IS NOT NULL AND v_old_locality IS DISTINCT FROM v_locality_id THEN
    UPDATE public.localities
    SET
      buildings_count = (
        SELECT count(*)::integer
        FROM public.buildings
        WHERE locality_id = v_old_locality
          AND (is_deleted = false OR is_deleted IS NULL)
          AND id != NEW.id
      ),
      updated_at = now()
    WHERE id = v_old_locality;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_building_locality() IS
  'BEFORE trigger on buildings. '
  'Normalises city/country/country_code, looks up or creates the matching '
  'localities row (including city_slug), sets buildings.locality_id, and keeps '
  'localities.buildings_count in sync. Fires on INSERT and UPDATE when city, '
  'country, country_code, or is_deleted changes.';


-- -----------------------------------------------------------------------------
-- STEP 6: Verify
--
-- After applying, run these checks in psql or the Supabase SQL editor:
--
-- 1. Spot-check the new column:
--
--    SELECT city, country_code, slug, city_slug FROM localities LIMIT 20;
--
-- 2. Confirm no empty city_slug values remain:
--
--    SELECT count(*) FROM localities WHERE city_slug = '';
--    -- Expected: 0
--
-- 3. Confirm the UNIQUE constraint blocks a duplicate:
--
--    INSERT INTO localities (city, country, country_code, slug, city_slug)
--    VALUES ('Paris', 'France', 'FR', 'paris-fr-dup', 'paris');
--    -- Expected: ERROR: duplicate key value violates unique constraint
--    --           "localities_country_code_city_slug_unique"
-- -----------------------------------------------------------------------------
