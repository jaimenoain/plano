ALTER TABLE "public"."group_sessions" ADD COLUMN IF NOT EXISTS "location" text;
ALTER TABLE "public"."group_sessions" ADD COLUMN IF NOT EXISTS "session_type" text DEFAULT 'physical';
