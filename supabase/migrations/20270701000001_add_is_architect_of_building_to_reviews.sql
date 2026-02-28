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
  review_images JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
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
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (SELECT 1 FROM architect_claims ac WHERE ac.user_id = p.id AND ac.status = 'verified'),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM architect_claims ac
        JOIN building_architects ba ON ac.architect_id = ba.architect_id
        WHERE ac.user_id = p.id
          AND ac.status = 'verified'
          AND ba.building_id = ub.building_id
      )
    ) AS user_data,
    jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'main_image_url', NULL,
      'address', b.address,
      'architects', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object('name', a.name, 'id', a.id)), '[]'::jsonb)
          FROM building_architects ba
          JOIN architects a ON ba.architect_id = a.id
          WHERE ba.building_id = b.id
      ),
      'year_completed', b.year_completed,
      'city', b.city,
      'country', b.country,
      'slug', b.slug,
      'short_id', b.short_id
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
    ) AS review_images
  FROM
    user_buildings ub
  LEFT JOIN
    profiles p ON ub.user_id = p.id
  LEFT JOIN
    buildings b ON ub.building_id = b.id
  WHERE
    (ub.user_id IN (SELECT following_id FROM follows WHERE follower_id = v_user_id)
     OR ub.user_id = v_user_id)
    AND ub.status != 'ignored'
  ORDER BY
    COALESCE(ub.edited_at, ub.created_at) DESC
  LIMIT
    p_limit
  OFFSET
    p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION get_building_reviews(p_building_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  rating INTEGER,
  status TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  video_url TEXT,
  user_data JSONB,
  images JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ub.id,
    ub.user_id,
    ub.content,
    ub.rating,
    ub.status::TEXT,
    ub.tags,
    ub.created_at,
    ub.video_url,
    jsonb_build_object(
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified_architect', EXISTS (SELECT 1 FROM architect_claims ac WHERE ac.user_id = p.id AND ac.status = 'verified'),
      'is_architect_of_building', EXISTS (
        SELECT 1
        FROM architect_claims ac
        JOIN building_architects ba ON ac.architect_id = ba.architect_id
        WHERE ac.user_id = p.id
          AND ac.status = 'verified'
          AND ba.building_id = ub.building_id
      )
    ) AS user_data,
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ri.id,
                    'storage_path', ri.storage_path,
                    'likes_count', ri.likes_count,
                    'created_at', ri.created_at,
                    'is_generated', ri.is_generated,
                    'is_official', ri.is_official
                )
            )
            FROM review_images ri
            WHERE ri.review_id = ub.id
        ),
        '[]'::jsonb
    ) AS images
  FROM
    user_buildings ub
  LEFT JOIN
    profiles p ON ub.user_id = p.id
  WHERE
    ub.building_id = p_building_id
  ORDER BY
    ub.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
