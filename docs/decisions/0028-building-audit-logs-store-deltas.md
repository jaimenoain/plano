# 0028 — `building_audit_logs` stores per-column deltas, not row snapshots

**Status:** accepted (2026-08-05) — constrains the payload contract that [ADR-0022](0022-building-merge-invariants.md) and migration [`20271196000000`](../../supabase/migrations/20271196000000_fix_moderation_metric_predicate.sql) rely on

## Context

On 2026-08-05 Supabase capped the organisation: **database size 1.28 GB against a 1.1 GB quota**, with
requests dropped until the cycle refilled on 20 August. The site was down for writes.

The instinct was that this was a file-storage problem. It was not, and the distinction matters for
anyone who reads this later: Supabase bills **Database size** (Postgres) and **Storage** (buckets)
against separate quotas. Building and review photos already live in S3 (`plano.app`, eu-west-2) with
only the object key in Postgres, and no column anywhere holds file bytes — every `bytea` in the
migration history is token hashing. Moving the remaining small assets (avatars, poll images, feedback
screenshots) out of Supabase Storage would have recovered exactly zero bytes against the breached
quota.

The growth was in Postgres, in a table that appended forever and was never cleaned up.

`log_building_changes()`, introduced in [`20260715000000`](../../supabase/migrations/20260715000000_add_building_audit_logs.sql),
wrote `to_jsonb(OLD)` **and** `to_jsonb(NEW)` — two complete copies of the buildings row — on every
UPDATE. Two faults compounded:

1. **The payload was dominated by a column nothing reads.** `buildings.search_vector` is a weighted
   tsvector over name, aliases, address and architect statement. It was serialised twice into every
   audit row and has never been read back out of one.
2. **The trigger fired on machine churn.** Its guard was `NEW IS DISTINCT FROM OLD`, and
   `search_vector`, `updated_at`, `popularity_score` and `tier_rank` all move without a human editing
   anything. The nightly pg_cron job `update-building-tiers-daily` rewrites `tier_rank` across the
   catalogue, so a large share of the table described edits nobody made.

No log table in 512 migrations had any retention policy at all.

## Decision

**Both payloads are reduced to the keys that actually differ, minus a denylist of machine-maintained
columns. When that reduces to nothing, no audit row is written.**

The denylist lives in one function, `building_audit_ignored_columns()`, so the trigger and the
backfill cannot drift apart. It contains exactly four columns — `search_vector`, `updated_at`,
`popularity_score`, `tier_rank` — and the constraint on extending it is the substance of this ADR.

### The constraint: `building_audit_logs` is not only an audit trail

Forty-three migrations read this table. It is the substrate for the entire Embassy/ambassador
contribution system, and six leaderboard and metric RPCs detect a photo contribution with a predicate
of this shape:

```sql
   NULLIF(TRIM(BOTH FROM COALESCE(al.old_data ->> 'hero_image_url', '')), '') IS NULL
AND NULLIF(TRIM(BOTH FROM COALESCE(al.new_data ->> 'hero_image_url', '')), '') IS NOT NULL
```

Delta encoding preserves this exactly. When `hero_image_url` changes it is a differing key, so it
survives into both payloads and the predicate matches as before; when it does not change it is absent
from both, `->>` yields NULL, and the second leg correctly fails.

But that only holds while `hero_image_url` stays out of the denylist. **Adding it — or `operation`, or
`table_name`, which carry the ambassador approval markers — would zero out every ambassador's
contribution statistics with no error raised anywhere.** This is the same failure mode as the bug
`20271196000000` was written to fix: a predicate that silently matched nothing for months.
`tests/unit/shrink-building-audit-logs-migration.test.ts` asserts the denylist contains only the four
machine-maintained columns, and names this reason.

### `revert_building_change` had to change with it

The old body assigned every column unconditionally from `old_data`:

```sql
SET name = (r.old_data->>'name'), address = (r.old_data->>'address'), …
    location = (r.old_data->>'location')::geography
```

Against a delta that is data loss rather than a revert — a missing key casts to NULL, so undoing a
name typo would wipe the building's address, city, year and coordinates. Each column is now restored
only when the payload carries that key, tested with `?` (key-exists) rather than `COALESCE`, because
COALESCE cannot distinguish "absent from the delta" from "was legitimately NULL".

This also makes revert *more* correct than before: it no longer clobbers columns that other edits
changed in the interim.

