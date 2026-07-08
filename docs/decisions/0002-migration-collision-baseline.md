# 0002 — Grandfather migration filename collisions; never rename applied migrations

**Status:** accepted (2026-07-06, with the CI ratchet work)

## Context

`supabase/migrations/` accumulated 33 pairs of files sharing the same 14-digit timestamp prefix, plus 2 files with non-conforming names (`20250218_add_location_to_profiles.sql`, `add_slug_to_groups.sql`), largely from AI-generated migrations using synthetic timestamps (some with impossible dates like month 11 day 70). Supabase's migration tracker silently applies **one file per timestamp and skips the rest**, so collisions are dangerous: a new file colliding with an old prefix may never run.

The obvious "fix" — renaming the offending files to unique timestamps — is worse than the disease: these migrations are already applied to the production database, and renaming them would make Supabase treat them as new, unapplied migrations and attempt to replay them.

## Decision

- Existing collisions and non-conforming names are **frozen** in `supabase/migrations/.collision-baseline.json` and never renamed.
- `scripts/check-migrations.mjs` (blocking CI job + pre-commit hook) hard-fails any **new** collision or non-conforming filename.
- The live database, not the migration filename order, is the authority on what's applied. When in doubt, probe the DB (see `docs/AI_STATUS.md` drift log).

## Consequences

- Do not rename, merge, or "clean up" files in `supabase/migrations/` — ever.
- New migrations must use a real, unique `YYYYMMDDHHmmss` prefix; CI rejects duplicates.
- A developer reconstructing a database from the migration folder alone may not get production's exact state; the generated types + live schema are the ground truth.
