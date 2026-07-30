-- Harden merge_buildings so a merge can never orphan a building or its content.
--
-- WHY
-- The previous body validated only `source <> target` and that both rows exist.
-- It never checked whether the TARGET was itself already deleted or already
-- merged, so merging the same pair a second time in the opposite direction
-- soft-deleted both rows and left no survivor — see
-- 20271190000000_repair_orphaned_merge_chains.sql for the Farnsworth incident.
-- It also re-pointed only four of the fourteen tables that reference
-- buildings.id, silently orphaning the rest.
--
-- WHAT CHANGES
--   1. State + cycle guards, taken under FOR UPDATE row locks so two admins
--      merging the same pair in opposite directions serialise instead of racing.
--      Under I1 (a live row never carries merged_into_id) the target guards make
--      a cycle structurally impossible; the recursive check is belt and braces
--      for an already-malformed graph.
--   2. Inbound merged_into_id is re-pointed at the target, so chains stay FLAT
--      (I2) instead of growing a hop per merge. The BuildingDetails loader
--      relies on one-hop resolution.
--   3. The ten forgotten tables are re-pointed, each with the conflict strategy
--      its own constraints dictate.
--
-- WHAT DOES NOT CHANGE
-- Signature, SECURITY DEFINER, search_path, the admin_audit_logs insert, and the
-- EXECUTE grants (merging stays open to all authenticated users — an explicit
-- owner decision, see docs/decisions/0022-building-merge-invariants.md). The
-- existing user_buildings / recommendations / building_credits blocks are kept
-- verbatim: they work, and rewriting them would add risk for no gain.
--
-- types-neutral: body-only CREATE OR REPLACE, signature and return type
-- unchanged, so gen-types is a no-op.

