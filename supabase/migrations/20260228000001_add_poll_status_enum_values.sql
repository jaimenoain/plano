-- Add 'draft' and 'published' to poll_status enum
-- Separated into its own migration to avoid "unsafe use of new value" error (55P04)
-- This file must be committed before these values are used in policies/queries.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'draft') THEN
            ALTER TYPE poll_status ADD VALUE 'draft';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'published') THEN
            ALTER TYPE poll_status ADD VALUE 'published';
        END IF;
    END IF;
END $$;
