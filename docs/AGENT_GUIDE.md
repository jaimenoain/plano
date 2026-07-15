# Agent Guide — How to Work in This Template

> **Audience:** a coding AI agent (Claude Code, Cursor, Gemini, or otherwise)
> about to do work in a repository created from this template.
>
> **What this document is:** a _map_, not a rulebook. It tells you what exists,
> how the pieces fit, and which file is authoritative for each concern. It
> deliberately does **not** restate the rules — those live in `.cursor/rules/`
> and the project's own truth lives in `docs/`. Where this guide and those
> files disagree, **they win and this guide is stale.** Read it once to orient,
> then work from the authoritative files.

---

## 1. What you're looking at

This repository is **two things in one**:

1. **A code scaffold** — a Turborepo monorepo with a Next.js web app and a
   shared Supabase backend package. Most of it is intentionally empty:
   pre-wired plumbing (auth clients, middleware, workspace packages) plus
   stubs waiting to be filled in.

2. **A governance + bootstrapping system** — a set of always-on rules
   (`.cursor/rules/`), a set of bootstrapping guides (`docs/project_start/`),
   and a small library of living specification documents (`docs/`). This is
   what steers an AI agent so that features come out consistent, secure, and
   free of the silent failure modes (schema drift, RLS denials, mock-data
   creep) that unguided agents produce.

The second part is the point. The scaffold is ordinary; the system around it
is what makes agent-driven development on it reliable. Internalize the system
before you touch the code.

---

## 2. The stack (fixed — no substitutions)

| Layer                         | Technology                                              |
| ----------------------------- | ------------------------------------------------------- |
| Monorepo                      | Turborepo (npm workspaces)                              |
| Web                           | Next.js 15 App Router, TypeScript strict                |
| Backend / Auth / DB / Storage | Supabase (Postgres)                                     |
| Styling                       | Tailwind CSS + Shadcn/UI (Radix) — design tokens only   |
| Data fetching                 | React Query (client cache) + Server Actions (mutations) |
| Validation                    | Zod (all inputs, always)                                |
| Email                         | Resend (incl. Supabase auth SMTP)                       |
| Hosting                       | Vercel                                                  |

Authoritative source: [`.cursor/rules/00-architecture.mdc`](../.cursor/rules/00-architecture.mdc).
Substituting any layer is out of scope unless the user explicitly asks.

---

## 3. Repository layout

```
apps/
  web/                     Next.js App Router app (the only app in the template)
    app/
      (marketing)/         Public layout — no auth
      (app)/               Authenticated layout — protected by middleware
    lib/supabase/          Pre-built clients: server.ts, client.ts, middleware.ts (+ admin.ts once auth is built)
    middleware.ts          Thin entry → lib/supabase/middleware.ts (Auth Exclusion Zone — do not touch)
    tailwind.config.ts     Web design-token implementation (the truth; DESIGN_TOKENS.md documents it)
packages/
  supabase/                Shared client + AUTO-GENERATED database.types.ts (never hand-edit)
  config/tailwind/         Shared cross-platform Tailwind preset (base.ts)
docs/
  *.md                     The living specs (see §5) — currently placeholders in a fresh template
  project_start/           The bootstrapping guides (PRD, Claude Design, roadmap) — see §7
  playbooks/               Incident runbooks (e.g. Vercel runtime module-not-found)
.cursor/rules/             Always-on governance rules — see §6
CLAUDE.md / GEMINI.md      Per-agent session-start pointers (what to read first)
```

---

## 4. First, figure out which mode you're in

There are two very different situations, and they have different reading orders.

### Mode A — Bootstrapping a brand-new project

