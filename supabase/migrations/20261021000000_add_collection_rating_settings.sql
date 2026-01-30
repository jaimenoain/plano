-- Add rating display settings to collections table
ALTER TABLE "collections"
ADD COLUMN "rating_mode" text CHECK (rating_mode IN ('viewer', 'contributors_max', 'admins_max', 'member')) DEFAULT 'viewer',
ADD COLUMN "rating_source_user_id" uuid REFERENCES "profiles"("id");

COMMENT ON COLUMN "collections"."rating_mode" IS 'Determines whose ratings/status to display on the map: viewer (default), contributors_max, admins_max, or specific member.';
COMMENT ON COLUMN "collections"."rating_source_user_id" IS 'The user ID to use when rating_mode is "member".';
