-- Persist Google Places primary type for trip-logistics marker icons (distinct from coarse category).
ALTER TABLE public.collection_markers
  ADD COLUMN IF NOT EXISTS google_primary_type text;

COMMENT ON COLUMN public.collection_markers.google_primary_type IS
  'Google Places API primary type (e.g. bakery, cafe). Used for map/list icons; category remains the coarse bucket.';
