-- buildings.updated_at: sitemap lastmod + future freshness signals.
-- Backfill from created_at; bump on every UPDATE.

ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.buildings
SET updated_at = COALESCE(created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.buildings
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.buildings_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buildings_touch_updated_at ON public.buildings;
CREATE TRIGGER trg_buildings_touch_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.buildings_touch_updated_at();
