-- Add century column to buildings
-- When year_completed is set, century is auto-computed by trigger.
-- When year_completed is null, century can be set manually.

ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS century integer;

-- Backfill from existing year_completed values
UPDATE public.buildings
SET century = CEIL(year_completed::numeric / 100)::integer
WHERE year_completed IS NOT NULL;

-- Trigger function: auto-compute century whenever year_completed is set
CREATE OR REPLACE FUNCTION public.sync_building_century()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.year_completed IS NOT NULL THEN
    NEW.century := CEIL(NEW.year_completed::numeric / 100)::integer;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_building_century_trigger ON public.buildings;
CREATE TRIGGER sync_building_century_trigger
  BEFORE INSERT OR UPDATE OF year_completed ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.sync_building_century();