The specs in `docs/` are still placeholders and there's no real schema yet.
Your job is to help run the **bootstrapping workflow** documented in
`docs/project_start/`: write the PRD, drive the design through Claude Design,
insert its output, then write the roadmap and build from it (the data contract,
walking skeleton, and auth are the roadmap's opening phases). **Go to §7.**

### Mode B — Building features in an established project

The specs are populated, migrations exist, the walking skeleton and auth are
live. Your job is to ship **vertical slices** under the always-on rules.
**Go to §4.1, then §8.**

> **How to tell which mode you're in:** open [`docs/PRD.md`](PRD.md) and
> [`docs/DATA_CONTRACT.md`](DATA_CONTRACT.md). If they still say _"This file is
> a placeholder"_, you're in Mode A. If they contain real product/entity
> content, you're in Mode B.

### 4.1 Every session begins the same way

Per [`CLAUDE.md`](../CLAUDE.md) / [`GEMINI.md`](../GEMINI.md), at the start of
**every** session read, in order:

1. [`docs/AI_STATUS.md`](AI_STATUS.md) — the project's persistent memory. Check
   `KNOWN_ISSUES` and `SCHEMA_DRIFT_LOG` before touching anything.
2. [`.cursor/rules/06-agent-behaviour.mdc`](../.cursor/rules/06-agent-behaviour.mdc) — conduct, pre-flight, source-of-truth hierarchy.
3. [`.cursor/rules/00-architecture.mdc`](../.cursor/rules/00-architecture.mdc) — stack, forbidden patterns, caching.
4. [`.cursor/rules/05-vertical-slice.mdc`](../.cursor/rules/05-vertical-slice.mdc) — task sequencing and complexity limits.

Then load the **domain** rule file for the work at hand (§6). These rule files
auto-attach in Cursor; if your harness doesn't auto-load them, read them
explicitly — they override default behavior.

---

## 5. The living specs — what's authoritative for what

These documents are the project's truth during ongoing work. The bootstrapping
workflow _produces_ them; feature work _reads_ them.

| Document                                                        | Authoritative for                                                                                                                                                                                                          | Produced by                                                                                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`docs/PRD.md`](PRD.md)                                         | Business rules, user flows, what the product should _do_                                                                                                                                                                   | The coding agent, drafted from the owner's brief via interview (or the human directly) — [`01-writing-the-prd.md`](project_start/01-writing-the-prd.md) |
| [`docs/DATA_CONTRACT.md`](DATA_CONTRACT.md)                     | Entity inventory, relationships, tenancy, RLS notes, route registry, service-role inventory, env-var registry, **Auth shape** — plus each entity's schema and RLS policies until its migration ships and the entry freezes | Claude Code — [`build-reference/data-contract.md`](project_start/build-reference/data-contract.md)                                                      |
| [`docs/DESIGN_TOKENS.md`](DESIGN_TOKENS.md)                     | Concrete color / type / spacing / radius / shadow values                                                                                                                                                                   | Claude Design — [`02-briefing-claude-design.md`](project_start/02-briefing-claude-design.md)                                                            |
| [`docs/COMPONENT_SPEC.md`](COMPONENT_SPEC.md)                   | Per-component token assemblies (Card, Button, Input, …)                                                                                                                                                                    | Claude Design — [`02-briefing-claude-design.md`](project_start/02-briefing-claude-design.md)                                                            |
| [`docs/ROADMAP.md`](ROADMAP.md)                                 | The **active** phased build + feature plan, executed one phase at a time; completed roadmaps are archived in [`docs/roadmaps/`](roadmaps/)                                                                                 | Claude Code — [`04-writing-the-roadmap.md`](project_start/04-writing-the-roadmap.md)                                                                    |
| [`docs/AUTH_SPEC.md`] _(created during bootstrapping)_          | Bound, sourced auth values (routes, roles, onboarding fields)                                                                                                                                                              | Claude Code — [`build-reference/auth.md`](project_start/build-reference/auth.md)                                                                        |
| [`docs/AI_STATUS.md`](AI_STATUS.md)                             | What's actually been built; updated every task; **read first every session**                                                                                                                                               | maintained by you                                                                                                                                       |
| [`docs/PRD_RECONCILIATION.md`] _(created during bootstrapping)_ | Audit trail of how each prototype-surfaced signal was resolved                                                                                                                                                             | Claude Code — [`build-reference/prd-prototype-reconciliation.md`](project_start/build-reference/prd-prototype-reconciliation.md)                        |

> **The "implementation truth" rule.** As a project ages, code drifts from
> specs. For _what the schema currently is_, the generated types
> ([`packages/supabase/src/database.types.ts`](../packages/supabase/src/database.types.ts))
> and the live code win over the docs. For _what the product should do_ and
> _business intent_, the PRD/contract win. The full precedence table and the
> addition-vs-contradiction protocol are in
> [`06-agent-behaviour.mdc` §8](../.cursor/rules/06-agent-behaviour.mdc).
> When sources disagree, **log it in `SCHEMA_DRIFT_LOG` — don't silently pick one.**

---

## 6. The rule files — what governs what

Always-on or glob-attached. Read [`00-architecture.mdc`](../.cursor/rules/00-architecture.mdc) for the full picture; this table is just the map.

