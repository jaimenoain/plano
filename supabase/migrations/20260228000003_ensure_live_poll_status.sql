
-- Ensure 'live' is in poll_status enum
-- Idempotent check to avoid errors if it already exists

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'live') THEN
            ALTER TYPE poll_status ADD VALUE 'live';
        END IF;
    END IF;
END $$;
