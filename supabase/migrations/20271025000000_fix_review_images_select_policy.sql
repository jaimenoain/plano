-- =============================================================================
-- Migration: fix review_images SELECT policy
--
-- Root cause (confirmed 2026-05-17):
--   The SELECT policy on review_images was silently joining review_images.review_id
--   against user_buildings.id instead of building_posts.id.  After migration
--   20270872000000 the FK was re-pointed at building_posts, so any building_post
--   row created *after* that migration has a UUID that exists only in
--   building_posts — not in user_buildings.  Photos attached to those new-style
--   posts were therefore invisible through every PostgREST read path (direct
--   SELECT, embed, and .in() filter) even though the rows were physically present
--   in the table (confirmed by service_role queries).
--
--   Old posts whose UUIDs were migrated from user_buildings → building_posts with
--   the same UUID did appear (the UUID existed in both tables, so the bad join
--   passed).
--
-- Fix:
--   Drop all current SELECT policies on review_images (including any added via the
--   Supabase dashboard outside of this repo) and restore the canonical
--   USING (true) policy that the original schema intended.
-- =============================================================================

DO $$
DECLARE
    pol TEXT;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'review_images'
          AND cmd        = 'SELECT'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.review_images', pol);
    END LOOP;
END;
$$;

CREATE POLICY "Review images are viewable by everyone"
    ON public.review_images FOR SELECT
    USING (true);
