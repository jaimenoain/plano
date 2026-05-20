-- Migration: fix ambassador_apply_building_research RPC field set
--
-- The original RPC (20271108000000) applied updates to buildings.materials,
-- buildings.typology, and buildings.context — columns that do not exist on the
-- buildings table. Those fields are stored in junction tables (building_attributes,
-- building_functional_typologies) and cannot be patched via a simple UPDATE.
--
-- This migration drops those three broken fields and adds the fields that are
-- present on the buildings table and visible in the Edit Building page:
--   access_cost, access_notes, alt_name, status, size_sqm, height_m, storeys
-- architect_statement was already handled but was missing from the AI prompt;
-- the prompt-side fix is in building-research.route.ts (no migration needed).
--
-- Feedback id: 9513bf1c-f7ba-4ea7-8785-7e0280fb4f58

CREATE OR REPLACE FUNCTION public.ambassador_apply_building_research(
  p_building_id uuid,
  p_updates      jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_chapter_id uuid;
  v_in_scope   boolean := false;
  v_old_data   jsonb;
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
    'year_completed',     year_completed,
    'status',             status,
    'alt_name',           alt_name,
    'access_level',       access_level,
    'access_logistics',   access_logistics,
    'access_cost',        access_cost,
    'access_notes',       access_notes,
    'size_sqm',           size_sqm,
    'height_m',           height_m,
    'storeys',            storeys,
    'architect_statement', architect_statement
  )
    INTO v_old_data
    FROM buildings
   WHERE id = p_building_id;

  -- Apply only the fields present in p_updates
  UPDATE buildings
     SET
       year_completed      = CASE WHEN p_updates ? 'year_completed'
                                  THEN (p_updates->>'year_completed')::integer
                                  ELSE year_completed END,
       status              = CASE WHEN p_updates ? 'status'
                                  THEN (p_updates->>'status')::building_status
                                  ELSE status END,
       alt_name            = CASE WHEN p_updates ? 'alt_name'
                                  THEN p_updates->>'alt_name'
                                  ELSE alt_name END,
       access_level        = CASE WHEN p_updates ? 'access_level'
                                  THEN (p_updates->>'access_level')::building_access_level
                                  ELSE access_level END,
       access_logistics    = CASE WHEN p_updates ? 'access_logistics'
                                  THEN (p_updates->>'access_logistics')::building_access_logistics
                                  ELSE access_logistics END,
       access_cost         = CASE WHEN p_updates ? 'access_cost'
                                  THEN (p_updates->>'access_cost')::building_access_cost
                                  ELSE access_cost END,
       access_notes        = CASE WHEN p_updates ? 'access_notes'
                                  THEN p_updates->>'access_notes'
                                  ELSE access_notes END,
       size_sqm            = CASE WHEN p_updates ? 'size_sqm'
                                  THEN (p_updates->>'size_sqm')::numeric
                                  ELSE size_sqm END,
       height_m            = CASE WHEN p_updates ? 'height_m'
                                  THEN (p_updates->>'height_m')::numeric
                                  ELSE height_m END,
       storeys             = CASE WHEN p_updates ? 'storeys'
                                  THEN (p_updates->>'storeys')::integer
                                  ELSE storeys END,
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

GRANT EXECUTE ON FUNCTION public.ambassador_apply_building_research(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.ambassador_apply_building_research IS
  'Applies AI-researched field updates to a building after verifying the caller
   is an active ambassador with chapter scope over the building.
   Fields: year_completed, status, alt_name, access_level, access_logistics,
   access_cost, access_notes, size_sqm, height_m, storeys, architect_statement.
   Called from the Ambassador Research Tool review flow.';
