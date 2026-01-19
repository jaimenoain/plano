-- Add live mode columns to poll_questions
ALTER TABLE poll_questions
ADD COLUMN IF NOT EXISTS is_live_active BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_revealed BOOLEAN NOT NULL DEFAULT FALSE;
