# 0012 — Data-safety rails on the free tier (scripted backups + restore point)

**Status:** accepted (2026-07-22)

Realizes [PRINCIPLES.md §7](../PRINCIPLES.md) ("Data is sacred; code is expendable") given plano's
current Supabase **free** tier. The template's automated restore-point pattern is not yet built
and assumes a paid tier; this is the plano fallback until that lands.

## Context

Principle 7 requires that every destructive database operation is preceded by an automatic
restore point, that point-in-time recovery is verified at setup, and that destructive migrations
are rehearsed against a local copy first. The audit
([`docs/specs/principles-alignment.md`](../specs/principles-alignment.md) §7) found **none** of
this in place, and — the highest-severity finding in the whole audit — that Supabase is on the
**free plan, which has no daily backups and no PITR at all**. Today a bad migration or an
accidental delete against production is **unrecoverable**.

The owner was asked to choose (roadmap prerequisite 0.1) and elected to **stay on the free tier
with scripted backups** rather than upgrade Supabase. So the safety net must be built from tools
we control, not from a Supabase plan feature.

Two plano facts shape the mechanism: production is **Postgres 15 + PostGIS** with the
`auth`/`storage` schemas and `spatial_ref_sys` owned by `supabase_admin` (raw `pg_dump` as the
`postgres` role trips over these), and there is **a single production project, no staging copy** —
migrations are applied deliberately by hand via the Supabase MCP `apply_migration`
([`docs/migrations.md`](../migrations.md)).

## Decision

Ship three rails, all logical-backup based:

1. **Scheduled daily backup** — [`.github/workflows/backup.yml`](../../.github/workflows/backup.yml)
   runs once a day, dumps production (roles + schema + data) with the **Supabase CLI**
   (`supabase db dump`, which handles the PostGIS and `supabase_admin`-owned schemas), encrypts
   the bundle with AES-256, and uploads it as a **GitHub artifact** — storage that is off
   Supabase — with 90-day retention. It **skips cleanly (stays green)** until the two secrets
   exist, and a genuine failure opens a deduped `backup-failure` issue.

2. **Pre-destructive-migration restore point** —
   [`scripts/backup-restore-point.mjs`](../../scripts/backup-restore-point.mjs), run by hand right
   before applying a destructive migration, produces a point-in-time dump to roll back to. This is
   the concrete substitute for the charter's "automatic restore point"; the checklist lives in
   [`docs/RUNBOOK.md`](../RUNBOOK.md).

3. **Rehearsal + reconciled RUNBOOK** — the restore-point dump doubles as the "local copy" the
   charter's rehearsal clause needs: a destructive migration is restored into a throwaway local
   Postgres and run there before touching production. This reconciles the RUNBOOK's "no local
   Supabase" line — which is about day-to-day *feature* work — with the rehearsal clause.

Two new **repository secrets** are required (the first server-side DB credential in this repo's
CI): `SUPABASE_DB_URL` (the Session-pooler connection string — IPv4, which GitHub runners need)
and `BACKUP_ENCRYPTION_PASSPHRASE`.

The **automated** restore-point mechanism (a hook that dumps automatically on every destructive
change, and verified PITR) is explicitly **deferred: adopt the template's pattern once it lands.**
That pattern assumes a paid tier; on the free tier the scripted `pg_dump`/`supabase db dump`
fallback above is what actually ships.

## Consequences

- Production goes from **zero recoverability** to a daily encrypted off-Supabase backup plus an
  on-demand restore point before risky changes — the audit's top-severity gap is closed to the
  extent the free tier allows.
- The recovery point objective is **up to 24h** for the daily dump; the pre-migration restore
  point covers the moment immediately before a destructive change. This is weaker than PITR and
  is the accepted cost of staying on the free tier; upgrading to a paid tier + PITR supersedes
  rail 1 and is the intended eventual state.
- Backups contain **all customer data**, so they are always encrypted; losing
  `BACKUP_ENCRYPTION_PASSPHRASE` makes every backup unreadable — it must live in a password
  manager, not only in GitHub secrets.
- This introduces the first production DB credential into CI. It is least-privilege only in that
  the workflow uses it for read/dump; treat any PR that widens its use as a review red flag.
- A PR that deletes or disables `backup.yml`, lowers its retention, or removes the restore-point
  step is a data-safety regression and a review red flag.
