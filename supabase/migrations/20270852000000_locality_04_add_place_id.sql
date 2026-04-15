-- Add Google Place ID to localities for future canonical deduplication
ALTER TABLE public.localities
  ADD COLUMN IF NOT EXISTS google_place_id text;

-- Unique only where non-null (sparse unique index, not a constraint)
CREATE UNIQUE INDEX IF NOT EXISTS localities_google_place_id_idx
  ON public.localities (google_place_id)
  WHERE google_place_id IS NOT NULL;

COMMENT ON COLUMN public.localities.google_place_id IS
  'Google Maps Place ID for the city centre (e.g. ChIJdd4hrwug2EcRmSrV3Vo6llI
  for London). Nullable — populated opportunistically. Used to identify and
  merge duplicate locality rows that differ in city name but refer to the same
  place. Set manually via admin or via a future enrichment job.';
