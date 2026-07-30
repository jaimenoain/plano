-- Verify the buildings merge-chain invariants. Read-only; safe against prod.
--
--   psql "$SUPABASE_DB_URL" -f scripts/verify_merge_chains.sql
--
-- I1  merged_into_id IS NOT NULL  =>  is_deleted = true
-- I2  merged_into_id resolves to a LIVE row in ONE hop (chains stay flat)
-- I3  every merge component has exactly one live survivor
--
-- Checks 1-4 must each return ZERO rows / zero counts. A non-zero result means a
-- merge has hidden a building from every search surface (search_buildings_v2 and
-- get_map_clusters_v3 both filter is_deleted) — see
-- docs/decisions/0022-building-merge-invariants.md.

\echo
\echo '== 1. circular pairs, orphaned merges, and I1 violations (all must be 0) =='
SELECT
  (SELECT count(*) FROM public.buildings a
     JOIN public.buildings b ON a.merged_into_id = b.id
    WHERE b.merged_into_id = a.id)                              AS circular_pairs,
  (SELECT count(*) FROM public.buildings a
     JOIN public.buildings b ON a.merged_into_id = b.id
    WHERE a.is_deleted AND b.is_deleted)                        AS orphaned_merges,
  (SELECT count(*) FROM public.buildings
    WHERE merged_into_id IS NOT NULL
      AND COALESCE(is_deleted, false) = false)                  AS i1_violations;

\echo
\echo '== 2. chains that cycle, run deeper than one hop, or end on a dead row =='
\echo '   (must return 0 rows)'
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
  WHERE  w.next_id IS NOT NULL AND NOT w.cycled AND w.depth < 64
),
terminal AS (
  SELECT DISTINCT ON (start_id) start_id, path, cycled
  FROM   walk ORDER BY start_id, depth DESC
)
SELECT (SELECT short_id FROM public.buildings WHERE id = t.start_id) AS start_short_id,
       t.cycled,
       array_length(t.path, 1) - 1 AS hops,
       (SELECT short_id FROM public.buildings
         WHERE id = t.path[array_length(t.path,1)])              AS terminus_short_id,
       (SELECT COALESCE(is_deleted, false) FROM public.buildings
         WHERE id = t.path[array_length(t.path,1)])              AS terminus_deleted
FROM   terminal t
WHERE  t.cycled                                     -- I3: no cycles
   OR  array_length(t.path, 1) > 2                  -- I2: one hop only
   OR  (SELECT COALESCE(is_deleted, false) FROM public.buildings
         WHERE id = t.path[array_length(t.path,1)]) -- I3: terminus must be live
ORDER  BY start_short_id;

\echo
\echo '== 3. live buildings that no text search could ever return (must be 0) =='
SELECT count(*) FILTER (WHERE search_vector IS NULL)              AS null_search_vector,
       count(*) FILTER (WHERE name IS NULL OR btrim(name) = '')   AS missing_name
FROM   public.buildings
WHERE  COALESCE(is_deleted, false) = false;

\echo
\echo '== 4. the Farnsworth pair — the 2026-02 incident (regression canary) =='
\echo '   expect 3745 live with a NULL pointer, 3342 deleted pointing at 3745'
SELECT short_id, name, is_deleted,
       (SELECT short_id FROM public.buildings s WHERE s.id = b.merged_into_id) AS points_at,
       locality_id IS NOT NULL AS has_locality,
       search_vector IS NOT NULL AS has_search_vector
FROM   public.buildings b
WHERE  short_id IN (3342, 3745)
ORDER  BY short_id;

\echo
\echo '== 5. name search reaches it as an anonymous visitor =='
BEGIN;
SET LOCAL ROLE anon;
SELECT short_id, name, round(rank_score::numeric, 4) AS rank
FROM   public.search_buildings_v2('Farnsworth House', 3, 0, '{}'::jsonb);
ROLLBACK;
