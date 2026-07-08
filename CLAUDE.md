# CLAUDE.md

**This file intentionally defers to [`AGENTS.md`](AGENTS.md) — the single source of truth for agent conduct in this repo.** Read it first, then `docs/AI_STATUS.md`, then the relevant `.cursor/rules/*.mdc` files.

Quick facts so a lazy context window can't get them wrong: this is a **single-app React Router v7 SSR project** (Vite 7, React 19, Supabase). It is NOT a monorepo, NOT Next.js, and there is no `turbo` — build/typecheck/lint/test run via plain `npm run` scripts from the repo root.

The most violation-prone rules (full detail in AGENTS.md):

- **No `getSession()`** for auth decisions. Always `getUser()`.
- **No mock data.** Every feature connects to real Supabase.
- **No raw Tailwind palette colors.** Design token aliases only (`docs/DESIGN_TOKENS.md`).
- **Migrations only** for schema changes — apply via Supabase MCP `apply_migration`, then `npm run gen-types` in the same PR.

Definition of Done (full text in AGENTS.md): `npm run check` green before commit · tests ship with the behavior in the same PR · affected docs updated in the same PR · baselines never go up · small single-concern PRs, never direct pushes to `main`.

Pointer map:

- [`AGENTS.md`](AGENTS.md) — the rules; read first.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the system fits together.
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — clone → run → test → deploy, and what to do when things break.
- [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md) — what the schema/DTOs should be.
- [`docs/decisions/`](docs/decisions/) — why things are the way they are (ADRs; write one for any structural/dependency/data-model choice).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how changes land (PRs, required checks, ratchets).
