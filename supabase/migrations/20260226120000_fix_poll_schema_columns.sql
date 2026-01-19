
-- 1. Ensure poll_questions table exists
CREATE TABLE IF NOT EXISTS poll_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
    question_text text,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    allow_custom_answer boolean DEFAULT false,
    response_type text DEFAULT 'text',
    media_type text,
    media_url text,
    media_data jsonb
);

-- 2. Fix question_text column in poll_questions
DO $$
BEGIN
    -- Check if question_text exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'poll_questions' AND column_name = 'question_text'
    ) THEN
        -- Check if 'text' column exists (legacy name)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'poll_questions' AND column_name = 'text'
        ) THEN
            ALTER TABLE poll_questions RENAME COLUMN text TO question_text;
        ELSE
            ALTER TABLE poll_questions ADD COLUMN question_text text;
        END IF;
    END IF;
END $$;

-- 3. Ensure poll_options table exists
CREATE TABLE IF NOT EXISTS poll_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id uuid REFERENCES poll_questions(id) ON DELETE CASCADE,
    option_text text,
    is_correct boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    order_index integer DEFAULT 0,
    content_type text DEFAULT 'text',
    media_url text,
    tmdb_id integer
);

-- 4. Fix option_text column in poll_options
DO $$
BEGIN
    -- Check if option_text exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'poll_options' AND column_name = 'option_text'
    ) THEN
        -- Check if 'text' column exists (legacy name)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'poll_options' AND column_name = 'text'
        ) THEN
            ALTER TABLE poll_options RENAME COLUMN text TO option_text;
        ELSE
            ALTER TABLE poll_options ADD COLUMN option_text text;
        END IF;
    END IF;
END $$;

-- 5. Ensure recent columns exist (Idempotent checks)
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS response_type text DEFAULT 'text';
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE poll_questions ADD COLUMN IF NOT EXISTS media_data jsonb;

ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text';
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE poll_options ADD COLUMN IF NOT EXISTS tmdb_id integer;
