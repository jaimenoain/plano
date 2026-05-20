-- Migration: extend ambassador_apply_building_research to support taxonomy fields
--
-- Supersedes 20271133000000_fix_building_research_rpc_final.sql.
-- Adds support for five new fields that the AI research prompt now returns:
--   category    → text name → resolved to functional_category_id on buildings
--   typologies  → text[]   → resolved to IDs in functional_typologies, inserted
--                             additively into building_functional_typologies
--   style       → text[]   → resolved to attribute IDs (group slug = 'style'),
--                             inserted additively into building_attributes
--   materiality → text[]   → resolved to attribute IDs (group slug = 'materiality'),
--                             inserted additively into building_attributes
--   context     → text[]   → resolved to attribute IDs (group slug = 'context'),
--                             inserted additively into building_attributes
--
-- Resolution is case-insensitive (ILIKE).  Unmatched names are silently skipped
-- rather than raising errors — the taxonomy may not contain every name the AI
-- suggests, and that should not block saving the fields that did match.
--
-- Junction-table inserts are additive: existing tags on the building are NOT
-- removed, so AI suggestions layer on top of already-curated data.
--
-- Feedback id: aa8e2827-42df-406e-b7d6-537454948a41

DROP FUNCTION IF EXISTS public.ambassador_apply_building_research(uuid, jsonb);

