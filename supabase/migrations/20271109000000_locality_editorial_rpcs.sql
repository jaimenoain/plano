-- =============================================================
-- Locality editorial RPCs
-- Feedback: d9d2051a-4995-46c8-b240-86763be476c2
-- Wires up the three missing data sections on locality pages:
-- volunteer team, top contributors, and curated collections.
-- All three are public (anon + authenticated).
-- =============================================================

-- -----------------------------------------------------------
-- 1. get_locality_volunteer_team(p_locality_id uuid)
-- Returns the active volunteer team for the local chapter
-- assigned to this locality. President → ExCo → Ambassadors.
-- Public-safe: only username, avatar_url, role, exco_responsibility.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_locality_volunteer_team(p_locality_id uuid)
RETURNS TABLE (
  user_id             uuid,
  username            text,
  avatar_url          text,
  role                text,
  exco_responsibility text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  SELECT id INTO v_chapter_id
  FROM ambassador_chapters
  WHERE locality_id = p_locality_id
    AND type = 'local'
    AND status = 'active'
  LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    am.user_id,
    p.username,
    p.avatar_url,
    am.role,
    am.exco_responsibility
  FROM ambassador_memberships am
  JOIN profiles p ON p.id = am.user_id
  WHERE am.chapter_id = v_chapter_id
    AND am.status = 'active'
  ORDER BY
    CASE am.role
      WHEN 'president' THEN 1
      WHEN 'exco'      THEN 2
      ELSE                  3
    END,
    p.username;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locality_volunteer_team(uuid) TO anon, authenticated;

-- -----------------------------------------------------------
-- 2. get_locality_top_contributors(p_locality_id uuid, p_limit int)
-- Ranks users by weighted contribution to a locality:
--   buildings added (×3 weight) + photos uploaded + logged visits.
-- Flags ambassadors in the local chapter.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_locality_top_contributors(
  p_locality_id uuid,
  p_limit       int DEFAULT 8
)
RETURNS TABLE (
  user_id          uuid,
  username         text,
  avatar_url       text,
  buildings_logged bigint,
  photos_uploaded  bigint,
  reviews_written  bigint,
  is_ambassador    boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH locality_building_ids AS (
    SELECT id, created_by
    FROM buildings
    WHERE locality_id = p_locality_id
      AND is_deleted = false
  ),
  buildings_by_user AS (
    SELECT created_by AS user_id, COUNT(*) AS cnt
    FROM locality_building_ids
    WHERE created_by IS NOT NULL
    GROUP BY created_by
  ),
  photos_by_user AS (
    SELECT ri.user_id, COUNT(*) AS cnt
    FROM review_images ri
    JOIN user_buildings ub ON ub.id = ri.review_id
    WHERE ub.building_id IN (SELECT id FROM locality_building_ids)
    GROUP BY ri.user_id
  ),
  reviews_by_user AS (
    SELECT ub.user_id, COUNT(*) AS cnt
    FROM user_buildings ub
    WHERE ub.building_id IN (SELECT id FROM locality_building_ids)
    GROUP BY ub.user_id
  ),
  chapter_ambassadors AS (
    SELECT am.user_id
    FROM ambassador_memberships am
    JOIN ambassador_chapters ac ON ac.id = am.chapter_id
    WHERE ac.locality_id = p_locality_id
      AND am.status = 'active'
  ),
  combined AS (
    SELECT
      COALESCE(b.user_id, ph.user_id, r.user_id)  AS user_id,
      COALESCE(b.cnt,  0)                          AS buildings_logged,
      COALESCE(ph.cnt, 0)                          AS photos_uploaded,
      COALESCE(r.cnt,  0)                          AS reviews_written
    FROM buildings_by_user b
    FULL OUTER JOIN photos_by_user  ph ON ph.user_id = b.user_id
    FULL OUTER JOIN reviews_by_user r  ON r.user_id  = COALESCE(b.user_id, ph.user_id)
  )
  SELECT
    c.user_id,
    p.username,
    p.avatar_url,
    c.buildings_logged,
    c.photos_uploaded,
    c.reviews_written,
    (ca.user_id IS NOT NULL) AS is_ambassador
  FROM combined c
  JOIN profiles p ON p.id = c.user_id
  LEFT JOIN chapter_ambassadors ca ON ca.user_id = c.user_id
  ORDER BY (c.buildings_logged * 3 + c.photos_uploaded + c.reviews_written) DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locality_top_contributors(uuid, int) TO anon, authenticated;

-- -----------------------------------------------------------
-- 3. get_locality_collections(p_locality_id uuid, p_limit int)
-- Public collections that contain >= 2 buildings in this locality,
-- ordered by matching building count descending.
-- Returns up to 3 preview image paths per collection.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_locality_collections(
  p_locality_id uuid,
  p_limit       int DEFAULT 6
)
RETURNS TABLE (
  id                 uuid,
  slug               text,
  name               text,
  owner_username     text,
  owner_avatar_url   text,
  building_count     bigint,
  preview_image_urls text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH locality_collection_counts AS (
    SELECT
      ci.collection_id,
      COUNT(*) AS matched_count
    FROM collection_items ci
    JOIN buildings b ON b.id = ci.building_id
    WHERE b.locality_id = p_locality_id
      AND b.is_deleted = false
    GROUP BY ci.collection_id
    HAVING COUNT(*) >= 2
  ),
  ranked AS (
    SELECT
      c.id,
      c.slug,
      c.name,
      p.username    AS owner_username,
      p.avatar_url  AS owner_avatar_url,
      lcc.matched_count AS building_count
    FROM locality_collection_counts lcc
    JOIN collections c ON c.id = lcc.collection_id AND c.is_public = true
    JOIN profiles    p ON p.id = c.owner_id
    ORDER BY lcc.matched_count DESC
    LIMIT p_limit
  ),
  preview_images AS (
    SELECT
      ci.collection_id,
      ARRAY_AGG(
        COALESCE(b.hero_image_url, b.community_preview_url)
        ORDER BY ci.order_index
      ) FILTER (WHERE COALESCE(b.hero_image_url, b.community_preview_url) IS NOT NULL)
      AS urls
    FROM collection_items ci
    JOIN buildings b ON b.id = ci.building_id
    WHERE ci.collection_id IN (SELECT id FROM ranked)
      AND b.locality_id = p_locality_id
      AND b.is_deleted = false
    GROUP BY ci.collection_id
  )
  SELECT
    r.id,
    r.slug,
    r.name,
    r.owner_username,
    r.owner_avatar_url,
    r.building_count,
    COALESCE((pi.urls)[1:3], ARRAY[]::text[]) AS preview_image_urls
  FROM ranked r
  LEFT JOIN preview_images pi ON pi.collection_id = r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_locality_collections(uuid, int) TO anon, authenticated;
