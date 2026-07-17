# Migrations, types & guardrails

This doc covers the day-to-day workflows the Phase 1 guardrails (from
`docs/CODEBASE_STRUCTURE_AUDIT.md`) assume. None of these gates apply migrations to the database for
you — there is a single production Supabase project and no staging copy, so **applying migrations
stays a manual, deliberate step.**

## Writing a migration

- Name it `YYYYMMDDHHmmss_short_description.sql` using a **unique 14-digit UTC timestamp**.
  `node scripts/check-migrations.mjs` (run in CI and in the pre-commit hook) fails on a new
  timestamp collision or a non-conforming filename.
- The ~33 pre-existing colliding timestamps and the 2 legacy non-conforming filenames are recorded
  in `supabase/migrations/.collision-baseline.json`. They are already applied to production and
  must not be renamed (renaming makes Supabase replay them). Don't add to that file unless a
  migration is already live and genuinely cannot be renamed.

## Writing an RPC (database function)

Copy `supabase/migrations/_TEMPLATE_rpc.sql.txt` to a new timestamped `.sql` file. The template
encodes three rules that have caused production incidents:

- **Always re-`REVOKE`/`GRANT EXECUTE`** after a `create or replace function` — re-creating a
  function resets its privileges (causes 403/500s otherwise).
- **Pin `set search_path = ''`** and schema-qualify object names.
- **Prefer set-based bodies** over per-row `SECURITY DEFINER` loops (those hit the 8s
  `statement_timeout`).

The migration check warns (non-blocking) if a changed migration defines a function with no
`revoke ... from public`.

## After applying a schema migration: regenerate types

The generated types in `src/integrations/supabase/types.ts` do not update themselves. After you
apply a migration that changes the public schema:

```bash
npm run gen-types        # regenerates src/integrations/supabase/types.ts from the live DB
```

`gen-types` shells out to the Supabase CLI — it must be installed (`brew install
supabase/tap/supabase` or `npx supabase`) and authenticated (`supabase login`) with access to the
hosted project; it is not an npm dependency.

Commit the regenerated file **in the same PR as the migration**. CI enforces this with a
**blocking** required check (`Types staleness`, `scripts/check-types-staleness.mjs`) that fails any
PR changing `supabase/migrations/` without touching `types.ts`. (`gen-types` needs Supabase network
access, so regeneration itself is intentionally a local step, not a CI step.)

**Types-neutral migrations.** Some migrations genuinely change no types — a `create or replace
function` that only edits a function *body* (an `ORDER BY` tweak, a reworded `RAISE`) with no change
to its signature/return, or a pure data backfill. `gen-types` is then a no-op and there is nothing
to commit. Declare such a migration with a marker line so the staleness check passes without a
`types.ts` diff:

```sql
-- types-neutral: ORDER BY only; function signature/RETURNS unchanged, so gen-types is a no-op.
```

This is not a blanket skip: every changed migration must **either** update `types.ts` **or** carry
its own marker, so a real schema change with a forgotten regen still fails. The marker (and its
reason) live in the migration, keeping the exemption auditable in the PR diff.

## Growing the strict-TypeScript allowlist

The app still typechecks in lenient mode. `tsconfig.strict.json` typechecks a curated allowlist of
strict-clean files; `npm run typecheck:strict` runs in CI and blocks regressions on those files.

To bring a file under strict:

```bash
# 1. Add the file's path to the "include" array in tsconfig.strict.json
# 2. Verify it (and its imports) pass:
npm run typecheck:strict
# 3. If green, commit. CI now protects it.
```

This is the incremental path toward flipping `strict: true` globally in `tsconfig.app.json`.

## The boundary lint rules (advisory for now)

`eslint.config.js` warns (not errors) when:

- The Supabase **browser client** (`@/integrations/supabase/client`) is imported outside a feature
  `api/` module or a route loader — components/hooks should call a typed function in
  `src/features/*/api/**` instead.
- Code does a **deep cross-feature import** (`@/features/<other>/…/internal`) instead of importing
  from that feature's barrel (`@/features/<other>`) or its `api/`.

These are warnings because of a large existing backlog. They surface new violations in review;
once a directory's backlog is burned down they can be ratcheted to `error` for that path.

## Git hooks

`npm install` runs the `prepare` script, which points git at the committed hooks via
`git config core.hooksPath .githooks`. The `pre-commit` hook runs the migration check when staged
changes touch `supabase/migrations/`. Bypass in an emergency with `git commit --no-verify`.
