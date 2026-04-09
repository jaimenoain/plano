-- Contacts-only reviews: allow any follower to read (one-way follow), matching docs/DATA_CONTRACT.md
-- and feed RPCs (e.g. get_feed) that include rows where follower_id = viewer and following_id = author.
-- Replaces is_mutual_contact() in user_buildings SELECT policy (mutual follow was too strict).

DROP POLICY IF EXISTS "Users can view user_buildings" ON public.user_buildings;

CREATE POLICY "Users can view user_buildings" ON public.user_buildings
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
    OR (
      visibility IS DISTINCT FROM 'private'
      AND (
        COALESCE(visibility, 'public') = 'public'
        OR (
          visibility = 'contacts'
          AND EXISTS (
            SELECT 1
            FROM public.follows f
            WHERE f.follower_id = (SELECT auth.uid())
              AND f.following_id = user_buildings.user_id
          )
        )
      )
    )
  );