## Alternatives considered

**Time-based retention (delete rows older than N days).** Rejected: the Embassy leaderboards compute
all-time contribution totals from this table, so deleting old rows would retroactively rewrite
ambassadors' standings. Shrinking every row preserves all history and, because `search_vector`
dominated the payload, recovers more.

**Rewriting into a new table and swapping.** Rejected on risk. `CREATE TABLE (LIKE … INCLUDING ALL)`
copies indexes and defaults but *not* foreign keys and *not* RLS policies, and RLS defaults to
disabled on a new table. A missed `ENABLE ROW LEVEL SECURITY` would expose the table. An in-place
batched UPDATE followed by `VACUUM FULL` keeps every constraint, policy and grant by construction.

**Storing a single `changed_columns` array plus one payload.** Rejected: the leaderboard predicates
need both the before and after value of `hero_image_url`, not merely the fact that it changed.

## Consequences

- The nightly tier job writes no audit history at all. Ongoing growth of this table is now
  proportional to real human edits.
- `VACUUM FULL` is required to return the bytes — a plain UPDATE only marks tuples dead and moves
  nothing on Supabase's meter. It takes an ACCESS EXCLUSIVE lock, so the backfill
  (`scripts/shrink-building-audit-logs.sh`) is a manual step run in a quiet window, not a
  migration. Supabase wraps migrations in a transaction and `VACUUM FULL` cannot run inside one.
- Historical rows lose their `search_vector`, `updated_at`, `popularity_score` and `tier_rank` values.
  Nothing reads them; this is accepted and irreversible.
- Audit entries written before the backfill and after it are shaped identically, so consumers need no
  version awareness.
- This ADR covers `building_audit_logs` only. The other unbounded log tables — `api_request_logs`,
  `admin_diagnostic_logs`, `login_logs`, `embassy_event_search_runs`, `embassy_digest_deliveries` —
  and pg_net's `net._http_response` still have no retention policy. They are follow-up work.

## Outcome (applied to production 2026-08-05)

| | Before | After |
|---|---|---|
| `building_audit_logs` | 1093 MB | **99 MB** |
| Database total | 1224 MB | **230 MB** |
| Rows | 429,255 | 429,255 (none lost) |
| Average payload (`old_data` + `new_data`) | ~2.5 KB | **70 bytes** |

Measured on a live building: a `tier_rank` change now writes **no** audit row at all, and a real name
edit writes one row of 81 bytes where the equivalent pre-migration row was 2,534.

Three things were learned in the process and are recorded here so they are not rediscovered:

**1. The quota lock is a catch-22.** Supabase did not merely warn — it restricted the project
(`exceed_db_size_quota`), and the restriction blocks psql, the dashboard SQL editor, *and* the
Management API's `/database/query` endpoint alike. The database could not be shrunk because it was
locked for being too big. Upgrading the plan cleared the violation, but the enforcement flag was
sticky and only lifted after `POST /v1/projects/{ref}/restart`.

**2. `statement_timeout` defeats a `DO` block.** The backfill was first written as a
`DO $$ ... LOOP ... COMMIT; END LOOP $$` block. It failed in production after 35 batches: Supabase
enforces `statement_timeout = 2min`, the entire block is a **single statement**, and `COMMIT`s inside
a procedural block do not reset the statement clock. `PGOPTIONS=-c statement_timeout=0` does not help
because the Supavisor pooler ignores it. The loop now lives in the client
(`scripts/shrink-building-audit-logs.sh`), one batch per statement. `VACUUM FULL` still needs the
timeout lifted, which requires a persistent session over stdin — each `psql -c` gets its own implicit
transaction, so a `SET` in one `-c` does not survive into the next.

**3. The Embassy "photos added" metric was already broken, and this change did not break it.**
Replaying the pre-backfill restore point into a local Postgres and running the leaderboards' own
predicate gave **0 matches before the change and 0 after** — while the number of rows carrying a
non-empty `new_data -> hero_image_url` was **783 in both**, confirming the reduction preserved
exactly what it had to. The predicate reads zero because every `hero_image_url` write in the audit log
is a URL→URL change, never NULL→URL: no row ever records a building *gaining* its first hero image.
That is a pre-existing defect in the six RPCs listed above — the same silent-zero class as
`20271196000000` — and is deliberately left for separate work rather than folded in here.
