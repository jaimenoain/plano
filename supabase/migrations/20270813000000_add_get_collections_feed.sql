-- Collections home feed: public collections owned by users the caller follows.
-- Apply via Supabase SQL Editor (do not supabase db push per project policy).

CREATE OR REPLACE FUNCTION public.get_collections_feed(p_limit integer, p_offset integer)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  description text,
  updated_at timestamptz,
  owner_id uuid,
  primary_tag text,
  owner jsonb,
  preview_buildings jsonb,
  building_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.description,
    c.updated_at,
    c.owner_id,
    (
      SELECT a.name
      FROM collection_items ci_pt
      JOIN buildings b_pt ON b_pt.id = ci_pt.building_id
      JOIN building_attributes batt ON batt.building_id = b_pt.id
      JOIN attributes a ON a.id = batt.attribute_id
      JOIN attribute_groups ag ON ag.id = a.group_id AND ag.slug = 'style'
      WHERE ci_pt.collection_id = c.id
        AND ci_pt.is_hidden = false
        AND (b_pt.is_deleted IS FALSE OR b_pt.is_deleted IS NULL)
      ORDER BY ci_pt.order_index
      LIMIT 1
    ) AS primary_tag,
    jsonb_build_object(
      'username', p.username,
      'avatar_url', p.avatar_url
    ) AS owner,
    COALESCE(
      (
        SELECT jsonb_agg(x.obj ORDER BY x.order_index)
        FROM (
          SELECT
            jsonb_build_object(
              'building_id', b3.id,
              'name', b3.name,
              'main_image_url', b3.main_image_url
            ) AS obj,
            ci3.order_index
          FROM collection_items ci3
          JOIN buildings b3 ON b3.id = ci3.building_id
          WHERE ci3.collection_id = c.id
            AND ci3.is_hidden = false
            AND (b3.is_deleted IS FALSE OR b3.is_deleted IS NULL)
          ORDER BY ci3.order_index
          LIMIT 4
        ) x
      ),
      '[]'::jsonb
    ) AS preview_buildings,
    (
      SELECT COUNT(*)::bigint
      FROM collection_items ci5
      WHERE ci5.collection_id = c.id
        AND ci5.is_hidden = false
    ) AS building_count
  FROM collections c
  LEFT JOIN profiles p ON p.id = c.owner_id
  WHERE c.is_public = true
    AND c.owner_id IN (
      SELECT following_id FROM follows WHERE follower_id = v_uid
    )
  ORDER BY c.updated_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_collections_feed(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_collections_feed(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_collections_feed(integer, integer) TO authenticated;
