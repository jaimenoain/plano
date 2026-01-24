-- Fix legacy trigger that references non-existent film_id column in user_buildings (formerly log)
-- This trigger causes inserts into user_buildings to fail with 'record "new" has no field "film_id"'

DROP TRIGGER IF EXISTS trigger_update_film_community_stats ON user_buildings;
DROP TRIGGER IF EXISTS trigger_update_film_community_stats ON log;
DROP FUNCTION IF EXISTS update_film_community_stats();
