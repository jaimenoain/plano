-- Shared filter helpers for the /search surfaces so the SERP list, map pins, and
-- Find-mode search all resolve Folders/Collections and Curators & friends
-- identically. Mirrors the existing building_matches_credit_filters pattern
-- (SECURITY DEFINER, guarded no-op short-circuit handled by the calling RPCs).

-- Buildings that belong to any of the given collections, or to any collection
-- inside any of the given folders (folder -> collections -> buildings).
CREATE OR REPLACE FUNCTION public.get_buildings_in_collections(
  p_collection_ids uuid[] DEFAULT NULL,
  p_folder_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(building_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH resolved AS (
    SELECT unnest(COALESCE(p_collection_ids, ARRAY[]::uuid[])) AS collection_id
    UNION
    SELECT ufi.collection_id
    FROM public.user_folder_items ufi
    WHERE p_folder_ids IS NOT NULL
      AND cardinality(p_folder_ids) > 0
      AND ufi.folder_id = ANY(p_folder_ids)
  )
  SELECT DISTINCT ci.building_id
  FROM public.collection_items ci
  JOIN resolved r ON r.collection_id = ci.collection_id;
$function$;

-- True when a building has a qualifying interaction from a named curator
-- (rated_by usernames) OR — when p_filter_contacts is true — from anyone the
-- current user follows. "Qualifying" = visited/pending status or a rating, with
-- rating >= p_contact_min_rating when that threshold is set. Returns true when no
-- contact filter is active so callers can AND it unconditionally.
CREATE OR REPLACE FUNCTION public.building_matches_contact_filters(
  p_building_id uuid,
  p_rated_by text[] DEFAULT NULL,
  p_filter_contacts boolean DEFAULT false,
  p_contact_min_rating int DEFAULT 0
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT
    CASE
      WHEN (p_rated_by IS NULL OR cardinality(p_rated_by) = 0)
           AND COALESCE(p_filter_contacts, false) = false
      THEN true
      ELSE
        (
          p_rated_by IS NOT NULL AND cardinality(p_rated_by) > 0
          AND EXISTS (
            SELECT 1
            FROM public.user_buildings ub
            JOIN public.profiles pr ON pr.id = ub.user_id
            WHERE ub.building_id = p_building_id
              AND pr.username = ANY(p_rated_by)
              AND (ub.status IN ('visited','pending') OR ub.rating IS NOT NULL)
              AND (COALESCE(p_contact_min_rating, 0) = 0 OR ub.rating >= p_contact_min_rating)
          )
        )
        OR
        (
          COALESCE(p_filter_contacts, false) = true
          AND EXISTS (
            SELECT 1
            FROM public.user_buildings ub
            JOIN public.follows f ON f.following_id = ub.user_id
            WHERE ub.building_id = p_building_id
              AND f.follower_id = auth.uid()
              AND (ub.status IN ('visited','pending') OR ub.rating IS NOT NULL)
              AND (COALESCE(p_contact_min_rating, 0) = 0 OR ub.rating >= p_contact_min_rating)
          )
        )
    END;
$function$;
