-- Fix merge_buildings: remove dropped tables/columns and add building_posts/building_credits handling.
--
-- Changes since the last version of this function (20270812000000_remove_groups_feature.sql):
--   • building_architects dropped in 20270837000000 → replaced with building_credits
--   • user_buildings.content/tags/video_url/visibility/edited_at dropped in 20270872000000
--   • review_images.review_id now FKs to building_posts(id), not user_buildings(id)
--   • building_posts table added in 20270872000000 → must be re-pointed to target building

CREATE OR REPLACE FUNCTION merge_buildings(source_id UUID, target_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  building_snapshot JSONB;
  conflict_record   RECORD;
  target_ub_id      UUID;
  admin_user_id     UUID;
BEGIN
  IF source_id = target_id THEN
    RAISE EXCEPTION 'Cannot merge a building into itself.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = source_id) THEN
    RAISE EXCEPTION 'Source building not found.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM buildings WHERE id = target_id) THEN
    RAISE EXCEPTION 'Target building not found.';
  END IF;

  SELECT row_to_json(b) INTO building_snapshot FROM buildings b WHERE id = source_id;
  admin_user_id := auth.uid();

  -- ==============================================================================
  -- MIGRATION: User Buildings (visit status + rating)
  -- content/tags/video_url were moved to building_posts in 20270872000000.
  -- ==============================================================================

  -- A. Conflicts: user has a user_buildings row for BOTH buildings.
  --    Keep the target row; rescue the source rating if target has none.
  FOR conflict_record IN
    SELECT ub.id, ub.user_id, ub.rating
    FROM user_buildings ub
    WHERE ub.building_id = source_id
      AND EXISTS (
        SELECT 1 FROM user_buildings ub2
        WHERE ub2.building_id = target_id AND ub2.user_id = ub.user_id
      )
  LOOP
    SELECT id INTO target_ub_id
    FROM user_buildings
    WHERE building_id = target_id AND user_id = conflict_record.user_id;

    UPDATE user_buildings
    SET rating = COALESCE(rating, conflict_record.rating)
    WHERE id = target_ub_id
      AND rating IS NULL;

    DELETE FROM user_buildings WHERE id = conflict_record.id;
  END LOOP;

  -- B. Non-conflicts: simply re-point to target building.
  UPDATE user_buildings
  SET building_id = target_id
  WHERE building_id = source_id;

  -- ==============================================================================
  -- MIGRATION: Building Posts (reviews/notes — now a separate table)
  -- Users can have multiple posts per building; all source posts move to target.
  -- ==============================================================================

  UPDATE building_posts
  SET building_id = target_id
  WHERE building_id = source_id;

  -- ==============================================================================
  -- MIGRATION: Recommendations
  -- ==============================================================================

  UPDATE recommendations
  SET building_id = target_id
  WHERE building_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM recommendations r2
      WHERE r2.building_id = target_id
        AND r2.recipient_id = recommendations.recipient_id
        AND r2.recommender_id = recommendations.recommender_id
    );
  DELETE FROM recommendations WHERE building_id = source_id;

  -- ==============================================================================
  -- MIGRATION: Building Credits
  -- Move credits for entities not already credited on target; drop duplicates.
  -- ==============================================================================

  UPDATE building_credits
  SET building_id = target_id
  WHERE building_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM building_credits bc2
      WHERE bc2.building_id = target_id
        AND (
          (building_credits.person_id IS NOT NULL AND bc2.person_id = building_credits.person_id)
          OR
          (building_credits.company_id IS NOT NULL AND bc2.company_id = building_credits.company_id)
        )
    );
  DELETE FROM building_credits WHERE building_id = source_id;

  -- ==============================================================================
  -- FINAL CLEANUP
  -- ==============================================================================

  UPDATE buildings
  SET is_deleted    = true,
      merged_into_id = target_id
  WHERE id = source_id;

  -- ==============================================================================
  -- AUDIT LOGGING
  -- ==============================================================================

  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    admin_user_id,
    'MERGE_BUILDINGS',
    'building',
    target_id::text,
    json_build_object(
      'source_id',        source_id,
      'source_snapshot',  building_snapshot,
      'timestamp',        now()
    )
  );
END;
$$;