| Concern                                          | Rule file                                                                 | The single thing it most exists to prevent              |
| ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| Stack, forbidden patterns, caching, runtime      | [`00-architecture.mdc`](../.cursor/rules/00-architecture.mdc)             | Off-stack choices; caching an authenticated layout      |
| Schema, RLS, migrations, naming                  | [`01-database.mdc`](../.cursor/rules/01-database.mdc)                     | RLS that compiles but silently denies legit reads       |
| Server Actions, API routes, DTOs                 | [`02-api.mdc`](../.cursor/rules/02-api.mdc)                               | Trusting client-supplied identity; leaking service-role |
| Components, tokens, state machines, layout       | [`03-frontend.mdc`](../.cursor/rules/03-frontend.mdc)                     | Hardcoded display values; invented token values         |
| Auth, middleware, Supabase clients, provisioning | [`04-auth.mdc`](../.cursor/rules/04-auth.mdc)                             | `getSession()`; provisioning in the wrong place         |
| Slice methodology, sequencing, granularity       | [`05-vertical-slice.mdc`](../.cursor/rules/05-vertical-slice.mdc)         | Horizontal "DB task + UI task" splits                   |
| Conduct, pre-flight, drift, escalation           | [`06-agent-behaviour.mdc`](../.cursor/rules/06-agent-behaviour.mdc)       | Building before understanding; silent drift             |
| Vercel runtime 500s (`ERR_MODULE_NOT_FOUND`)     | [`07-vercel-deployments.mdc`](../.cursor/rules/07-vercel-deployments.mdc) | Config-thrashing instead of reading the function bundle |

> A `07-brand-voice.mdc` rule file is **created during bootstrapping** from
> Claude Design's brand-voice output (see
> [`03-inserting-the-design.md`](project_start/03-inserting-the-design.md)) — it
> won't exist in a fresh template. Don't be surprised when it appears.

---

## 7. The bootstrapping workflow (`docs/project_start/`) — Mode A

`docs/project_start/` holds a set of **reference guides**, grouped by who reads
them, for taking a project from an idea to a buildable roadmap. Read
[`docs/project_start/00-how-bootstrapping-works.md`](project_start/00-how-bootstrapping-works.md)
first — it is the authoritative explanation of the system and its design
philosophy.

> **History:** this folder used to be a run-once pipeline of ~21 pasted "gem"
> prompts. It was converted to reference documentation once the design work
> moved into Claude Design. If you have old muscle memory for gem numbers
> (`1b`, `3a2`, `4b2`, `5a`), the old→new mapping is in
> `00-how-bootstrapping-works.md`.

**The workflow is six steps.** They are enumerated with their rationale in
[`00-how-bootstrapping-works.md`](project_start/00-how-bootstrapping-works.md)
§"The workflow, in six steps", and as human-facing instructions in the root
[`README.md`](../README.md) §"Start here". Read one of those rather than a third
copy here.

**Step 4 is partly agent work.** The owner creates accounts and pastes secrets;
the coding agent applies the GitHub repository settings (branch protection,
auto-merge, auto-delete) via `gh api` and confirms the Supabase wiring through
the MCP server. The idempotent settings procedure is
[`build-reference/repo-settings.md`](project_start/build-reference/repo-settings.md).

**The guides, by audience:**

| Guide                                                                          | Audience              | Covers                                                                    |
| ------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------- |
| [`00-how-bootstrapping-works.md`](project_start/00-how-bootstrapping-works.md) | everyone              | the system, the philosophy, the old→new map                               |
| [`01-writing-the-prd.md`](project_start/01-writing-the-prd.md)                 | human                 | PRD structure, completeness checklist, `⚑ DATA IMPLICATION` flags         |
| [`02-briefing-claude-design.md`](project_start/02-briefing-claude-design.md)   | human → Claude Design | what to ask Claude Design for, and the exact shape of what it must return |
| [`03-inserting-the-design.md`](project_start/03-inserting-the-design.md)       | human + Claude Code   | where the design output goes and how it's wired into the rules            |
| [`04-writing-the-roadmap.md`](project_start/04-writing-the-roadmap.md)         | Claude Code           | how to author `docs/ROADMAP.md` following the prototype                   |
| [`build-reference/`](project_start/build-reference/)                           | Claude Code           | deep reference for the roadmap's opening phases (below)                   |

