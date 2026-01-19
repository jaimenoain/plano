
DO $$
BEGIN
    -- 1. Ensure poll_votes has a foreign key to polls(id)
    -- This helps ensure data integrity and allows explicit joining
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'poll_votes_poll_id_fkey'
        AND table_name = 'poll_votes'
    ) THEN
        -- Check if the column exists first
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'poll_votes'
            AND column_name = 'poll_id'
        ) THEN
            ALTER TABLE poll_votes
            ADD CONSTRAINT poll_votes_poll_id_fkey
            FOREIGN KEY (poll_id)
            REFERENCES polls(id)
            ON DELETE CASCADE;
        END IF;
    END IF;

    -- 2. Add an index on poll_votes(poll_id) for performance
    -- This addresses the "long to load" issue by optimizing the join
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'poll_votes'
        AND indexname = 'idx_poll_votes_poll_id'
    ) THEN
        CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
    END IF;

    -- 3. Add an index on poll_votes(user_id) for performance (checking if user voted)
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'poll_votes'
        AND indexname = 'idx_poll_votes_user_id'
    ) THEN
        CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);
    END IF;

END $$;
