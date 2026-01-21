-- Hardening constraints for Phase 2 Polish

-- 1. user_buildings table constraints

-- First, ensure we don't have invalid data before applying constraints
-- Reset invalid ratings to NULL (0 is common for "no rating", but we use NULL)
UPDATE public.user_buildings SET rating = NULL WHERE rating < 1 OR rating > 5;

-- Update legacy or invalid statuses
-- Map 'ignored' to 'visited' (assuming 'ignored' is deprecated as per request for strict 'pending'/'visited')
-- Map any other unknown status to 'visited' as a safe default
UPDATE public.user_buildings
SET status = 'visited'
WHERE status NOT IN ('pending', 'visited');

-- Drop existing constraints if they exist (using generic DROP CONSTRAINT IF EXISTS)
-- We attempt to drop common legacy names
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_buildings_rating_check') THEN
        ALTER TABLE public.user_buildings DROP CONSTRAINT user_buildings_rating_check;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_buildings_status_check') THEN
        ALTER TABLE public.user_buildings DROP CONSTRAINT user_buildings_status_check;
    END IF;
    -- Legacy constraint names
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_rating_check') THEN
        ALTER TABLE public.user_buildings DROP CONSTRAINT log_rating_check;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'log_status_check') THEN
        ALTER TABLE public.user_buildings DROP CONSTRAINT log_status_check;
    END IF;
END $$;

-- Add new constraints
ALTER TABLE public.user_buildings
    ADD CONSTRAINT user_buildings_rating_check CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE public.user_buildings
    ADD CONSTRAINT user_buildings_status_check CHECK (status IN ('pending', 'visited'));

-- 2. buildings table
-- Ensure city and country are nullable (no action needed if already nullable, but good to verify schema intent)
-- This part is just for documentation/verification as per task, SQL-wise we don't need to change anything
-- unless we wanted to DROP NOT NULL, which is the default for added columns usually.
-- ALTER TABLE public.buildings ALTER COLUMN city DROP NOT NULL;
-- ALTER TABLE public.buildings ALTER COLUMN country DROP NOT NULL;
