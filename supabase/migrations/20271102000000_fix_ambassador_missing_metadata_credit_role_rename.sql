-- Fix Embassy "Data & Research" tool (Contribute page).
--
-- The RPC `get_ambassador_buildings_missing_metadata` (defined in
-- 20270870200000_ambassador_task_feed_rpcs.sql) compared
-- `building_credits.role` to the literal `'design_architect'`.
--
-- Migration 20271027000000 renamed the `credit_role_enum` value
-- `design_architect` → `design_architecture` (and the rest of the
-- person-based labels to discipline-based ones). After that rename
-- reached the live DB, the RPC throws `invalid input value for enum
-- credit_role_enum` and PostgREST surfaces it to the client, causing
-- the Embassy Contribute tool to render its "Failed to load research
-- tasks" error state.
--
-- Recreate the function with the discipline-based label. No other
-- behaviour or signature changes.

CREATE OR REPLACE FUNCTION public.get_ambassador_buildings_missing_metadata (p_chapter_id uuid, p_limit integer DEFAULT 20)
  RETURNS TABLE (
    id uuid,
    short_id integer,
    slug text,
    name text,
    city text,
    country text,
    popularity_score double precision,
    year_completed integer,
    has_styles boolean,
    has_architect_credit boolean)
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter (p_chapter_id) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
      SELECT
        1
      FROM
        public.ambassador_chapters c
      WHERE
        c.id = p_chapter_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    b.id,
    b.short_id::integer,
    COALESCE(b.slug, '')::text AS slug,
    b.name::text,
    b.city::text,
    b.country::text,
    b.popularity_score::double precision,
    b.year_completed,
    EXISTS (
      SELECT
        1
      FROM
        public.building_styles bs
      WHERE
        bs.building_id = b.id) AS has_styles,
    EXISTS (
      SELECT
        1
      FROM
        public.building_credits bc
      WHERE
        bc.building_id = b.id
        AND bc.status IN ('active', 'verified')
        AND bc.credit_tier = 'primary'
        AND bc.role = 'design_architecture') AS has_architect_credit
  FROM
    public.buildings b
  WHERE
    public._building_in_ambassador_chapter_scope (b.id, p_chapter_id)
    AND (
      b.year_completed IS NULL
      OR NOT EXISTS (
        SELECT
          1
        FROM
          public.building_styles bs2
        WHERE
          bs2.building_id = b.id)
      OR NOT EXISTS (
        SELECT
          1
        FROM
          public.building_credits bc2
        WHERE
          bc2.building_id = b.id
          AND bc2.status IN ('active', 'verified')
          AND bc2.credit_tier = 'primary'
          AND bc2.role = 'design_architecture'))
  ORDER BY
    b.popularity_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_buildings_missing_metadata (uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_ambassador_buildings_missing_metadata (uuid, integer) TO authenticated;
