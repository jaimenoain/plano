-- =============================================================================
-- Migration: locality_03_trigger_sync_locality
-- Purpose:   Trigger on buildings that automatically creates or links a
--            locality row whenever a building is inserted or its city/country
--            is updated.
--
-- Depends on: locality_01 (country_code column) + locality_02 (localities table)
--
-- Trigger fires: BEFORE INSERT OR UPDATE on buildings
-- Watched columns: city, country, country_code, is_deleted
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1: Trigger function
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
  -- Build the slug for a potential new locality
  -- ------------------------------------------------------------------
  v_slug := public.make_locality_slug(v_city, v_country_code);

  -- ------------------------------------------------------------------
  -- Look up existing locality, or create a new one
  -- ------------------------------------------------------------------
  SELECT id INTO v_locality_id
  FROM public.localities
  WHERE city         = v_city
    AND country_code = v_country_code;

  IF v_locality_id IS NULL THEN
    -- First building in this city: create the locality row
    INSERT INTO public.localities (city, country, country_code, slug)
    VALUES (v_city, v_country, v_country_code, v_slug)
    ON CONFLICT (city, country_code)
      DO UPDATE SET updated_at = now()   -- race-condition safety
    RETURNING id INTO v_locality_id;
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
  'localities row, sets buildings.locality_id, and keeps localities.buildings_count '
  'in sync. Fires on INSERT and UPDATE when city, country, country_code, or '
  'is_deleted changes.';


-- -----------------------------------------------------------------------------
-- STEP 2: Attach the trigger to buildings
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS buildings_sync_locality ON public.buildings;

CREATE TRIGGER buildings_sync_locality
  BEFORE INSERT OR UPDATE OF city, country, country_code, is_deleted
  ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_building_locality();

COMMENT ON TRIGGER buildings_sync_locality ON public.buildings IS
  'Keeps buildings.locality_id and localities.buildings_count in sync. '
  'Fires before insert or before updates that touch city/country/country_code/is_deleted.';


-- -----------------------------------------------------------------------------
-- STEP 3: Smoke test
--
-- After applying, verify the trigger is working:
--
-- 1. Check a known city resolves correctly:
--
--    SELECT b.id, b.name, b.city, b.country_code, b.locality_id, l.slug
--    FROM buildings b
--    JOIN localities l ON l.id = b.locality_id
--    WHERE b.city = 'London'
--    LIMIT 5;
--
-- 2. Check buildings_count matches a direct count:
--
--    SELECT
--      l.city, l.country_code, l.buildings_count,
--      count(b.id) AS actual_count,
--      l.buildings_count - count(b.id)::integer AS drift
--    FROM localities l
--    LEFT JOIN buildings b
--      ON b.locality_id = l.id
--      AND (b.is_deleted = false OR b.is_deleted IS NULL)
--    GROUP BY l.id, l.city, l.country_code, l.buildings_count
--    HAVING l.buildings_count != count(b.id)::integer
--    ORDER BY abs(l.buildings_count - count(b.id)::integer) DESC;
--
--    (Should return 0 rows if migration 02 and the trigger are both healthy.)
-- -----------------------------------------------------------------------------
