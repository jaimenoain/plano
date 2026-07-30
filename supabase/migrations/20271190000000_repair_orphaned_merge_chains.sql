-- Repair orphaned / circular buildings.merged_into_id chains.
--
-- INCIDENT
-- "Farnsworth House" (short_id 3745) returned zero results on /search. Not a
-- search bug: MERGE_BUILDINGS ran twice in opposite directions on the same pair
-- (2026-02-03 source 3745 -> target 3342, then 2026-02-19 source 3342 -> target
-- 3745, per admin_audit_logs), producing a 2-cycle in which BOTH rows carry
-- is_deleted = true. search_buildings_v2 and get_map_clusters_v3 both filter
-- is_deleted, so the building vanished from every surface at once while all of
-- its content (2 user_buildings, 2 building_posts, 1 building_credit, 1
-- building_style, 5 building_attributes) still hung off 3745.
--
-- INVARIANTS this migration restores (enforced going forward by
-- 20271191000000_harden_merge_buildings.sql):
--   I1  merged_into_id IS NOT NULL  =>  is_deleted = true
--   I2  merged_into_id always resolves to a LIVE row in ONE hop (flat chains)
--   I3  every merge component has exactly one live survivor, and that survivor
--       owns all dependent content
--
-- CYCLE SAFETY
-- The recursive CTE carries the visited path in a uuid[] and stops expanding the
-- moment the next hop is already in that path (flagging `cycled`), with a
-- belt-and-braces 64-hop bound. Infinite recursion is impossible.
--
-- IDEMPOTENT
-- After phases 1-2 there are no survivor-less components and no multi-hop
-- chains, so a re-run matches zero rows and fires no triggers.
--
-- AUDITING
-- Do NOT write to admin_audit_logs here: admin_id is NOT NULL REFERENCES
-- auth.users(id) and auth.uid() is NULL when a migration is applied. The
-- existing audit_buildings_update trigger records every row this touches in
-- building_audit_logs (whose user_id is nullable), so the repair is audited for
-- free.
--
-- types-neutral: data-only, no schema or signature changes; gen-types is a no-op.

-- ---------------------------------------------------------------------------
-- Phase 1 — resurrect one survivor per component that has NO live member
-- ---------------------------------------------------------------------------
WITH RECURSIVE walk AS (
  SELECT b.id             AS start_id,
         b.merged_into_id AS next_id,
         ARRAY[b.id]      AS path,
         1                AS depth,
         false            AS cycled
  FROM   public.buildings b
  WHERE  b.merged_into_id IS NOT NULL
    AND  COALESCE(b.is_deleted, false) = true

  UNION ALL

  SELECT w.start_id,
         n.merged_into_id,
         w.path || n.id,
         w.depth + 1,
         n.id = ANY (w.path)          -- cycle guard: flag, then stop expanding
  FROM   walk w
  JOIN   public.buildings n ON n.id = w.next_id
  WHERE  w.next_id IS NOT NULL
    AND  NOT w.cycled
    AND  w.depth < 64
),
terminal AS (
  SELECT DISTINCT ON (start_id) start_id, path, cycled
  FROM   walk
  ORDER  BY start_id, depth DESC      -- deepest row per start = the terminus
),
-- A node sits ON a cycle when walking from it returns to itself. Nodes that
-- merely FEED a cycle from outside have terminus <> start_id and are excluded,
-- so they can never be chosen as the survivor (Phase 2 re-points them).
cycle_group AS (
  -- There is no min(uuid) in Postgres; ORDER BY + LIMIT 1 gives the same
  -- canonical key, so both directions of a cycle collapse to one group.
  SELECT (SELECT m FROM unnest(t.path[1:array_length(t.path,1)-1]) m ORDER BY m LIMIT 1) AS group_key,
         t.path[1:array_length(t.path,1)-1]                                              AS members
  FROM   terminal t
  WHERE  t.cycled
    AND  t.path[array_length(t.path,1)] = t.start_id
),
-- Dead end: the chain terminates on a soft-deleted row that was never merged
-- anywhere (merged_into_id IS NULL) — i.e. the survivor was deleted after the
-- merge. Grouped by terminus so several chains feeding one dead end collapse
-- into a single component.
dead_end AS (
  SELECT t.path[array_length(t.path,1)] AS group_key,
         array_agg(DISTINCT m)          AS members
  FROM   terminal t
  JOIN   public.buildings e ON e.id = t.path[array_length(t.path,1)]
  CROSS  JOIN LATERAL unnest(t.path) AS m
  WHERE  NOT t.cycled
    AND  e.merged_into_id IS NULL
    AND  COALESCE(e.is_deleted, false) = true
  GROUP  BY 1
),
groups AS (
  SELECT group_key, members FROM cycle_group
  UNION ALL
  SELECT group_key, members FROM dead_end
),
broken AS (                            -- only components with zero live members
  SELECT DISTINCT ON (group_key) group_key, members
  FROM   groups g
  WHERE  NOT EXISTS (
           SELECT 1 FROM public.buildings b
           WHERE  b.id = ANY (g.members)
             AND  COALESCE(b.is_deleted, false) = false
         )
  ORDER  BY group_key, array_length(members, 1) DESC
),
candidates AS (
  SELECT br.group_key,
         bb.id,
         ( (SELECT count(*) FROM public.user_buildings                x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.building_posts                x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.building_credits              x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.building_styles               x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.building_attributes           x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.building_functional_typologies x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.collection_items              x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.event_buildings               x WHERE x.building_id = bb.id)
         + (SELECT count(*) FROM public.award_recipients              x WHERE x.recipient_building_id = bb.id)
         ) AS content_count,
         bb.popularity_score,
         bb.is_verified,
         bb.created_at,
         bb.short_id
  FROM   broken br
  CROSS  JOIN LATERAL unnest(br.members) AS m(id)
  JOIN   public.buildings bb ON bb.id = m.id
),
-- Content first: content is the only thing a merge can destroy. Popularity and
-- verification are recoverable; a re-pointed review is not.
winner AS (
  SELECT DISTINCT ON (group_key) group_key, id
  FROM   candidates
  ORDER  BY group_key,
            content_count    DESC,             -- 1. the row the data hangs off
            popularity_score DESC NULLS LAST,  -- 2. the row users actually reach
            is_verified      DESC NULLS LAST,  -- 3. curated beats scraped
            created_at       ASC  NULLS LAST,  -- 4. the original record
            short_id         ASC               -- 5. fully deterministic
)
UPDATE public.buildings b
SET    is_deleted     = false,
       merged_into_id = NULL              -- I1: a live row carries no pointer
