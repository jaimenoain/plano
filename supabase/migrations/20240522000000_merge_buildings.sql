-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to find potential duplicates
CREATE OR REPLACE FUNCTION get_potential_duplicates(
  limit_count INT DEFAULT 50,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id1 UUID,
  name1 TEXT,
  id2 UUID,
  name2 TEXT,
  score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b1.id AS id1,
    b1.name AS name1,
    b2.id AS id2,
    b2.name AS name2,
    similarity(b1.name, b2.name)::FLOAT AS score
  FROM buildings b1
  JOIN buildings b2 ON b1.id < b2.id
  WHERE
    b1.is_deleted = false
    AND b2.is_deleted = false
    AND similarity(b1.name, b2.name) > similarity_threshold
  ORDER BY score DESC
  LIMIT limit_count;
END;
$$;

-- Function to merge buildings
CREATE OR REPLACE FUNCTION merge_buildings(
  master_id UUID,
  duplicate_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dup_opt RECORD;
    master_opt_id UUID;
BEGIN
  -- 1. Migrate User Logs (user_buildings)
  -- For logs where user has reviewed Duplicate but NOT Master, move them to Master.
  UPDATE user_buildings
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND user_id NOT IN (
    SELECT user_id FROM user_buildings WHERE building_id = master_id
  );

  -- For logs where user reviewed BOTH, delete the Duplicate log (keep Master).
  DELETE FROM user_buildings
  WHERE building_id = duplicate_id;

  -- 2. Migrate Recommendations
  UPDATE recommendations
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM recommendations r2
    WHERE r2.building_id = master_id
    AND r2.recipient_id = recommendations.recipient_id
    AND r2.recommender_id = recommendations.recommender_id
  );

  DELETE FROM recommendations WHERE building_id = duplicate_id;

  -- 3. Migrate Watchlist Notifications
  UPDATE watchlist_notifications
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM watchlist_notifications w2
    WHERE w2.building_id = master_id
    AND w2.user_id = watchlist_notifications.user_id
    AND w2.provider_name = watchlist_notifications.provider_name
  );

  DELETE FROM watchlist_notifications WHERE building_id = duplicate_id;

  -- 4. Migrate Session Buildings
  UPDATE session_buildings
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM session_buildings s2
    WHERE s2.building_id = master_id
    AND s2.session_id = session_buildings.session_id
  );

  DELETE FROM session_buildings WHERE building_id = duplicate_id;

  -- 5. Migrate Group Backlog Items
  UPDATE group_backlog_items
  SET building_id = master_id
  WHERE building_id = duplicate_id
  AND NOT EXISTS (
    SELECT 1 FROM group_backlog_items g2
    WHERE g2.building_id = master_id
    AND g2.group_id = group_backlog_items.group_id
  );

  DELETE FROM group_backlog_items WHERE building_id = duplicate_id;

  -- 6. Migrate Film Availability (just delete duplicates, scraper will handle master)
  DELETE FROM film_availability WHERE building_id = duplicate_id;

  -- 7. Poll Options
  -- Loop through options of duplicate building
  FOR dup_opt IN
      SELECT * FROM poll_options WHERE building_id = duplicate_id
  LOOP
      -- Check if master building is already an option in the same question
      SELECT id INTO master_opt_id
      FROM poll_options
      WHERE question_id = dup_opt.question_id
      AND building_id = master_id;

      IF master_opt_id IS NOT NULL THEN
          -- Master option exists. Move votes.
          UPDATE poll_votes SET option_id = master_opt_id WHERE option_id = dup_opt.id;
          -- Delete duplicate option
          DELETE FROM poll_options WHERE id = dup_opt.id;
      ELSE
          -- No master option. Safe to update building_id.
          UPDATE poll_options SET building_id = master_id WHERE id = dup_opt.id;
      END IF;
  END LOOP;

  -- 8. Soft Delete Duplicate Building
  UPDATE buildings
  SET is_deleted = true
  WHERE id = duplicate_id;

END;
$$;