**The build folds into the roadmap.** In this flow the data contract, the
walking-skeleton scaffold, and the auth build are not separate pre-steps — they
are the roadmap's **opening phases**. Claude Code executes them from
[`04-writing-the-roadmap.md`](project_start/04-writing-the-roadmap.md), reading
the matching deep-reference doc for each:

- [`build-reference/prd-prototype-reconciliation.md`](project_start/build-reference/prd-prototype-reconciliation.md) — let the prototype correct the PRD before deriving the contract.
- [`build-reference/data-contract.md`](project_start/build-reference/data-contract.md) — build and audit `docs/DATA_CONTRACT.md`.
- [`build-reference/scaffold.md`](project_start/build-reference/scaffold.md) — the walking skeleton.
- [`build-reference/auth.md`](project_start/build-reference/auth.md) — the auth spec, preflight gate, shape-branching build, and doctor.

**Feature execution loop.** Once a roadmap exists, the build is driven by
[`docs/EXECUTOR_PROMPT.md`](EXECUTOR_PROMPT.md): find the first unchecked `[ ]`
**task** in `docs/ROADMAP.md`, execute it, verify (run the Definition of Done
checks), mark it `[x]`, update memory, stop. Repeat. Each coding task is its own
feature branch → PR that merges on green checks and deploys that slice — a phase
ends after its last coding task (there is no per-phase summary task), plus an
`X.98` critical gate only when a later phase depends on a human-only check; polish
rolls into one end-of-roadmap Final UAT — see `05-vertical-slice.mdc`, ADR-0019,
and ADR-0022. Tasks never push to `main` directly. When the last task is checked, the executor closes the roadmap out:
archives it to [`docs/roadmaps/`](roadmaps/) and resets `docs/ROADMAP.md` for the
next roadmap — later bodies of work regenerate it via
[`04-writing-the-roadmap.md`](project_start/04-writing-the-roadmap.md) in
subsequent-roadmap mode. (The `ROADMAP.md` checked in now is an illustrative
sample; the close-out never runs in the template repo itself.)

---

## 8. The feature-development workflow (Mode B)

Once the project is live, every feature follows the **vertical slice** method.
Full detail in [`05-vertical-slice.mdc`](../.cursor/rules/05-vertical-slice.mdc);
the shape is:

1. **Pre-flight (silent).** Start on a fresh branch cut from an up-to-date
   `main` — never build on a merged or stale branch ([`06` §16](../.cursor/rules/06-agent-behaviour.mdc)).
   Then: tech-debt check (`AI_STATUS.md`), understand the goal, search before
   building, locate the contract entry, list what you might break, confirm RLS
   coverage. ([`06` §0](../.cursor/rules/06-agent-behaviour.mdc))
2. **Pre-task self-check + Data Plan.** Verify entity, field, action/RLS, and
   drift coverage; then emit a short Data Plan (columns, RLS predicates, server
   actions) for traceability — not for approval. ([`06` §10](../.cursor/rules/06-agent-behaviour.mdc))
3. **Build the slice end-to-end:** migration (schema + RLS) → server action
   (Zod + `getUser()` + typed result) → UI (tokens + all finite states). One
   cohesive feature, all layers. Splitting into a "DB task" and a separate "UI
   task" is **forbidden**; if a slice is too thick, split it into sequential
   _thin_ slices (Core, then Polish).
4. **Apply the migration.** You _write_ migration files to
   `supabase/migrations/`, then **apply them yourself** via the Supabase MCP
   `apply_migration` tool (credentials in `.env`; never `supabase db push`, never
   a manual Supabase SQL-Editor hand-off). Then regenerate `database.types.ts`
   via the MCP `generate_typescript_types` tool.
5. **Verify before handoff.** Run `turbo run build`, `turbo run typecheck`,
   `turbo run lint` yourself and fix everything. Never ask the user to run
   builds. Note: a green build does **not** verify RLS — run the positive/
   negative RLS smoke tests from [`01` §8](../.cursor/rules/01-database.mdc).
6. **Update memory.** Update `AI_STATUS.md`; sync `DATA_CONTRACT.md`
   immediately if you added/renamed a table, column, DTO, or route.

---

## 9. The "greatest hits" — failure modes that bite hardest

These are the rules whose violation produces _silent_ runtime failures (not
build errors), so they're the ones to burn into memory. Each links to its
authoritative source — read it, don't rely on this summary.

- **Always `getUser()`, never `getSession()`** — anywhere. `getSession()` trusts
  a stale cookie the server will reject. ([`04`](../.cursor/rules/04-auth.mdc))
