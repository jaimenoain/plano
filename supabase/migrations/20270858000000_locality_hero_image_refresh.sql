-- =============================================================================
-- Migration: locality_hero_image_refresh
-- Purpose:   Backfill localities.hero_image_url with the most community-liked
--            landscape photo from buildings in that locality, and schedule a
--            weekly job to keep it updated using a rolling 90-day likes window.
--
-- Logic:
--   1. Primary sort: likes received in the last 90 days (rolling quarterly).
--   2. Tie-break / fallback: all-time likes_count (for cities with little
--      recent activity, they still get a hero image rather than NULL).
--   3. Only landscape images (width_px > height_px, width_px >= 1000) are
--      eligible — same criteria as the building detail hero.
--
-- Depends on: locality_02 (localities table), review_images_dimensions
--             (width_px / height_px columns), pg_cron extension (already
--             enabled in schedule_building_tiers_update).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Function: refresh_locality_hero_images()
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_locality_hero_images()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH recent_likes AS (
    -- Count likes received in the last 90 days per image
    SELECT
      il.image_id,
      COUNT(*) AS recent_likes_count
    FROM image_likes il
    WHERE il.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY il.image_id
  ),
  ranked_images AS (
    -- For each locality, rank eligible images by recent popularity,
    -- falling back to all-time likes for cities with low recent activity.
    SELECT
      l.id AS locality_id,
      ri.storage_path,
      ROW_NUMBER() OVER (
        PARTITION BY l.id
        ORDER BY
          COALESCE(rl.recent_likes_count, 0) DESC,
          ri.likes_count DESC,
          ri.created_at DESC
      ) AS rn
    FROM localities l
    JOIN buildings b
      ON b.locality_id = l.id
      AND (b.is_deleted = false OR b.is_deleted IS NULL)
    JOIN user_buildings ub
      ON ub.building_id = b.id
    JOIN review_images ri
      ON ri.review_id = ub.id
    LEFT JOIN recent_likes rl
      ON rl.image_id = ri.id
    WHERE ri.width_px >= 1000
      AND ri.width_px > ri.height_px   -- landscape only
  )
  UPDATE localities l
  SET
    hero_image_url = r.storage_path,
    updated_at     = NOW()
  FROM ranked_images r
  WHERE l.id = r.locality_id
    AND r.rn = 1
    -- Only overwrite if the top candidate differs from what's stored,
    -- avoiding unnecessary writes on rows that haven't changed.
    AND (l.hero_image_url IS DISTINCT FROM r.storage_path);
END;
$$;

COMMENT ON FUNCTION public.refresh_locality_hero_images() IS
  'Updates localities.hero_image_url to the most-liked landscape image '
  '(≥1000px wide) from buildings in that locality, scored by likes received '
  'in the last 90 days with an all-time fallback. Run weekly via pg_cron.';


-- -----------------------------------------------------------------------------
-- 2. Backfill: run once immediately to populate existing localities
-- -----------------------------------------------------------------------------

SELECT public.refresh_locality_hero_images();


-- -----------------------------------------------------------------------------
-- 3. Schedule: run every Monday at 03:00 UTC
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-locality-hero-images');
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;

SELECT cron.schedule(
  'refresh-locality-hero-images',
  '0 3 * * 1',  -- every Monday at 03:00 UTC
  $$SELECT public.refresh_locality_hero_images()$$
);
