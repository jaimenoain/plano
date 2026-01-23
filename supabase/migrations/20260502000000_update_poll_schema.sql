-- Update poll_status enum with missing values
DO $$
BEGIN
    -- Check and add 'live' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'live') THEN
        ALTER TYPE poll_status ADD VALUE 'live';
    END IF;

    -- Check and add 'open' if it doesn't exist (safety check)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'open') THEN
        ALTER TYPE poll_status ADD VALUE 'open';
    END IF;

    -- Check and add 'closed' if it doesn't exist (safety check)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'closed') THEN
        ALTER TYPE poll_status ADD VALUE 'closed';
    END IF;

    -- Check and add 'published' if it doesn't exist (safety check, though likely added in previous migration)
     IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'published') THEN
        ALTER TYPE poll_status ADD VALUE 'published';
    END IF;

     -- Check and add 'draft' if it doesn't exist (safety check)
     IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'poll_status'::regtype AND enumlabel = 'draft') THEN
        ALTER TYPE poll_status ADD VALUE 'draft';
    END IF;
END $$;

-- Remove unused 'label' column from poll_options
ALTER TABLE public.poll_options DROP COLUMN IF EXISTS label;
