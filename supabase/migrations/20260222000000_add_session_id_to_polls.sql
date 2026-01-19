
-- Add session_id to polls table if it doesn't exist
ALTER TABLE "public"."polls"
ADD COLUMN IF NOT EXISTS "session_id" uuid REFERENCES "public"."group_sessions"("id") ON DELETE SET NULL;

-- Add index for better query performance if it doesn't exist
CREATE INDEX IF NOT EXISTS polls_session_id_idx ON "public"."polls"("session_id");
