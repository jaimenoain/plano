
-- Fix for "invalid input value for enum poll_status: live" error
-- This allows the 'live' status to be used in queries and inserts

DO $$
BEGIN
    -- Check if the enum type exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_status') THEN
        -- Add 'live' to the enum if it doesn't exist
        -- Note: ALTER TYPE ... ADD VALUE cannot be used inside a DO block in some versions depending on transaction state,
        -- but usually it works if not inside a transaction block. However, Supabase migrations run in transactions.
        -- ALTER TYPE ... ADD VALUE cannot be run inside a transaction block in older Postgres, but usually fine in 12+.
        -- To be safe, we can't check 'IF EXISTS' for the value easily in standard SQL without querying pg_enum.

        IF NOT EXISTS (
            SELECT 1
            FROM pg_enum
            WHERE enumtypid = 'poll_status'::regtype
            AND enumlabel = 'live'
        ) THEN
            ALTER TYPE poll_status ADD VALUE 'live';
        END IF;
    END IF;
END $$;
