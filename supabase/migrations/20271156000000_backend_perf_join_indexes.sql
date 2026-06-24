-- Backend performance: add the missing JOIN indexes on the hot chapter-RPC paths
-- (forensic backend-latency audit, 2026-06-22)
--
-- The chapter leaderboard/metrics RPCs (get_chapter_ambassador_activity,
-- get_chapter_metrics) and the discovery feed all JOIN large tables on columns
-- that have NO supporting index, forcing a sequential scan on every call:
--
--   building_audit_logs.building_id
--     Every chapter RPC joins audit logs on `al.building_id = b.id`. The only
--     index on this table is idx_building_audit_logs_user_created_at
--     (user_id, created_at) from 20271152000000 — it does NOT help building_id
--     joins. Even the already-shipped set-based leaderboard rewrite
--     (20271151000000) still seq-scans the whole audit-log table per call
--     without this index. Highest-priority of the three.
--
--   user_buildings.building_id
--     Joined by get_chapter_* (visits) and get_discovery_feed / get_feed
--     (saves count + silent-visit anti-join). Only user_id-prefixed indexes
--     exist today, so the building_id side is unindexed.
--
--   outreach_log.ambassador_id (+ created_at)
--     The leaderboard's outreach_agg scans `WHERE ambassador_id = … AND
--     created_at >= …` per member; outreach_log was created with only a PK.
--
-- These are index-only additions: pure speed, no behavioural/output change.
--
-- Regular CREATE INDEX (not CONCURRENTLY) to match the project's existing index
-- migration style (20271152000000) and because migration application may run
-- inside a transaction. building_audit_logs is the largest table here — if
-- applying against a busy production table, prefer running the equivalent
-- `CREATE INDEX CONCURRENTLY` (a standalone, non-transactional statement) in the
-- Supabase SQL Editor during a low-traffic window instead of this DDL.

-- 1. building_audit_logs — covers the `al.building_id = b.id` join + date-range
--    filter used by get_chapter_metrics / get_chapter_ambassador_activity.
CREATE INDEX IF NOT EXISTS idx_building_audit_logs_building_id_created_at
  ON public.building_audit_logs (building_id, created_at);

-- 2. user_buildings — covers the `ub.building_id = b.id` join used by the
--    chapter visits metric and the feed/discovery save-count + anti-join.
CREATE INDEX IF NOT EXISTS idx_user_buildings_building_id
  ON public.user_buildings (building_id);

-- 3. outreach_log — covers the per-member outreach scan in the leaderboard RPC.
CREATE INDEX IF NOT EXISTS idx_outreach_log_ambassador_created_at
  ON public.outreach_log (ambassador_id, created_at);