CREATE FUNCTION public.ambassador_apply_building_research(
  p_building_id uuid,
  p_updates      jsonb
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
  v_category_id    uuid;
  v_typology_name  text;
  v_typology_id    uuid;
  v_attr_name      text;
  v_attr_id        uuid;
  v_style_group_id uuid;
  v_mat_group_id   uuid;
  v_ctx_group_id   uuid;
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
    'year_completed',        year_completed,
    'status',                status,
    'alt_name',              alt_name,
    'functional_category_id',functional_category_id,
    'access_level',          access_level,
    'access_logistics',      access_logistics,
    'access_cost',           access_cost,
    'access_notes',          access_notes,
    'size_sqm',              size_sqm,
    'height_m',              height_m,
    'storeys',               storeys
  )
    INTO v_old_data
    FROM buildings
   WHERE id = p_building_id;

  -- ----------------------------------------------------------------
  -- 1. Direct columns on buildings
  -- ----------------------------------------------------------------
  UPDATE buildings
     SET
       year_completed   = CASE WHEN p_updates ? 'year_completed'
                               THEN (p_updates->>'year_completed')::integer
                               ELSE year_completed END,
       status           = CASE WHEN p_updates ? 'status'
                               THEN (p_updates->>'status')::building_status
                               ELSE status END,
       alt_name         = CASE WHEN p_updates ? 'alt_name'
                               THEN p_updates->>'alt_name'
                               ELSE alt_name END,
       access_level     = CASE WHEN p_updates ? 'access_level'
                               THEN (p_updates->>'access_level')::building_access_level
                               ELSE access_level END,
       access_logistics = CASE WHEN p_updates ? 'access_logistics'
                               THEN (p_updates->>'access_logistics')::building_access_logistics
                               ELSE access_logistics END,
       access_cost      = CASE WHEN p_updates ? 'access_cost'
                               THEN (p_updates->>'access_cost')::building_access_cost
                               ELSE access_cost END,
       access_notes     = CASE WHEN p_updates ? 'access_notes'
                               THEN p_updates->>'access_notes'
                               ELSE access_notes END,
       size_sqm         = CASE WHEN p_updates ? 'size_sqm'
                               THEN (p_updates->>'size_sqm')::numeric
                               ELSE size_sqm END,
       height_m         = CASE WHEN p_updates ? 'height_m'
                               THEN (p_updates->>'height_m')::numeric
                               ELSE height_m END,
       storeys          = CASE WHEN p_updates ? 'storeys'
                               THEN (p_updates->>'storeys')::integer
                               ELSE storeys END
   WHERE id = p_building_id;

  -- ----------------------------------------------------------------
  -- 2. Functional category (direct FK on buildings)
  -- ----------------------------------------------------------------
  IF p_updates ? 'category' THEN
    SELECT id INTO v_category_id
      FROM functional_categories
     WHERE name ILIKE p_updates->>'category'
     LIMIT 1;

    IF v_category_id IS NOT NULL THEN
      UPDATE buildings
         SET functional_category_id = v_category_id
       WHERE id = p_building_id;
    END IF;
  END IF;

  -- ----------------------------------------------------------------
  -- 3. Typologies → building_functional_typologies (additive)
  -- ----------------------------------------------------------------
  IF p_updates ? 'typologies' THEN
    FOR v_typology_name IN
      SELECT jsonb_array_elements_text(p_updates->'typologies')
    LOOP
      SELECT ft.id INTO v_typology_id
        FROM functional_typologies ft
       WHERE ft.name ILIKE v_typology_name
       LIMIT 1;

      IF v_typology_id IS NOT NULL THEN
        INSERT INTO building_functional_typologies (building_id, typology_id)
        VALUES (p_building_id, v_typology_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------
  -- 4. Style / Materiality / Context attributes → building_attributes
  --    Resolve attribute_group IDs once, then loop per attribute name
  -- ----------------------------------------------------------------
  SELECT id INTO v_style_group_id FROM attribute_groups WHERE slug = 'style'       LIMIT 1;
  SELECT id INTO v_mat_group_id   FROM attribute_groups WHERE slug = 'materiality'  LIMIT 1;
  SELECT id INTO v_ctx_group_id   FROM attribute_groups WHERE slug = 'context'      LIMIT 1;

  IF p_updates ? 'style' AND v_style_group_id IS NOT NULL THEN
    FOR v_attr_name IN
      SELECT jsonb_array_elements_text(p_updates->'style')
    LOOP
      SELECT id INTO v_attr_id
        FROM attributes
       WHERE group_id = v_style_group_id
         AND name ILIKE v_attr_name
       LIMIT 1;

      IF v_attr_id IS NOT NULL THEN
        INSERT INTO building_attributes (building_id, attribute_id)
        VALUES (p_building_id, v_attr_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  IF p_updates ? 'materiality' AND v_mat_group_id IS NOT NULL THEN
    FOR v_attr_name IN
      SELECT jsonb_array_elements_text(p_updates->'materiality')
    LOOP
      SELECT id INTO v_attr_id
        FROM attributes
       WHERE group_id = v_mat_group_id
         AND name ILIKE v_attr_name
       LIMIT 1;

      IF v_attr_id IS NOT NULL THEN
        INSERT INTO building_attributes (building_id, attribute_id)
        VALUES (p_building_id, v_attr_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  IF p_updates ? 'context' AND v_ctx_group_id IS NOT NULL THEN
    FOR v_attr_name IN
      SELECT jsonb_array_elements_text(p_updates->'context')
    LOOP
      SELECT id INTO v_attr_id
        FROM attributes
       WHERE group_id = v_ctx_group_id
         AND name ILIKE v_attr_name
       LIMIT 1;

      IF v_attr_id IS NOT NULL THEN
        INSERT INTO building_attributes (building_id, attribute_id)
        VALUES (p_building_id, v_attr_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  -- ----------------------------------------------------------------
  -- 5. Audit log
  -- ----------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.ambassador_apply_building_research(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ambassador_apply_building_research(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.ambassador_apply_building_research IS
  'Applies AI-researched field updates to a building after verifying the caller
   is an active ambassador with chapter scope over the building.
   Direct fields: year_completed, status, alt_name, access_level, access_logistics,
   access_cost, access_notes, size_sqm, height_m, storeys.
   Taxonomy fields (resolved by name, additive): category → functional_category_id,
   typologies → building_functional_typologies, style/materiality/context → building_attributes.
   Excludes architect_statement (reserved for verified architects).
   Supersedes 20271133000000_fix_building_research_rpc_final.sql.';
