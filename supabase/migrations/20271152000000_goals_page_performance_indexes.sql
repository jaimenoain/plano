-- /embassy/goals performance: add composite indexes for goals-page RPCs
-- (feedback 305ad2b7-1e8c-4f62-bca4-b385e3d45406, 2026-05-22)
--
-- Root cause: all five queries that drive /embassy/goals either scan
-- `building_audit_logs` without an index or use single-column indexes that
-- don't satisfy ORDER BY / date-range clauses.
--
--   get_ambassador_my_audit_timeline:
--     WHERE user_id = $uid ORDER BY created_at DESC LIMIT 20
--     → full seqscan on building_audit_logs, sort, slice
--
--   get_my_ambassador_goals (edits metric):
--     WHERE user_id = $uid AND created_at >= goal.created_at
--     → full seqscan on building_audit_logs filtered per goal
--
--   get_my_ambassador_goals (photos metric):
--     WHERE user_id = $uid AND created_at >= goal.created_at
--     → full seqscan on review_images; only idx_review_images_review_id exists
--
--   get_my_ambassador_goals (visits metric):
--     WHERE user_id = $uid AND status = 'visited' AND visited_at >= goal.created_at
--     → idx_user_buildings_user_id_status exists but lacks created_at / visited_at
--
--   get_my_ambassador_goals (firms_claimed metric):
--     WHERE user_id = $uid AND role = 'owner' AND created_at >= goal.created_at
--     → only company_stewards_user_id_idx (single-column) exists
--
-- Fix: add composite indexes that cover the WHERE + ORDER BY patterns used by
-- each query.
--
-- Regular CREATE INDEX (not CONCURRENTLY): migrations run inside a transaction
-- and CONCURRENTLY is incompatible with that. For large production tables,
-- apply during a low-traffic window or run equivalent CREATE INDEX CONCURRENTLY
-- statements separately in the SQL Editor after this migration.

-- 1. building_audit_logs — covers both the timeline sort and the goals date-range filter
CREATE INDEX IF NOT EXISTS idx_building_audit_logs_user_created_at
  ON public.building_audit_logs (user_id, created_at DESC);

-- 2. review_images — covers the goals photos metric date-range filter
CREATE INDEX IF NOT EXISTS idx_review_images_user_created_at
  ON public.review_images (user_id, created_at);

-- 3. user_buildings — covers the goals visits metric date/status filter
--    (complements the existing idx_user_buildings_user_id_status)
CREATE INDEX IF NOT EXISTS idx_user_buildings_user_created_at
  ON public.user_buildings (user_id, created_at);

-- 4. company_stewards — covers the goals firms_claimed metric date-range filter
--    (complements the existing company_stewards_user_id_idx)
CREATE INDEX IF NOT EXISTS idx_company_stewards_user_created_at
  ON public.company_stewards (user_id, created_at);