- **RLS sub-select form is mandatory:** `(SELECT auth.uid())`, never bare
  `auth.uid()`. And every table the feature touches needs a policy for _every_
  operation it performs, or you get silent zero-row denials.
  ([`01` §3–4](../.cursor/rules/01-database.mdc))
- **Tenant isolation depends on the declared Auth shape.** Read the
  `**Auth shape:**` value in `DATA_CONTRACT.md` before writing any tenant-scoped
  policy; the correct predicate differs for solo / single-membership /
  multi-membership. ([`01` §6](../.cursor/rules/01-database.mdc))
- **Never trust client-supplied identity.** Derive `user.id` / `tenant_id` from
  the verified session, never from the request payload.
  ([`02`](../.cursor/rules/02-api.mdc))
- **No mock data, ever.** Every value rendered is either a real DTO field or a
  Shadcn `<Skeleton>`. No hardcoded names, counts, or sample rows — in any
  state. ([`03`](../.cursor/rules/03-frontend.mdc))
- **Visual values come only from design tokens.** No raw palette colors
  (`bg-blue-500`), no arbitrary values (`p-[14px]`). _Structural_ utilities
  (`flex`, `grid`, `max-w-md`, responsive breakpoints) are unrestricted — that
  distinction matters. ([`03`](../.cursor/rules/03-frontend.mdc))
- **Service-role client bypasses all RLS.** It's allowed only for provisioning
  and operations listed in the contract's Service-Role Inventory. Anywhere else
  it's equivalent to disabling auth. ([`02`](../.cursor/rules/02-api.mdc))
- **The Auth Exclusion Zone is off-limits during the skeleton.** `middleware.ts`,
  `lib/supabase/server.ts`/`client.ts`/`admin.ts`, `lib/auth/`, `lib/onboarding/`,
  and routes `/onboarding`, `/settings/members`, `/auth/callback` are owned by
  the auth build. Link to them (disabled, "coming soon") but don't create them.
  ([`04`](../.cursor/rules/04-auth.mdc))
- **The `/auth/callback` route is inert** — it exchanges a code for a session
  and redirects, nothing else. Provisioning happens in the
  `on_auth_user_created` trigger and a `SECURITY DEFINER` function, never in the
  callback. ([`04`](../.cursor/rules/04-auth.mdc))
- **Domain data never lives in global state.** React Query for server state, URL
  params for filters/sorts/pagination. Zustand/Context only for `theme` and
  `sidebarOpen`. ([`00`](../.cursor/rules/00-architecture.mdc))
- **Declare a runtime on every Server Component / route / action**
  (`nodejs` for anything touching the DB; `edge` only with zero DB I/O).
  ([`00`](../.cursor/rules/00-architecture.mdc))

---

## 10. How to decide, and when to ask

The user is **non-technical** and trusts your judgment; they won't read diffs or
commands. So:

- **Default: decide and proceed.** Apply the correct pattern from the rules,
  reuse existing helpers, fix small in-scope discoveries, and summarize plainly
  when done. Don't relay technical micro-decisions for approval.
- **Pause and ask (plain English, one yes/no) only when** the request as stated
  would (1) create a security hole you can't fix silently, (2) break the live
  site / an existing feature in a way that's out of scope to fix, or (3)
  permanently destroy data or remove a shipped feature. A contract or PRD
  _contradiction_ is **not** a refusal: it is a **change request** that costs one
  plain-English confirmation (default yes) and is then routed through the specs —
  never a reason to halt a product change the owner asked for.

Full protocol: [`06` §3](../.cursor/rules/06-agent-behaviour.mdc) (decisions),
[`06` §8 Rule C](../.cursor/rules/06-agent-behaviour.mdc) (addition vs
contradiction), and [`06` §15](../.cursor/rules/06-agent-behaviour.mdc) (the
Product Change Protocol — how an owner's post-v1 change is welcomed and routed
PRD → contract → roadmap → code).

---

## 11. Conventions & current state (read before you assume)

- **Naming:** DB tables/columns are `snake_case`; TypeScript DTOs and JSON are
  `camelCase`. Never expose a raw DB row to the frontend — map it to a DTO and
  strip sensitive fields. Root-level `docs/*.md` files use ALL-CAPS names
  (`PRD.md`, `ROADMAP.md`) — preserve the exact casing.
