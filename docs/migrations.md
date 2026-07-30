# Migrations, types & guardrails

This doc covers the day-to-day workflows the Phase 1 guardrails (from
`docs/CODEBASE_STRUCTURE_AUDIT.md`) assume. None of these gates apply migrations to the database for
you — there is a single production Supabase project and no staging copy, so **applying migrations
stays a manual, deliberate step.**

> **Destructive migration?** Before applying anything that drops/renames a column or table,
> deletes rows, or rewrites data, take a restore point and rehearse it locally first — the
> checklist is in [Data safety](RUNBOOK.md#data-safety--backups--restore) (`node
> scripts/backup-restore-point.mjs`). On the free tier this is the only rollback you get
> ([ADR 0012](decisions/0012-data-safety-rails.md)).

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
encodes four rules that have caused production incidents:

- **Always re-`REVOKE`/`GRANT EXECUTE`** after a `create or replace function` — re-creating a
  function resets its privileges (causes 403/500s otherwise).
- **Revoke `anon` and `authenticated` by name**, not just `PUBLIC` — see below.
- **Pin `set search_path = ''`** and schema-qualify object names.
- **Prefer set-based bodies** over per-row `SECURITY DEFINER` loops (those hit the 8s
  `statement_timeout`).

The migration check warns (non-blocking) if a changed migration defines a function without
re-asserting grants, or re-asserts them without naming `anon` and `authenticated`.

### `REVOKE ... FROM PUBLIC` does not lock a function down

Supabase configures this project with

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
```

so **every function created in `public` receives a direct grant to `anon` and `authenticated` at
creation time.** `revoke ... from public` drops only the `PUBLIC` pseudo-role; the direct grants
survive and the function stays callable by anyone holding the publishable anon key.

This was live: an anonymous `POST /rest/v1/rpc/run_weekly_digest` returned 200 and executed the
function (fixed in #1671; the rest of the schema was audited and swept in
`20271194000000_revoke_anon_execute_internal_rpcs.sql`). Always write:

```sql
revoke all on function public.fn(args) from public, anon, authenticated;
grant execute on function public.fn(args) to authenticated;   -- only the roles that need it
```

Internal helpers and privileged jobs should grant nothing back: `postgres` and `service_role` keep
`EXECUTE` through their own grants, and pg_cron jobs run as `postgres`.

Verify with `has_function_privilege`, which accounts for both grant paths:

```sql
select has_function_privilege('anon', 'public.fn(uuid)', 'EXECUTE');
```

### Before revoking an *existing* function

Three checks, each of which has caught a real would-be breakage:

1. **Is it referenced by an RLS policy?** A policy's `USING`/`WITH CHECK` expression is evaluated as
   the *querying* role, and Postgres checks that role's `EXECUTE` privilege on any function it
   calls. Revoking turns every read of the protected table into
   `ERROR: permission denied for function ...`. Find them with:

   ```sql
   select c.relname, pol.polname from pg_policy pol join pg_class c on c.oid = pol.polrelid
   where coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ||
         coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~ '\mfn_name\M';
   ```

2. **Is it called from a `SECURITY INVOKER` function that anon can reach?** Nested calls are checked
   against the *caller's* privileges. Inside a `SECURITY DEFINER` function the owner's privileges
   apply instead, so definer callers are safe.

3. **Does the client call it?** Grep `src/`, `supabase/functions/` and `e2e/` for the bare name —
   not just `.rpc("name"`, since call sites are often wrapped across lines.

Trigger functions need no grant at all: Postgres does not check `EXECUTE` when firing a trigger, and
PostgREST cannot invoke a `returns trigger` function directly.

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