FROM   winner w
WHERE  b.id = w.id;

-- ---------------------------------------------------------------------------
-- Phase 2 — flatten every remaining chain onto its final LIVE survivor
-- (the backfill for the missing inbound re-point in merge_buildings)
-- ---------------------------------------------------------------------------
WITH RECURSIVE walk AS (
  SELECT b.id AS start_id, b.merged_into_id AS next_id, ARRAY[b.id] AS path,
         1 AS depth, false AS cycled
  FROM   public.buildings b
  WHERE  b.merged_into_id IS NOT NULL
    AND  COALESCE(b.is_deleted, false) = true

  UNION ALL

  SELECT w.start_id, n.merged_into_id, w.path || n.id, w.depth + 1,
         n.id = ANY (w.path)
  FROM   walk w
  JOIN   public.buildings n ON n.id = w.next_id
  WHERE  w.next_id IS NOT NULL
    AND  NOT w.cycled
    AND  w.depth < 64
),
terminal AS (
  SELECT DISTINCT ON (start_id) start_id, path, cycled
  FROM   walk
  ORDER  BY start_id, depth DESC
),
final AS (
  SELECT t.start_id,
         t.path[array_length(t.path,1)] AS survivor_id
  FROM   terminal t
  JOIN   public.buildings s ON s.id = t.path[array_length(t.path,1)]
  WHERE  NOT t.cycled
    AND  COALESCE(s.is_deleted, false) = false          -- never point at a corpse
    AND  t.start_id <> t.path[array_length(t.path,1)]
)
UPDATE public.buildings b
SET    merged_into_id = f.survivor_id
FROM   final f
WHERE  b.id = f.start_id
  AND  b.merged_into_id IS DISTINCT FROM f.survivor_id;  -- idempotency guard

-- ---------------------------------------------------------------------------
-- Phase 3 — defensive tsvector re-index
-- buildings_search_vector_update is BEFORE UPDATE **OF** name, ... — a
-- column-list trigger fires on the column's presence in SET, not on a value
-- change, so `SET name = name` re-derives search_vector. A no-op today (0 live
-- rows have a NULL vector); kept so a resurrected row can never be unsearchable.
-- ---------------------------------------------------------------------------
UPDATE public.buildings b
SET    name = b.name
WHERE  COALESCE(b.is_deleted, false) = false
  AND  b.search_vector IS NULL;
