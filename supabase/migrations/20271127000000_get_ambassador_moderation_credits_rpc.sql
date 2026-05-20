-- Adds get_ambassador_moderation_credits(p_chapter_id, p_limit) RPC.
-- Root cause of "20 approvals failed": fetchModerationCredits() fetched ALL
-- unmoderated credits globally. ambassador_approve_credit() validates chapter
-- scope server-side, so every credit outside the ambassador's chapter raised
-- out_of_scope → every approval in a bulk "Approve all" failed.
-- Fix: scope the fetch to the ambassador's chapter, matching the pattern used
-- by get_ambassador_recent_buildings.
-- Feedback id: bcaa8607-5de5-4d4b-8e74-80a542610dd2

CREATE OR REPLACE FUNCTION public.get_ambassador_moderation_credits(
  p_chapter_id uuid,
  p_limit      integer DEFAULT 20
)
  RETURNS TABLE (
    id               uuid,
    created_at       timestamptz,
    role             text,
    building_id      uuid,
    building_name    text,
    building_slug    text,
    building_short_id integer,
    entity_name      text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
BEGIN
  IF NOT public._ambassador_can_access_chapter(p_chapter_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    bc.id,
    bc.created_at,
    bc.role::text,
    b.id                                AS building_id,
    b.name::text                        AS building_name,
    COALESCE(b.slug, '')::text          AS building_slug,
    b.short_id::integer                 AS building_short_id,
    COALESCE(pe.name, co.name)::text    AS entity_name
  FROM
    public.building_credits bc
    JOIN  public.buildings b   ON b.id = bc.building_id
    LEFT JOIN public.people     pe ON pe.id = bc.person_id
    LEFT JOIN public.companies  co ON co.id = bc.company_id
  WHERE
    public._building_in_ambassador_chapter_scope(b.id, p_chapter_id)
    AND bc.moderated_at IS NULL
    AND COALESCE(b.is_deleted, FALSE) = FALSE
  ORDER BY
    bc.created_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ambassador_moderation_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ambassador_moderation_credits(uuid, integer) TO authenticated;
