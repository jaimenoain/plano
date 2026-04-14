-- Phase 4 Task 4.1b: nullable JSON for notification context (e.g. event_slug / event_title on recommendations).
-- Idempotent: legacy migration 20260224000000_watchlist_availability.sql may have added this column already.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb;