CREATE OR REPLACE FUNCTION public.merge_buildings(source_id uuid, target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  building_snapshot JSONB;
  conflict_record   RECORD;
  target_ub_id      UUID;
  admin_user_id     UUID;
  v_source          public.buildings;
  v_target          public.buildings;
  v_cycle           BOOLEAN;
  v_inbound         INTEGER;
BEGIN
  -- ==========================================================================
  -- VALIDATION + STATE GUARDS
  -- ==========================================================================

  IF source_id IS NULL OR target_id IS NULL THEN
    RAISE EXCEPTION 'merge_buildings: source_id and target_id are both required.';
  END IF;

  IF source_id = target_id THEN
    RAISE EXCEPTION 'Cannot merge a building into itself.';
  END IF;

  -- FOR UPDATE serialises concurrent merges of the same pair. Lock in a stable
  -- order so two callers with the arguments reversed cannot deadlock.
  IF source_id < target_id THEN
    SELECT * INTO v_source FROM public.buildings WHERE id = source_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source building not found.'; END IF;
    SELECT * INTO v_target FROM public.buildings WHERE id = target_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Target building not found.'; END IF;
  ELSE
    SELECT * INTO v_target FROM public.buildings WHERE id = target_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Target building not found.'; END IF;
    SELECT * INTO v_source FROM public.buildings WHERE id = source_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Source building not found.'; END IF;
  END IF;

  IF COALESCE(v_source.is_deleted, false) THEN
    RAISE EXCEPTION
      'Source building % has already been merged away — nothing to merge.',
      COALESCE(v_source.short_id::text, source_id::text);
  END IF;

  IF COALESCE(v_target.is_deleted, false) THEN
    RAISE EXCEPTION
      'Target building % is deleted and cannot be a merge survivor. Merge into its surviving record instead.',
      COALESCE(v_target.short_id::text, target_id::text);
  END IF;

  IF v_target.merged_into_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Target building % was already merged into building %. Merge into that record instead.',
      COALESCE(v_target.short_id::text, target_id::text),
      COALESCE((SELECT short_id::text FROM public.buildings WHERE id = v_target.merged_into_id),
               v_target.merged_into_id::text);
  END IF;

  -- Belt and braces: refuse if the target already sits in the source's merge
  -- chain. Path-guarded and depth-bounded, so a malformed graph cannot hang.
  WITH RECURSIVE chain AS (
    SELECT target_id AS id, ARRAY[target_id] AS path, 1 AS depth
    UNION ALL
    SELECT b.merged_into_id, c.path || b.merged_into_id, c.depth + 1
    FROM   chain c
    JOIN   public.buildings b ON b.id = c.id
    WHERE  b.merged_into_id IS NOT NULL
      AND  NOT (b.merged_into_id = ANY (c.path))
      AND  c.depth < 64
  )
  SELECT EXISTS (SELECT 1 FROM chain WHERE id = source_id) INTO v_cycle;

  IF v_cycle THEN
    RAISE EXCEPTION
      'Refusing merge: building % already sits in building %''s merge chain (circular merge).',
      COALESCE(v_target.short_id::text, target_id::text),
      COALESCE(v_source.short_id::text, source_id::text);
  END IF;

  SELECT row_to_json(b) INTO building_snapshot FROM buildings b WHERE id = source_id;
  admin_user_id := auth.uid();

  -- ==========================================================================
  -- MIGRATION: User Buildings (visit status + rating)
  -- content/tags/video_url were moved to building_posts in 20270872000000.
  -- ==========================================================================

  -- A. Conflicts: user has a user_buildings row for BOTH buildings.
  --    Keep the target row; rescue the source rating if target has none.
  FOR conflict_record IN
    SELECT ub.id, ub.user_id, ub.rating
    FROM user_buildings ub
    WHERE ub.building_id = source_id
      AND EXISTS (
        SELECT 1 FROM user_buildings ub2
        WHERE ub2.building_id = target_id AND ub2.user_id = ub.user_id
      )
  LOOP
    SELECT id INTO target_ub_id
    FROM user_buildings
    WHERE building_id = target_id AND user_id = conflict_record.user_id;

    UPDATE user_buildings
    SET rating = COALESCE(rating, conflict_record.rating)
    WHERE id = target_ub_id
      AND rating IS NULL;

    DELETE FROM user_buildings WHERE id = conflict_record.id;
  END LOOP;

  -- B. Non-conflicts: simply re-point to target building.
  UPDATE user_buildings
  SET building_id = target_id
  WHERE building_id = source_id;

  -- ==========================================================================
  -- MIGRATION: Building Posts (reviews/notes — now a separate table)
  -- Users can have multiple posts per building; all source posts move to target.
  -- review_images FK to building_posts(id), so photos ride along.
  -- ==========================================================================

  UPDATE building_posts
  SET building_id = target_id
  WHERE building_id = source_id;

  -- ==========================================================================
  -- MIGRATION: Recommendations
  -- ==========================================================================

  UPDATE recommendations
  SET building_id = target_id
  WHERE building_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM recommendations r2
      WHERE r2.building_id = target_id
        AND r2.recipient_id = recommendations.recipient_id
        AND r2.recommender_id = recommendations.recommender_id
    );
  DELETE FROM recommendations WHERE building_id = source_id;

  -- ==========================================================================
  -- MIGRATION: Building Credits
  -- Move credits for entities not already credited on target; drop duplicates.
  -- ==========================================================================

  UPDATE building_credits
  SET building_id = target_id
  WHERE building_id = source_id
    AND NOT EXISTS (
      SELECT 1 FROM building_credits bc2
      WHERE bc2.building_id = target_id
        AND (
          (building_credits.person_id IS NOT NULL AND bc2.person_id = building_credits.person_id)
          OR
          (building_credits.company_id IS NOT NULL AND bc2.company_id = building_credits.company_id)
        )
    );
  DELETE FROM building_credits WHERE building_id = source_id;

  -- ==========================================================================
  -- MIGRATION: taxonomy + catalogue tables the previous body silently orphaned
  -- Composite primary keys -> INSERT ... ON CONFLICT DO NOTHING, then sweep.
  -- ==========================================================================

  INSERT INTO building_attributes (building_id, attribute_id)
  SELECT target_id, a.attribute_id
  FROM   building_attributes a
  WHERE  a.building_id = source_id
  ON CONFLICT (building_id, attribute_id) DO NOTHING;
  DELETE FROM building_attributes WHERE building_id = source_id;

  INSERT INTO building_styles (building_id, style_id)
  SELECT target_id, s.style_id
  FROM   building_styles s
  WHERE  s.building_id = source_id
  ON CONFLICT (building_id, style_id) DO NOTHING;
  DELETE FROM building_styles WHERE building_id = source_id;

  INSERT INTO building_functional_typologies (building_id, typology_id)
  SELECT target_id, t.typology_id
  FROM   building_functional_typologies t
  WHERE  t.building_id = source_id
  ON CONFLICT (building_id, typology_id) DO NOTHING;
  DELETE FROM building_functional_typologies WHERE building_id = source_id;

  INSERT INTO event_buildings (event_id, building_id, sort_order)
  SELECT e.event_id, target_id, e.sort_order
  FROM   event_buildings e
  WHERE  e.building_id = source_id
  ON CONFLICT (event_id, building_id) DO NOTHING;
  DELETE FROM event_buildings WHERE building_id = source_id;

  -- collection_items has PK (id) only — there is NO unique (collection_id,
  -- building_id) index, so a blind re-point would show the same building twice
  -- in one collection. Promote at most ONE source row per collection (oldest
  -- first) where the target is not already present, then drop the rest.
  WITH promote AS (
    SELECT DISTINCT ON (ci.collection_id) ci.id
    FROM   collection_items ci
    WHERE  ci.building_id = source_id
      AND  NOT EXISTS (
             SELECT 1 FROM collection_items o
             WHERE  o.collection_id = ci.collection_id
               AND  o.building_id   = target_id
           )
    ORDER  BY ci.collection_id, ci.created_at ASC, ci.id
  )
  UPDATE collection_items ci
  SET    building_id = target_id
  FROM   promote p
  WHERE  ci.id = p.id;
  DELETE FROM collection_items WHERE building_id = source_id;

  -- UNIQUE (chapter_id, building_id): the source holds at most one row per
  -- chapter, so a guarded UPDATE plus a sweep is sufficient.
  UPDATE ambassador_building_research_queue q
  SET    building_id   = target_id,
         building_name = v_target.name
  WHERE  q.building_id = source_id
    AND  NOT EXISTS (
           SELECT 1 FROM ambassador_building_research_queue o
           WHERE  o.chapter_id = q.chapter_id AND o.building_id = target_id
         );
  DELETE FROM ambassador_building_research_queue WHERE building_id = source_id;

  -- PK (id) with no composite unique -> plain re-point.
  UPDATE award_recipients
  SET    recipient_building_id = target_id
  WHERE  recipient_building_id = source_id;

  UPDATE award_recipient_suggestions
  SET    recipient_building_id = target_id
  WHERE  recipient_building_id = source_id;

  -- Keep the merged row's edit history attached to the surviving building.
  UPDATE building_audit_logs
  SET    building_id = target_id
  WHERE  building_id = source_id;

  -- building_duplicate_dismissals has CHECK (building_id_1 < building_id_2), so
  -- a blind re-point can violate the ordering. The pair is moot once one side is
  -- merged away, so drop the hints.
  DELETE FROM building_duplicate_dismissals
  WHERE  building_id_1 = source_id OR building_id_2 = source_id;

  -- ==========================================================================
  -- KEEP CHAINS FLAT (I2): anything that pointed at the source now points at
  -- the target, so resolving a merge is always a single hop.
  -- ==========================================================================

  UPDATE buildings
  SET    merged_into_id = target_id
  WHERE  merged_into_id = source_id
    AND  id <> target_id;
  GET DIAGNOSTICS v_inbound = ROW_COUNT;

  -- ==========================================================================
  -- FINAL CLEANUP
  -- ==========================================================================

  UPDATE buildings
  SET is_deleted    = true,
      merged_into_id = target_id
  WHERE id = source_id;

  -- ==========================================================================
  -- AUDIT LOGGING
  -- ==========================================================================

  INSERT INTO admin_audit_logs (
    admin_id,
    action_type,
    target_type,
    target_id,
    details
  ) VALUES (
    admin_user_id,
    'MERGE_BUILDINGS',
    'building',
    target_id::text,
    json_build_object(
      'source_id',         source_id,
      'source_short_id',   v_source.short_id,
      'target_short_id',   v_target.short_id,
      'source_snapshot',   building_snapshot,
      'repointed_inbound', v_inbound,
      'timestamp',         now()
    )
  );
END;
$function$;

-- Grants are unchanged (CREATE OR REPLACE preserves them); re-asserted so the
-- intended access is explicit in the migration history.
GRANT EXECUTE ON FUNCTION public.merge_buildings(uuid, uuid) TO anon, authenticated, service_role;
