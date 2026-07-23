# 0020 — Apply migrations via the Supabase Management API, not the MCP connector

**Status:** accepted (2026-07-23)

**Context.** This Claude Code workspace manages projects that live in **several different
Supabase accounts/organizations**. The Supabase MCP connector authenticates (OAuth) to a
**single** account, and that account is not necessarily the one hosting the project in front of
us. For plano specifically the MCP token resolves to a different org: `list_projects` returns only
"Arcadia Asset" (`yvybztfoxmqxjdydivwn`, and INACTIVE), while plano's real production project is
`lnqxtomyucnnrgeapnzt` (see [`supabase/config.toml`](../../supabase/config.toml) and
[`.mcp.json`](../../.mcp.json)). Calling MCP `apply_migration` / `execute_sql` against the real
ref returns *"You do not have permission to perform this action"*, and calling it without a ref
silently targets the wrong database. An agent that trusts the MCP connector here will either fail
or, worse, run SQL against the wrong account's data.

**Decision.** Apply migrations and run SQL against plano's production database through the
**Supabase Management API** (`POST https://api.supabase.com/v1/projects/{ref}/database/query`),
authenticated with the **personal access token stored in `.env.local`**
(`SUPABASE_PERSONAL_ACCESS_TOKEN`), targeting the ref from `supabase/config.toml`
(`lnqxtomyucnnrgeapnzt`). Do **not** use the Supabase MCP connector for plano database
operations. This is the mechanism already recorded in the migration playbook
([`docs/migrations.md`](../migrations.md)); this ADR records *why* the MCP path is explicitly
rejected.

Operational rules:
- The PAT and ref are read from `.env.local` **at runtime** by a script (via `fs`); they are never
  printed to logs, transcripts, or the shell history. Scripts echo only status, never the token.
- Migration **filenames** use synthetic `202711…` version prefixes; the database records the real
  applied version in `supabase_migrations.schema_migrations`. After applying, insert the file's
  version there so the migration is not seen as pending.
- Types are regenerated with the same PAT (`npm run gen-types`) whenever a migration changes the
  schema; RLS/policy-only migrations are **types-neutral** and carry a
  `-- types-neutral: <reason>` marker (see [ADR 0018](0018-types-staleness-gate.md)).

**Rejected alternative.** Use the Supabase MCP connector (`apply_migration` / `execute_sql`) —
rejected: it is single-account and cannot reach every Supabase org this workspace manages, so it
fails on, or misroutes away from, plano's project. Re-authorizing the connector per project was
also rejected as fragile and easy to get silently wrong when several accounts are in play.
