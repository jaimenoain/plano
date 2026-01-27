-- Update get_feed RPC to include viewer_status
DROP FUNCTION IF EXISTS get_feed(INT, INT);

CREATE OR REPLACE FUNCTION get_feed(p_limit INT, p_offset INT)
RETURNS TABLE (
  id UUID,
  content TEXT,
  rating INTEGER,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  group_id UUID,
  building_id UUID,
  user_data JSONB,
  building_data JSONB,
  likes_count BIGINT,
  comments_count BIGINT,
  is_liked BOOLEAN,
  review_images JSONB,
  viewer_status TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH friend_ids AS (
      SELECT following_id FROM follows WHERE follower_id = v_user_id
  )
  SELECT
    ub.id,
    ub.content,
    ub.rating,
    ub.tags,
    ub.created_at,
    ub.edited_at,
    ub.status::TEXT,
    ub.user_id,
    ub.group_id,
    ub.building_id,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'short_id', b.short_id,
      'slug', b.slug,
      'name', b.name,
      'address', b.address,
      'city', b.city,
      'country', b.country,
      'main_image_url', b.main_image_url,
      'architects', b.architects,
      'year_completed', b.year_completed
    ) AS building_data,
    (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = ub.id) AS likes_count,
    (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = ub.id) AS comments_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = ub.id AND l.user_id = v_user_id) AS is_liked,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ri.id,
                    'storage_path', ri.storage_path,
                    'likes_count', ri.likes_count,
                    'is_liked', EXISTS(SELECT 1 FROM image_likes il WHERE il.image_id = ri.id AND il.user_id = v_user_id)
                )
            )
            FROM review_images ri
            WHERE ri.review_id = ub.id
        ),
        '[]'::jsonb
    ) AS review_images,
    (SELECT ub2.status::TEXT FROM user_buildings ub2 WHERE ub2.building_id = ub.building_id AND ub2.user_id = v_user_id LIMIT 1) AS viewer_status
  FROM
    user_buildings ub
  LEFT JOIN
    profiles p ON ub.user_id = p.id
  LEFT JOIN
    buildings b ON ub.building_id = b.id
  WHERE
    ub.user_id = v_user_id OR ub.user_id IN (SELECT following_id FROM friend_ids)
  ORDER BY
    ub.created_at DESC
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
