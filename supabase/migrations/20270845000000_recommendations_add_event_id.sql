-- Events Additions Phase 4 Task 4.1: extend `recommendations` with optional `event_id`.
-- Apply via Supabase SQL Editor (never `supabase db push`). Depends on `public.events` (migration `20270844000000_add_events.sql`).
-- Existing rows keep `building_id` set and `event_id` null; new event recommendations use `event_id` only (`building_id` null).

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events (id) ON DELETE CASCADE;

ALTER TABLE public.recommendations
  ALTER COLUMN building_id DROP NOT NULL;

ALTER TABLE public.recommendations
  DROP CONSTRAINT IF EXISTS recommendations_single_target_check;

ALTER TABLE public.recommendations
  ADD CONSTRAINT recommendations_single_target_check CHECK (
    (building_id IS NOT NULL AND event_id IS NULL)
    OR (building_id IS NULL AND event_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_recommendations_event_id ON public.recommendations (event_id)
  WHERE event_id IS NOT NULL;

COMMENT ON COLUMN public.recommendations.event_id IS
  'When set, this recommendation targets an event; `building_id` must be null. Phase 4 Task 4.1.';
