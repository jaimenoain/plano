ALTER TABLE "public"."follows" ADD COLUMN IF NOT EXISTS "is_close_friend" boolean NOT NULL DEFAULT false;
