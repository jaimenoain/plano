# 0004 — E2E tests run against production Supabase with dedicated QA accounts

**Status:** accepted (2026-07-09, owner decision)

## Context

Standard practice is that automated tests never touch production. Plano's Playwright E2E suite (`tests/e2e/`) runs against the hosted **production** Supabase project, signing in with dedicated QA accounts (`role='test_user'`, credentials in `.env.local` locally / GitHub secrets in CI). There is no seedable local Supabase: the schema spans 485 migrations plus PostGIS, storage buckets, and Edge Functions, and no local bootstrap exists.

## Decision

Keep E2E against production with isolated QA accounts, as a formal, documented exception — explicitly approved by the owner on 2026-07-09.

## Alternatives rejected

- **Local Supabase in CI** — replaying 485 migrations plus seeding PostGIS data per run is heavy and fragile; nobody maintains a seed set.
- **Dedicated test Supabase project** — standing cost plus permanent schema-drift risk against the real project.

## Consequences

- E2E specs may only read public data and mutate data owned by the QA accounts. **Never** destructive or global operations (deleting shared records, admin mutations, bulk writes).
- Test-account writes land in production tables; specs should clean up after themselves where practical.
- Revisit (supersede this ADR) if a maintained test environment or seed pipeline ever materializes.
