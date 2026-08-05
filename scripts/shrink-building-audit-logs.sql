-- Backfill: rewrite historical building_audit_logs payloads as deltas.
--
--   psql "$SUPABASE_DB_URL" -f scripts/shrink-building-audit-logs.sql
--
-- Run AFTER migration 20271197000000 is applied (it defines the two helper
-- functions this script depends on) and AFTER taking a backup — this rewrites
-- history in place and is not reversible without one.
--
-- This is deliberately NOT a migration. `VACUUM FULL` cannot run inside a
-- transaction block, and Supabase wraps every migration in one. Splitting the
-- work into committed batches also keeps the rewrite from doubling the table's
-- disk footprint in a single transaction — which matters, because the reason
-- this script exists is that the project is already over its storage quota.
--
-- Safe to interrupt and re-run: the batch predicate is self-clearing, so a row
-- that has already been reduced is never revisited.

\timing on
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Before
-- ---------------------------------------------------------------------------
SELECT
  pg_size_pretty(pg_total_relation_size('public.building_audit_logs')) AS audit_total,
  pg_size_pretty(pg_database_size(current_database()))                 AS database_total,
  (SELECT count(*) FROM public.building_audit_logs)                    AS rows_total,
  (SELECT count(*) FROM public.building_audit_logs
    WHERE old_data ?| public.building_audit_ignored_columns()
       OR new_data ?| public.building_audit_ignored_columns())         AS rows_to_reduce;

-- ---------------------------------------------------------------------------
-- Reduce, in committed batches
-- ---------------------------------------------------------------------------
-- The predicate is the progress marker: a reduced row no longer carries any
-- denylisted key, so it drops out of the working set. Rows written directly by
-- the moderation RPCs (small hand-built `new_data`, no row snapshot) never match
-- and are left exactly as they are.
DO $$
DECLARE
  v_batch    CONSTANT int := 5000;
  v_done     bigint := 0;
  v_affected bigint;
BEGIN
  LOOP
    WITH victims AS (
      SELECT id
      FROM   public.building_audit_logs
      WHERE  old_data ?| public.building_audit_ignored_columns()
         OR  new_data ?| public.building_audit_ignored_columns()
      LIMIT  v_batch
      FOR UPDATE SKIP LOCKED
    )
    UPDATE public.building_audit_logs AS al
    SET    old_data = public.building_audit_reduce(al.old_data, al.new_data),
           new_data = public.building_audit_reduce(al.new_data, al.old_data)
    FROM   victims v
    WHERE  al.id = v.id;

    GET DIAGNOSTICS v_affected = ROW_COUNT;
    EXIT WHEN v_affected = 0;

    v_done := v_done + v_affected;
    RAISE NOTICE 'reduced % rows (% total)', v_affected, v_done;
    COMMIT;
  END LOOP;

  RAISE NOTICE 'backfill complete: % rows reduced', v_done;
END
$$;

-- ---------------------------------------------------------------------------
-- Reclaim the disk
-- ---------------------------------------------------------------------------
-- A plain DELETE/UPDATE only marks tuples dead; Supabase's storage meter does not
-- move until the table is rewritten. VACUUM FULL takes an ACCESS EXCLUSIVE lock —
-- the Embassy leaderboard RPCs that read this table will block for its duration,
-- so run it in a quiet window.
VACUUM (FULL, ANALYZE) public.building_audit_logs;

-- ---------------------------------------------------------------------------
-- After
-- ---------------------------------------------------------------------------
SELECT
  pg_size_pretty(pg_total_relation_size('public.building_audit_logs')) AS audit_total,
  pg_size_pretty(pg_database_size(current_database()))                 AS database_total,
  (SELECT count(*) FROM public.building_audit_logs)                    AS rows_total;

-- Sanity check the invariant the Embassy leaderboards depend on: reducing
-- payloads must not change how many rows read as a photo contribution.
SELECT count(*) AS photo_contribution_rows
FROM   public.building_audit_logs al
WHERE  NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
  AND  NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL;