- **The `@my-app/*` workspace scope is never renamed.** It is internal plumbing
  that every cross-package import depends on. Naming a product means the root
  `package.json` `name` and the web `metadata` (title **and** description) in
  `apps/web/app/layout.tsx` — nothing else. When the owner gives you an app name
  and one-line description (README Step 5), that is the whole job. A half-renamed
  scope breaks the build; a fully renamed one buys nothing.
- **The shared types file is sacred.**
  [`packages/supabase/src/database.types.ts`](../packages/supabase/src/database.types.ts)
  is auto-generated and currently holds an **empty placeholder schema** (no
  tables) — that's correct for a fresh template. It's regenerated after the
  first migration is applied. Never hand-edit it.
- **The specs are placeholders right now.** `PRD.md`, `DATA_CONTRACT.md`,
  `DESIGN_TOKENS.md`, and `COMPONENT_SPEC.md` all say _"this file is a
  placeholder"_ until kickstart fills them. Don't build features against them in
  that state — you're in Mode A.
- **The persistent memory file is [`docs/AI_STATUS.md`](AI_STATUS.md)** — it's what
  `CLAUDE.md`, `GEMINI.md`, all rule files, and the roadmap use. (Older revisions
  referred to a root-level `.ai-status.md`; that name is retired — don't reintroduce it.)
- **The template is web-only.** There is no mobile app, and no rule file governs
  one ([ADR-0005](decisions/0005-mobile-removed-from-template.md)). If the owner
  asks for one, follow
  [`docs/project_start/optional/adding-mobile.md`](project_start/optional/adding-mobile.md)
  and write a mobile ruleset before building features — the web rules describe
  `@supabase/ssr`, middleware, and Server Actions, none of which exist on a device.

---

## 12. Tool & shell discipline (operational)

- Prefer the native file tools (Read / Write / Edit / Glob / Grep) over shell
  pipelines for anything touching the filesystem — they handle Next.js route
  paths like `(app)` and `[tenant]` without escaping and produce no permission
  prompts. Reserve the shell for git, builds, and process control.
- Scope monorepo commands with workspace flags
  (`npx turbo run lint --filter=@my-app/web`), not `cd subdir && …`.
- Don't install npm packages without explicit permission; use what's in
  `package.json`. No `console.log` in production code.

The detailed rationale and the full clean-command catalog are in
[`06` §13](../.cursor/rules/06-agent-behaviour.mdc).

---

## 13. Quick index — "I need to…"

| I need to…                                   | Read                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Know what's been built so far                | [`docs/AI_STATUS.md`](AI_STATUS.md)                                                                         |
| Understand the whole bootstrapping system    | [`docs/project_start/00-how-bootstrapping-works.md`](project_start/00-how-bootstrapping-works.md)           |
| Write a migration / RLS policy               | [`01-database.mdc`](../.cursor/rules/01-database.mdc)                                                       |
| Write a Server Action or API route           | [`02-api.mdc`](../.cursor/rules/02-api.mdc)                                                                 |
| Build a component or page                    | [`03-frontend.mdc`](../.cursor/rules/03-frontend.mdc) + `DESIGN_TOKENS.md` + `COMPONENT_SPEC.md`            |
| Touch auth, middleware, or a Supabase client | [`04-auth.mdc`](../.cursor/rules/04-auth.mdc)                                                               |
| Scope or sequence a feature                  | [`05-vertical-slice.mdc`](../.cursor/rules/05-vertical-slice.mdc)                                           |
| Know how to behave / when to ask             | [`06-agent-behaviour.mdc`](../.cursor/rules/06-agent-behaviour.mdc)                                         |
| Debug a Vercel production 500                | [`07-vercel-deployments.mdc`](../.cursor/rules/07-vercel-deployments.mdc) + [`docs/playbooks/`](playbooks/) |
| Find an entity, DTO, route, or env var       | [`docs/DATA_CONTRACT.md`](DATA_CONTRACT.md)                                                                 |
| Know what the product should do              | [`docs/PRD.md`](PRD.md)                                                                                     |
| Apply the GitHub repo settings (Step 4)      | [`build-reference/repo-settings.md`](project_start/build-reference/repo-settings.md)                        |
| Name the app (title + description + package) | [§11 above](#11-conventions--current-state-read-before-you-assume)                                          |

---

_This guide describes the template's structure as a map. It is intentionally
non-authoritative: the rule files and specs it points to are the source of
truth. If you change how the system works, update those files — then update
this map._
