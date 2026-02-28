-- Enable the pg_cron extension if it doesn't already exist
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule the job if it exists to avoid conflicts
DO $$
BEGIN
  PERFORM cron.unschedule('update-building-tiers-daily');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore error if job does not exist yet
END
$$;

-- Schedule the job to run every day at midnight (UTC)
SELECT cron.schedule(
  'update-building-tiers-daily',
  '0 0 * * *',
  $$SELECT public.update_building_tiers()$$
);
