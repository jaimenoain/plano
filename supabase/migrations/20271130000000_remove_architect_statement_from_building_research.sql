-- Migration: remove architect_statement from ambassador_apply_building_research
--
-- The `architect_statement` column on `buildings` is reserved for verified
-- architects of the building (see 20270616000000_architect_verification.sql).
-- Only architects who have signed up and been verified for a building may set
-- this field, via the BuildingForm flow gated by the architect guard trigger.
--
-- The original AI research RPC (20271108000000) and its first fix
-- (20271119000000) both accepted `architect_statement` in their JSONB
-- payload, allowing ambassador-driven AI research to overwrite an architect's
-- official statement. This migration recreates the RPC with `architect_statement`
-- removed from both the audit snapshot and the UPDATE clause. Any future
-- ai_research_apply payload that includes the key will simply be ignored.
--
-- All other field handling is identical to 20271119000000.
--
-- Feedback id: df6fd550-e9f7-48b4-a9a7-7b29c5ad43b5

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

  -- Snapshot current values for audit (architect_statement intentionally omitted)
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
    'storeys',            storeys
  )
    INTO v_old_data
    FROM buildings
   WHERE id = p_building_id;

  -- Apply only the fields present in p_updates. architect_statement is NOT
  -- accepted here — it remains the exclusive domain of verified architects.
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
                                  ELSE storeys END
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
   access_cost, access_notes, size_sqm, height_m, storeys.
   Excludes architect_statement (reserved for verified architects).
   Called from the Ambassador Research Tool review flow.';
