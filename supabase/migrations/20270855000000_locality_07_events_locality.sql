-- T12: Add locality fields to events table
-- These fields are set manually when an event is created or edited in EventForm.
-- No trigger — consistent with the buildings pattern (denormalized for fast URL construction).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS locality_id uuid NULL REFERENCES public.localities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS country_code text NULL,
  ADD COLUMN IF NOT EXISTS city_slug text NULL;

COMMENT ON COLUMN public.events.locality_id IS 'Links the event to a locality row. NULL for virtual/online events.';
COMMENT ON COLUMN public.events.country_code IS 'Denormalized ISO 3166-1 alpha-2 code from the linked locality. NULL for virtual events.';
COMMENT ON COLUMN public.events.city_slug IS 'Denormalized city_slug from the linked locality, for URL construction. NULL for virtual events.';
