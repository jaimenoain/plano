-- Where the database storage has gone.
--
--   psql "$SUPABASE_DB_URL" -f scripts/db-size-report.sql
--
-- Run this FIRST when Supabase warns about database size, before deleting or
-- rewriting anything. Read-only.
--
-- Note what this metric is not: Supabase bills "Database size" (Postgres) and
-- "Storage" (buckets) against separate quotas. Building and review photos live in
-- S3 with only the object key in Postgres, and no column holds file bytes — so a
-- database-size alert is never fixed by moving files. The cause is almost always
-- an append-only table with no retention policy.

\pset pager off

\echo '== total =='
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

\echo ''
\echo '== 40 largest relations =='
SELECT
  n.nspname                                        AS schema,
  c.relname                                        AS relation,
  pg_size_pretty(pg_total_relation_size(c.oid))    AS total,
  pg_size_pretty(pg_relation_size(c.oid))          AS heap,
  pg_size_pretty(pg_indexes_size(c.oid))           AS indexes,
  c.reltuples::bigint                              AS approx_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'm')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 40;

\echo ''
\echo '== dead tuples (space a VACUUM FULL would return) =='
SELECT
  schemaname                                   AS schema,
  relname                                      AS relation,
  n_live_tup                                   AS live_rows,
  n_dead_tup                                   AS dead_rows,
  last_autovacuum,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC
LIMIT 20;

\echo ''
\echo '== pg_net response backlog =='
-- pg_net stores every HTTP response body from net.http_post() and has no TTL
-- configured by default. Nothing in this codebase reads these rows back.
SELECT count(*) AS queued_responses FROM net._http_response;

\echo ''
\echo '== unbounded log tables (no retention policy as of ADR 0028) =='
SELECT
  t.relation,
  pg_size_pretty(pg_total_relation_size(('public.' || t.relation)::regclass)) AS total
FROM (VALUES
  ('building_audit_logs'),
  ('api_request_logs'),
  ('admin_diagnostic_logs'),
  ('admin_audit_logs'),
  ('login_logs'),
  ('note_views'),
  ('embassy_digest_deliveries'),
  ('embassy_event_search_runs'),
  ('embassy_event_discoveries')
) AS t(relation)
WHERE to_regclass('public.' || t.relation) IS NOT NULL
ORDER BY pg_total_relation_size(('public.' || t.relation)::regclass) DESC;
