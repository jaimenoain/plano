-- Optimize get_feed RPC by using CTEs and improving join logic
-- This replaces the previous implementation to address performance issues with large datasets
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
  review_images JSONB
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  RETURN QUERY
  WITH relevant_users AS (
    -- Get IDs of users the current user follows
    SELECT following_id AS user_id FROM follows WHERE follower_id = v_user_id
    UNION ALL
    -- Include the current user's ID
    SELECT v_user_id AS user_id
  ),
  feed_items AS (
      -- Filter user_buildings by relevant users and status first
      SELECT
        ub.id,
        ub.content,
        ub.rating,
        ub.tags,
        ub.created_at,
        ub.edited_at,
        ub.status,
        ub.user_id,
        ub.group_id,
        ub.building_id
      FROM
        user_buildings ub
      JOIN
        relevant_users ru ON ub.user_id = ru.user_id
      WHERE
        ub.status != 'ignored'
      ORDER BY
        COALESCE(ub.edited_at, ub.created_at) DESC
      LIMIT
        p_limit
      OFFSET
        p_offset
  )
  SELECT
    fi.id,
    fi.content,
    fi.rating,
    fi.tags,
    fi.created_at,
    fi.edited_at,
    fi.status::TEXT,
    fi.user_id,
    fi.group_id,
    fi.building_id,
    -- User Data
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url
    ) AS user_data,
    -- Building Data
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
    -- Counts and Flags (computed only for the paged items)
    (SELECT COUNT(*) FROM likes l WHERE l.interaction_id = fi.id) AS likes_count,
    (SELECT COUNT(*) FROM comments c WHERE c.interaction_id = fi.id) AS comments_count,
    EXISTS (SELECT 1 FROM likes l WHERE l.interaction_id = fi.id AND l.user_id = v_user_id) AS is_liked,
    -- Review Images
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
            WHERE ri.review_id = fi.id
        ),
        '[]'::jsonb
    ) AS review_images
  FROM
    feed_items fi
  LEFT JOIN
    profiles p ON fi.user_id = p.id
  LEFT JOIN
    buildings b ON fi.building_id = b.id
  ORDER BY
    COALESCE(fi.edited_at, fi.created_at) DESC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
