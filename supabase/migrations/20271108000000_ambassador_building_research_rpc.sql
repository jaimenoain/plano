-- Migration: ambassador_apply_building_research RPC
-- Allows an active ambassador to apply AI-researched field updates to a building
-- that is within their chapter's geographic scope. Uses SECURITY DEFINER so it
-- can bypass the creator-only buildings_update RLS while still enforcing
-- ambassador scope validation inside the function body.

CREATE OR REPLACE FUNCTION public.ambassador_apply_building_research(
  p_building_id uuid,
  p_updates      jsonb  -- e.g. { "year_completed": 2005, "materials": ["concrete","glass"] }
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_chapter_id     uuid;
  v_in_scope       boolean := false;
  v_old_data       jsonb;
BEGIN
  -- Verify caller is an active ambassador
  SELECT chapter_id
    INTO v_chapter_id
    FROM ambassador_memberships
   WHERE user_id = v_user_id
     AND status  = 'active'
   LIMIT 1;

  IF v_chapter_id IS NULL THEN
    RAISE EXCEPTION 'not_ambassador' USING HINT = 'User is not an active ambassador';
  END IF;

  -- Verify the building falls inside that chapter's geographic scope
  SELECT _building_in_ambassador_chapter_scope(p_building_id, v_chapter_id)
    INTO v_in_scope;

  IF NOT v_in_scope THEN
    RAISE EXCEPTION 'building_out_of_scope'
      USING HINT = 'Building is not in this ambassador chapter scope';
  END IF;

  -- Snapshot current values for audit
  SELECT jsonb_build_object(
    'year_completed',    year_completed,
    'materials',         materials,
    'typology',          typology,
    'access_level',      access_level,
    'access_logistics',  access_logistics,
    'context',           context,
    'architect_statement', architect_statement
  )
    INTO v_old_data
    FROM buildings
   WHERE id = p_building_id;

  -- Apply only the fields present in p_updates (null-safe coalesce keeps existing value
  -- when a key is absent from the jsonb payload).
  UPDATE buildings
     SET
       year_completed     = CASE WHEN p_updates ? 'year_completed'
                                 THEN (p_updates->>'year_completed')::integer
                                 ELSE year_completed END,
       materials          = CASE WHEN p_updates ? 'materials'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'materials'))
                                 ELSE materials END,
       typology           = CASE WHEN p_updates ? 'typology'
                                 THEN ARRAY(SELECT jsonb_array_elements_text(p_updates->'typology'))
                                 ELSE typology END,
       access_level       = CASE WHEN p_updates ? 'access_level'
                                 THEN p_updates->>'access_level'
                                 ELSE access_level END,
       access_logistics   = CASE WHEN p_updates ? 'access_logistics'
                                 THEN p_updates->>'access_logistics'
                                 ELSE access_logistics END,
       context            = CASE WHEN p_updates ? 'context'
                                 THEN p_updates->>'context'
                                 ELSE context END,
       architect_statement = CASE WHEN p_updates ? 'architect_statement'
                                  THEN p_updates->>'architect_statement'
                                  ELSE architect_statement END
   WHERE id = p_building_id;

  -- Audit log
  INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, old_data, new_data)
  VALUES (
    p_building_id,
    v_user_id,
    'buildings',
    'ai_research_apply',
    v_old_data,
    p_updates
  );
END;
$$;

-- Grant execute to authenticated users (RLS is enforced inside the function body)
GRANT EXECUTE ON FUNCTION public.ambassador_apply_building_research(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.ambassador_apply_building_research IS
  'Applies AI-researched field updates to a building after verifying the caller
   is an active ambassador with chapter scope over the building.
   Called from the Ambassador Research Tool review flow.';
