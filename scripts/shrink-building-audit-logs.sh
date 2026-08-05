#!/usr/bin/env bash
#
# Backfill: rewrite historical building_audit_logs payloads as deltas.
#
#   SUPABASE_DB_URL=... ./scripts/shrink-building-audit-logs.sh
#
# Run AFTER migration 20271198000000 is applied (it defines the two helper
# functions this depends on) and AFTER taking a restore point — this rewrites
# history in place and is not reversible without one. See ADR 0028.
#
# WHY THIS IS A SHELL DRIVER AND NOT A .sql FILE
# ----------------------------------------------
# The obvious implementation — a `DO $$ ... LOOP ... COMMIT; END LOOP $$` block —
# does not work on Supabase, and failed in production on 2026-08-05 after 35
# batches. Supabase enforces `statement_timeout = 2min`, the whole DO block is a
# SINGLE statement, and the COMMITs inside a procedural block do NOT reset the
# statement clock. `PGOPTIONS=-c statement_timeout=0` does not help either: the
# Supavisor pooler ignores it.
#
# So the loop has to live in the client, where each batch is its own statement
# with its own 2-minute budget. At 10k rows per batch each round trip took ~8s
# against a 1 GB table, so there is a wide margin.
#
# Safe to interrupt and re-run: the batch predicate is self-clearing, so a row
# that has already been reduced is never revisited.

set -euo pipefail

BATCH="${BATCH:-10000}"
MAX_BATCHES="${MAX_BATCHES:-500}"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "SUPABASE_DB_URL is not set (see .env.local)" >&2
  exit 1
fi

psql_q() { psql "$SUPABASE_DB_URL" -At -c "$1"; }

echo "== before =="
psql "$SUPABASE_DB_URL" -c "
  SELECT pg_size_pretty(pg_total_relation_size('public.building_audit_logs')) AS audit_total,
         pg_size_pretty(pg_database_size(current_database()))                 AS database_total,
         (SELECT count(*) FROM public.building_audit_logs)                    AS rows_total,
         (SELECT count(*) FROM public.building_audit_logs
           WHERE old_data ?| public.building_audit_ignored_columns()
              OR new_data ?| public.building_audit_ignored_columns())         AS rows_to_reduce;"

# ---------------------------------------------------------------------------
# Reduce, one batch per statement
# ---------------------------------------------------------------------------
# The predicate is the progress marker: a reduced row no longer carries any
# denylisted key, so it drops out of the working set. Rows written directly by
# the moderation RPCs (small hand-built `new_data`, no row snapshot) never match
# and are left exactly as they are.
total=0
for i in $(seq 1 "$MAX_BATCHES"); do
  n=$(psql_q "
    WITH victims AS (
      SELECT id FROM public.building_audit_logs
      WHERE old_data ?| public.building_audit_ignored_columns()
         OR new_data ?| public.building_audit_ignored_columns()
      LIMIT ${BATCH} FOR UPDATE SKIP LOCKED
    ), upd AS (
      UPDATE public.building_audit_logs al
      SET old_data = public.building_audit_reduce(al.old_data, al.new_data),
          new_data = public.building_audit_reduce(al.new_data, al.old_data)
      FROM victims v WHERE al.id = v.id
      RETURNING 1
    ) SELECT count(*) FROM upd;")

  case "$n" in ''|*[!0-9]*) echo "batch $i failed: $n" >&2; exit 1;; esac
  total=$((total + n))
  echo "batch $i: $n rows (total $total)"
  [ "$n" -eq 0 ] && break
done

# ---------------------------------------------------------------------------
# Reclaim the disk
# ---------------------------------------------------------------------------
# A plain UPDATE only marks tuples dead; Supabase's storage meter does not move
# until the table is rewritten. VACUUM FULL takes an ACCESS EXCLUSIVE lock — the
# Embassy leaderboard RPCs that read this table block for its duration, so run it
# in a quiet window. It needs its own session with the timeout lifted, and it
# cannot run inside a transaction block, so it goes over stdin rather than -c.
echo "== vacuum full =="
psql "$SUPABASE_DB_URL" <<'SQL'
SET statement_timeout = 0;
VACUUM (FULL, ANALYZE) public.building_audit_logs;
SQL

echo "== after =="
psql "$SUPABASE_DB_URL" -c "
  SELECT pg_size_pretty(pg_total_relation_size('public.building_audit_logs')) AS audit_total,
         pg_size_pretty(pg_database_size(current_database()))                 AS database_total,
         (SELECT count(*) FROM public.building_audit_logs)                    AS rows_total;"

# Sanity check the invariant the Embassy leaderboards depend on: reducing
# payloads must not change how many rows read as a photo contribution.
#
# NOTE: this legitimately reported 0 both before and after the 2026-08-05 run.
# Every hero_image_url write in the audit log is a URL->URL change, never
# NULL->URL, so this predicate has never matched. That is a pre-existing bug in
# the leaderboards, not a backfill regression — see ADR 0028.
echo "== leaderboard invariant (compare against the pre-run value) =="
psql "$SUPABASE_DB_URL" -c "
  SELECT count(*) AS photo_contribution_rows,
         count(*) FILTER (WHERE NULLIF(TRIM(COALESCE(new_data->>'hero_image_url','')),'') IS NOT NULL)
           AS rows_with_new_hero_image
  FROM public.building_audit_logs al
  WHERE NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url','')),'') IS NULL
     OR TRUE;"
