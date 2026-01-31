CREATE OR REPLACE FUNCTION get_collection_stats(collection_uuid uuid)
RETURNS TABLE(building_id uuid, user_id uuid, status text, rating integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  coll_record record;
  target_users uuid[];
  can_view boolean;
BEGIN
  -- 1. Get collection info
  SELECT * INTO coll_record FROM collections WHERE id = collection_uuid;

  IF coll_record IS NULL THEN
     RETURN;
  END IF;

  -- 2. Check visibility
  can_view := (
      coll_record.is_public
      OR (auth.uid() = coll_record.owner_id)
      OR (
          auth.uid() IS NOT NULL AND EXISTS (
              SELECT 1 FROM collection_contributors
              WHERE collection_id = collection_uuid AND user_id = auth.uid()
          )
      )
  );

  IF NOT can_view THEN
      RETURN;
  END IF;

  -- 3. Determine target users
  IF coll_record.categorization_selected_members IS NOT NULL AND array_length(coll_record.categorization_selected_members, 1) > 0 THEN
      target_users := coll_record.categorization_selected_members;
  ELSE
      -- Default: owner + contributors
      SELECT array_append(array_agg(user_id), coll_record.owner_id)
      INTO target_users
      FROM collection_contributors
      WHERE collection_id = collection_uuid;

      IF target_users IS NULL THEN
          target_users := ARRAY[coll_record.owner_id];
      END IF;
  END IF;

  -- 4. Return user_buildings data
  RETURN QUERY
  SELECT
    ub.building_id,
    ub.user_id,
    ub.status::text,
    ub.rating
  FROM user_buildings ub
  JOIN collection_items ci ON ci.building_id = ub.building_id
  WHERE ci.collection_id = collection_uuid
  AND ub.user_id = ANY(target_users);

END;
$$;
