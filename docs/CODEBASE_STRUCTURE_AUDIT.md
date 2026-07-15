# Codebase Structure Audit

**Date:** 2026-06-13
**Scope:** Full structural analysis of the Plano repository — architecture, governance,
data layer, types, complexity, database/migrations, build/tooling, and tests.
**Status:** Analysis only. No code or configuration was changed to produce this report.

> **How this was produced.** A read-only audit across ten dimensions (repository hygiene,
> governance-doc drift, feature-slice architecture, data/service layer, type safety,
> complexity hotspots, database/migrations, routing/SSR/API, build/tooling/state, and
> testing) produced ~76 findings. Every quantitative claim below was re-verified directly
> against the source tree; reproduction commands are listed in
> [Appendix: verify it yourself](#appendix-verify-it-yourself).

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [What actually happened (the core narrative)](#2-what-actually-happened-the-core-narrative)
3. [The real architecture (for reference)](#3-the-real-architecture-for-reference)
4. [Top risks, ranked by leverage](#4-top-risks-ranked-by-leverage)
5. [Findings by theme](#5-findings-by-theme)
6. [Remediation roadmap](#6-remediation-roadmap)
7. [Appendix: verify it yourself](#appendix-verify-it-yourself)

---

## 1. Executive summary

Plano is a **React Router v7 SSR application** (Vite-built, deployed on Vercel) backed by
Supabase, organised as a feature-sliced codebase: ~702 TypeScript/TSX files across 26 feature
domains, plus 467 SQL migrations and 19 Supabase edge functions.

The codebase has **good bones** — a clean feature-slice layout, TanStack Query for server
state, shadcn/Radix for UI, a (recently restored) CI quality gate, and a well-diagnosed
SSR/caching story. It is not the product of bad engineering.

It is, however, the product of **rapid feature growth on top of inherited foundations, with no
governing strategy and — until twelve days ago — no automated guardrails.** Four structural
facts explain almost every problem in this report:

| # | Root condition | Consequence |
|---|---|---|
| 1 | The project was **pivoted from a different product** (a group viewing/voting app). | The generated DB types are a *"legacy snapshot"* of the old database; the migration history carries a whole foreign schema. |
| 2 | The **governance docs describe an architecture that does not exist** (Turborepo / Next.js / React Router v6 SPA). | Every human and AI contributor is mis-steered — the engine of ongoing drift. |
| 3 | The **CI quality gate was added 2026-06-02** (~12 days ago); TS strict mode is still off. | The entire feature-explosion period ran with no typecheck/lint/test/build gate. |
| 4 | The **database is migrated by hand** in the Supabase SQL Editor. | No pipeline, no collision detection, no post-migration type regen → a long tail of schema-drift incidents. |

**The work ahead is to install the governance and guardrails that growth outran — not to
rewrite the application.** The recommended sequence (Section 6) front-loads cheap, high-leverage
fixes (correct the docs, stop committing artifacts, add the missing lint/migration gates) before
the larger structural work (type soundness, service-layer boundaries, god-file decomposition,
migration baselining, test backfill).

**Finding counts:** 13 critical · 23 high · 29 medium · 11 low.

---

## 2. What actually happened (the core narrative)

Plano isn't messy because of careless work — it's messy because of its **origin** and a
**governance vacuum**.

**It was pivoted from a different product.** The earliest migrations create `group_sessions`,
`polls`, `watchlist`, `ranking_sparkline`, `group_cycles`, `group_backlog`, and an
un-timestamped `add_slug_to_groups.sql` — the schema of a group viewing/voting app, not an
architecture catalog. Plano was built on top of that database's history, and crucially on top of
its generated types. The header of the hand-maintained types file still calls the generated file
the *"legacy generated snapshot."* This single fact is the root of the type-safety problem.

**The governance docs describe a codebase that does not exist.** `CLAUDE.md` and `GEMINI.md`
(near-identical) describe a Turborepo with `apps/web`, `apps/mobile`, and `packages/supabase` —
none of which exist. The source-of-truth hierarchy points at
`packages/supabase/src/database.types.ts`, a path that is not in the repo. `.cursor/rules/00-architecture.mdc`
states the stack is a "React 18 SPA, client-side rendering only, `src/main.tsx` → `src/App.tsx`,
React Router v6" — but `main.tsx` and `App.tsx` **do not exist** (the real entry points are
`src/root.tsx`, `src/entry.client.tsx`, `src/entry.server.tsx`), the app is React Router **v7
with SSR**, and there are six app-owned `/api/*` routes even though the rule says there is "no
app-owned HTTP API." `.cursor/rules/02-api.mdc` is, in its entirety, a **Next.js + Prisma +
Server Actions** ruleset (`'use server'`, `revalidatePath`, `createServerClient`, Edge runtime) —
a framework this project never used. These are inherited template/boilerplate rules that were
never adapted. They don't just fail to help; they **actively mislead**, which is the precise
mechanism by which drift accumulated unchallenged.

**There were no automated guardrails during the growth phase.** The CI workflow that runs
typecheck → lint → test → build was committed on 2026-06-02, on the current
`chore/green-ci-gates` branch. Before that, nothing blocked a regression from merging. And the
type checker is still running in lenient mode (`"strict": false`, `"noImplicitAny": false`).

**The database is changed by hand.** All 467 migrations are applied manually in the Supabase SQL
Editor; 34 are still flagged "needs apply" in `AI_STATUS.md`. There is no apply pipeline, no
timestamp-collision check, and no step that regenerates the TypeScript types after a migration —
so the generated types fall further behind with every schema change, and code reaches for
`(supabase as any)` to compensate.

Everything else in this report is downstream of these four conditions.

---

## 3. The real architecture (for reference)

Because the committed docs are wrong, here is the actual stack as it exists today:

| Concern | Reality |
|---|---|
| Framework | **React Router v7 with SSR** (`@react-router/dev`, `@vercel/react-router`) |
| Entry points | `src/root.tsx` (SSR document), `src/entry.client.tsx`, `src/entry.server.tsx` |
| Routing | `app/routes.ts` (route manifest, ~122 route/layout entries) |
| Build | `react-router build` (Vite under the hood) + a Vercel manifest-cache postbuild patch |
| Data loading | Route `*.loader.ts` files (SSR loaders) + TanStack Query in components |
| App-owned API | 6 resource routes (`*.route.ts`): `/api/version`, `/api/feedback`, `/api/admin/events-discover`, `/api/embassy/{building-research,research-queue,event-search}` |
| Backend | Supabase (Postgres/PostGIS + Auth + Storage + 19 Edge Functions) |
| Server state | TanStack Query; one Zustand store (`itinerary`, UI state only) |
| UI | Tailwind + shadcn/Radix; design tokens |
| Code layout | `src/features/<domain>/{api,components,hooks,pages,types,…}` × 26 domains; `src/{components,lib,hooks,utils,pages,integrations,types}` |
| Deploy | Vercel; canonical origin is the apex `plano.app` |

> Two vestigial top-level directories survive from the pre-SSR structure: `app/` (containing
> only `routes.ts`) and `api/` (containing only `sitemap-proxy.ts`).

---

## 4. Top risks, ranked by leverage

1. **Governance docs lie about the architecture** — every contributor (human and AI) is
   mis-steered. This is the engine of ongoing drift, and the cheapest thing to fix. *(Theme A)*
2. **Manual, collision-prone migration process** — silent schema drift and recurring production
   500s. *(Theme E)*
3. **Stale generated types + 97 `(supabase as any)` casts** — the data layer has no
   compile-time safety net. *(Theme C)*
4. **No service-layer boundary** — 35 components query Supabase directly; schema changes ripple
   across the UI uncontrollably. *(Theme D)*
5. **The service layer and the most-active features are untested.** *(Theme H)*
6. **God-files** concentrate change-risk in a handful of 1,500–4,300-LOC screens. *(Theme F)*
7. **~22 MB of build artifacts are committed**, and an **apex service-worker redirect** prevents
   some users self-healing from stale code. *(Themes B, I)*

---

## 5. Findings by theme

Severity: 🔴 critical · 🟠 high · 🟡 medium · ⚪ low. Effort: S / M / L / XL.

### Theme A — Governance docs describe a fictional architecture 🔴

The single highest-leverage problem in the codebase: the documents contributors are told to
treat as source-of-truth are wrong, and wrongness in the "always-active" rules propagates into
every task.

| Sev | Finding | Evidence |
|---|---|---|
| 🔴 | `CLAUDE.md` / `GEMINI.md` describe a non-existent Turborepo monorepo | Both claim `apps/web`, `apps/mobile`, `packages/supabase`; none exist. No turbo, no Next.js, no workspaces in `package.json`. |
| 🔴 | Source-of-truth path is wrong | 3 docs cite `packages/supabase/src/database.types.ts`; real path is `src/integrations/supabase/types.ts`. |
| 🔴 | `00-architecture.mdc` describes the wrong framework | Claims "React 18 SPA, client-only, `src/main.tsx` → `src/App.tsx`, React Router v6, no app-owned API". `main.tsx`/`App.tsx` don't exist; stack is RR v7 SSR with 6 API routes. |
| 🟠 | `02-api.mdc` is an entire Next.js/Prisma/Server-Actions ruleset | `'use server'`, `revalidatePath`, `createServerClient`, `export const runtime = 'edge'`, Prisma TCP — none used here. |
| 🟠 | `06-agent-behaviour.mdc` tells agents to run `turbo run build` | Real build is `react-router build`. |
| 🟠 | Three overlapping agent-instruction files drift apart | `CLAUDE.md` ≡ `GEMINI.md`, but `AGENTS.md` differs; no mechanism keeps them in sync. |

**Why it hurts:** these files are loaded as first-line context on every task. A contributor (or
agent) following them looks for files that aren't there, runs commands that don't exist, and
applies patterns for the wrong framework — producing the very drift this audit documents.

**Recommendation:** Rewrite `CLAUDE.md` and `.cursor/rules/00`, `02`, `06` to describe the real
stack; collapse `CLAUDE.md`/`GEMINI.md`/`AGENTS.md` into one canonical governance doc (generate
LLM-specific variants from it if needed); fix every `packages/supabase/...` reference. *(S–M,
very high leverage.)*

---

### Theme B — Repository hygiene: ~22 MB of committed artifacts 🔴

| Sev | Finding | Evidence |
|---|---|---|
| 🔴 | `coverage/` committed — 16 MB, 477 files | A full HTML coverage report is tracked; it is stale (it even contains `src/App.tsx.html` from the pre-SSR layout). |
| 🟠 | AI-context / working dumps committed | `repomix-code.xml` + `repomix-output.xml` (~1 MB each), `migrations-repomix.xml` (2.8 MB), `search-backend-extract.txt` (304 KB), `cards-context.txt` (56 KB), `mobile_feed_layout.png`. (The stale root `.ai-status.md` dump was removed 2026-07-15 — canonical status lives in `docs/AI_STATUS.md`.) |
| 🟠 | Dual lockfiles, no declared package manager | `bun.lockb` **and** `package-lock.json` both tracked; no `packageManager` field; CI uses `npm ci`. Divergence-prone. |
| 🟠 | `tsconfig*.tsbuildinfo` tracked despite being in `.gitignore` | `.gitignore` has `*.tsbuildinfo`, but the files were committed before the pattern was added and never `git rm --cached`-ed. |
| 🟡 | `design-system/` committed — 392 KB, 478 files | Preview HTML, JSX mockups, duplicate icons; reads like a separate project (`SKILL.md`). |
| ⚪ | Vestigial `app/` and `api/` dirs; `scratch/`; `extract.sh` | Single-file leftovers from the old structure; clutter that misdirects where new code should go. |

**Why it hurts:** every clone/fetch drags ~22 MB of dead weight; the stale `coverage/` and
repomix dumps masquerade as current; dual lockfiles risk silent local/CI divergence.

**Recommendation (matches the chosen posture):** extend `.gitignore` and `git rm --cached` these
paths so they stop being tracked **going forward, keeping git history** (no `filter-repo`
rewrite). Declare one package manager via the `packageManager` field and delete the other
lockfile. Confirm `app/`/`api/` are unreferenced before removing them.

---

### Theme C — Type-safety erosion (stale generated types) 🔴

| Sev | Finding | Evidence |
|---|---|---|
| 🔴 | Generated types are a stale snapshot of the **old** DB | `src/integrations/supabase/types.ts` (4,981 LOC); header of its companion file calls it the *"legacy generated snapshot."* New Plano tables/RPCs are missing. |
| 🔴 | 143 `as any` in `src` (116 in production code); 97 are `(supabase as any)` | Casting the client to bypass the missing types. Hotspots: `embassy/api/taskFeed.ts` (21), `embassy/pages/ChapterProjects.tsx` (16), `admin/api/programme.ts` (13), `embassy/pages/Tasks.tsx` (10), `embassy/pages/Contribute.tsx` (7). |
| 🟠 | The "workaround" types file is orphaned | `src/integrations/supabase/plano-tables.types.ts` (1,881 LOC) has **zero imports** — it's dead code; the real workaround is the `as any` casts. |
| 🟠 | TypeScript is not strict | `tsconfig.app.json`: `"strict": false`, `"noImplicitAny": false`. Once a value is `as any`, nothing downstream is checked. |
| — | The casts evade the lint gate | `@typescript-eslint/no-explicit-any` is `error`, yet 116 production casts pass CI — the rule targets `any` *annotations*, not `as any` *assertions*. |

**Why it hurts:** the data layer — where the bugs actually live (wrong RPC args, renamed
columns, missing functions) — has no compile-time safety. Many documented production incidents
(e.g. `b.n` vs `b.community_preview_url`, enum-rename mismatches) are exactly the class a sound
type system would have caught.

**Recommendation:** make `gen-types` part of the post-migration flow, regenerate `types.ts` from
the *current* database, then **delete** the orphaned `plano-tables.types.ts`. Introduce a typed
RPC wrapper and burn down the 97 client casts. Flip `strict: true` incrementally (capture a
baseline, fix file-by-file).

---

### Theme D — Data/service layer leakage 🟠

The stated rule — *"Services own all Supabase queries; components never call `supabase.from()`
directly"* — is widely violated.

| Sev | Finding | Evidence |
|---|---|---|
| 🟠 | 35 component/page `.tsx` files query Supabase directly (~112 call sites) | Worst: `profile/pages/Profile.tsx` (25), `buildings/pages/ReviewDetails.tsx` (14). Inline in effects/handlers, untyped, not reusable. |
| 🟠 | FK-embed fragility persists | The recurring `PGRST200` (ambiguous relationship) / `PGRST203` (overloaded function) incidents in `AI_STATUS.md`; ~10 unguarded `profiles(...)`-style embeds remain live. |
| 🟡 | Inconsistent error handling across ~31 service files | Some throw, some return `[]`, some swallow silently; no shared error/DTO contract or PostgREST-code → user-message translation. |

**Why it hurts:** business logic and RLS assumptions bleed into the UI; a schema change forces a
grep-and-pray sweep across dozens of components; cache invalidation and error UX are
inconsistent; components are hard to test without mocking Supabase per file.

**Recommendation:** add an eslint `no-restricted-imports` rule banning the Supabase client
outside `**/api/**` and loaders (this is the guardrail that was missing); migrate inline queries
into typed service functions incrementally, starting with the hotspots; define one error/DTO
contract.

---

### Theme E — Database & migrations fragility 🔴

| Sev | Finding | Evidence |
|---|---|---|
| 🔴 | 467 migrations applied **manually** in the SQL Editor | No pipeline, no audit trail; 34 still flagged "needs apply" in `AI_STATUS.md`. |
| 🔴 | ~69 files share colliding timestamps across 33 prefixes | The Supabase tracker silently applies one file per timestamp and skips the rest — the documented root cause of several production incidents (e.g. the `credit_role_enum` rename that never reached prod). Plus a non-timestamped `add_slug_to_groups.sql` that can never apply. |
| 🟠 | Recurring `GRANT EXECUTE` loss on `DROP+CREATE` of RPCs | Causes 403/500s; `AI_STATUS.md` documents repeated re-do migrations to restore grants. |
| 🟠 | Per-row `SECURITY DEFINER` calls hit the 8 s `statement_timeout` | The leaderboard RPC needed a forensic set-based rewrite after three failed fix cycles. |
| 🟠 | 467 un-squashed migrations (incl. the prior product's schema), no baseline | Recreating a dev DB replays every fix-on-fix; "what is the schema now?" requires reading 467 files. |

**Why it hurts:** schema state is non-deterministic between code and database; production calls
RPCs/columns that may never have been applied; there is no record of who applied what, when.

**Recommendation:** rename colliding files to unique timestamps and add a pre-commit
collision check; add a CI `supabase db push` step gated on changes to `supabase/migrations`;
adopt an RPC migration template that always re-`REVOKE`/`GRANT`s and prefers set-based bodies;
create a squashed baseline behind a cutoff date. *(Sequence carefully — this is the largest
single workstream.)*

---

### Theme F — Complexity hotspots / god-files 🟠

| Sev | File | LOC | What it conflates |
|---|---|---|---|
| 🔴 | `embassy/pages/Contribute.tsx` | 3,093 | 21 inline sub-tools, 24 `useQuery`, 8 `useMutation` in one file |
| 🔴 | `buildings/pages/BuildingDetails.tsx` + `hooks/useBuildingInteractions.ts` | 2,947 + 1,380 = **4,327** | One screen; the hook alone holds 36 `useState` and exports 40+ values |
| 🔴 | `profile/pages/Profile.tsx` | 1,517 | 31 `useState`, 25 inline `supabase` calls, 0 `useQuery` |
| 🟠 | `search/hooks/useBuildingSearch.ts` | 1,484 | 39 `useState` spanning 5 concerns (location, distance, filtering, map, feed) |

**58 files exceed 500 LOC (8.3%); 23 exceed 800 LOC.** There is no size budget or decomposition
guideline, so reviewers have nothing to push back against.

**Why it hurts:** change-risk concentrates in a few files; nothing inside them is independently
testable; merge conflicts cluster there.

**Recommendation:** **mechanical extraction, not rewrites** — pull inline sub-components into
files, split mega-hooks by concern, push queries into services. Publish a soft size budget
(e.g. pages ≤ 800, components ≤ 400, data hooks ≤ 300 LOC) as a **non-blocking** CI warning used
as a decomposition signal.

---

### Theme G — Feature-slice inconsistency & coupling 🟡

| Sev | Finding | Evidence |
|---|---|---|
| 🟠 | Inconsistent internal structure across 26 features | Some have `{api,components,hooks,pages,types}`; `guides/` has loose files; `itinerary/` has only `stores/`; only `maps`/`admin` have `constants/`. No two are identical. |
| 🟠 | No stable public API per slice | Only ~8–12 of 26 features expose a barrel `index.ts`; ~99% of cross-feature imports are deep paths into another feature's internals. |
| 🟠 | Hub coupling with no boundary rules | `credits`, `auth`, and `admin` are each imported by 8–10 other features; `admin` is an 85-file catch-all (dashboard + moderation + programme + ambassadors + …). |
| 🟡 | Stray pages | 8 pages live in `src/pages/` while 142 live in `features/*/pages/`, with no rule for which goes where. |

**Recommendation:** define and document a canonical slice template; add eslint module-boundary
rules (deep cross-feature imports → barrels only); hoist shared `credits`/`auth` types into
`src/lib`; relocate the stray pages; plan a split of the `admin` catch-all by concern.

---

### Theme H — Testing gaps 🟠

| Sev | Finding | Evidence |
|---|---|---|
| 🟠 | 14 of 26 features have **zero** tests | Including the entire `embassy` / `ambassadors` / `events` surface — the area that generates almost all the schema-drift incidents. |
| 🟠 | The service layer is barely tested | Only **3 of 23** `api/` service files have a colocated test — the exact layer where bugs originate is the least covered. |
| 🟡 | Suite was recently red; gate is new; no floor | 47 tests were failing as of 2026-05-24 (mock drift), just repaired to green; the CI test step is ~12 days old; no coverage threshold; the stale `coverage/` report is committed. |

> Test files are concentrated in `credits` (22), `maps` (20), `profile` (17), `search` (12),
> `buildings` (11) — i.e. the older, more stable features — while the actively-churning embassy
> surface has none.

**Recommendation:** prioritise tests where incidents actually occur — the service layer, the
embassy RPC wrappers, and the critical loaders (`BuildingDetails`, `Profile`, feed). Add a modest
coverage floor once the suite is stable.

---

### Theme I — Routing / SSR / PWA (mostly healthy, watch items) 🟡

This area is the **success story** — the stale-content sagas were diagnosed well and fixed
(loaders guard `s-maxage` behind `.data` requests so the CDN never caches HTML; a pre-hydration
kill-switch escapes stale service workers). Remaining items:

| Sev | Finding | Evidence |
|---|---|---|
| 🔴 (infra) | Apex service-worker redirect blocks self-healing | `plano.app` 307-redirects `/sw.js` to `www`; per spec a redirected SW script is a hard update failure, so apex-registered SWs can never update. **Vercel dashboard fix, not a code change.** |
| 🟡 | PWA update machinery is complex and untested | Three concurrent update layers (`updatefound`, `controllerchange`, version poll) with no tests for the escape paths. |
| ⚪ | `react-force-graph-2d` is an unused dependency | Zero imports in `src`. |
| ⚪ | `maplibre-gl` / `recharts` not code-split | Heavy libraries bundled beyond the routes that need them. |

**Recommendation:** fix the apex `/sw.js` redirect in Vercel (verify auth/OAuth callback
allow-lists cover the apex first); add integration tests for the PWA escape paths; drop the
unused dependency; lazy-load the map/chart routes.

---

## 6. Remediation roadmap

Ordered by **leverage (impact per unit effort)**. Phase 0 is cheap and safe; later phases are
larger and should be sequenced, not done all at once. *(Nothing here was executed for this
report.)*

### Phase 0 — Hygiene & truth *(days; low-risk; highest leverage)*
- **Correct the governance docs** to the real stack (Theme A): rewrite `CLAUDE.md` +
  `.cursor/rules/00`, `02`, `06`; collapse `CLAUDE`/`GEMINI`/`AGENTS` into one; fix every
  `packages/supabase/...` reference.
- **Stop committing artifacts** (Theme B): `.gitignore` + `git rm --cached` the ~22 MB
  (**keep history**); declare one package manager and delete the other lockfile.
- **Delete dead code**: orphaned `plano-tables.types.ts`; unused `react-force-graph-2d`; the
  vestigial `app/`/`api/` dirs (after confirming they're unreferenced).

### Phase 1 — Guardrails *(the gates that were missing)*
- eslint **module-boundary** + `no-restricted-imports` (ban the Supabase client outside
  `api/`/loaders) (Themes D, G).
- **Migration collision check** (pre-commit) + a **CI `supabase db push`** step + an RPC
  template that always re-`GRANT`s (Theme E).
- **Post-migration `gen-types`** discipline; regenerate `types.ts`; begin the incremental flip to
  TS `strict` (Theme C).
- Confirm CI secrets are configured; add a **non-blocking file-size warning** (Theme F).

### Phase 2 — Type soundness & service layer
- Typed RPC wrapper; burn down the 97 `(supabase as any)` casts; one error/DTO contract; extract
  the 35 components' inline queries into services, starting with `Profile.tsx` and
  `ReviewDetails.tsx` (Themes C, D).

### Phase 3 — Structural consolidation
- Canonical feature-slice template + barrels; hoist shared `credits`/`auth` types; relocate
  stray `src/pages`; split the `admin` catch-all (Theme G).
- Mechanically decompose the god-files: `Contribute`, `BuildingDetails` + hook, `Profile`,
  `useBuildingSearch` (Theme F).

### Phase 4 — Migration baseline & test backfill
- Create a squashed migration baseline behind a cutoff; backfill tests on the service layer,
  the embassy RPCs, and the critical loaders (Themes E, H).
- **Infra (outside the repo):** fix the apex → www `/sw.js` redirect (Theme I).

---

## Appendix: verify it yourself

Every quantitative claim above is reproducible read-only from the repo root:

```bash
# Committed build artifacts (~22 MB): coverage report, repomix dumps, etc.
git ls-files | grep -E '^coverage/|repomix|\.tsbuildinfo$|search-backend-extract|cards-context'

# Migration timestamp collisions (prefixes used by >1 file)
ls supabase/migrations | grep -oE '^[0-9]+' | sort | uniq -d

# The docs' claimed entry points do not exist; the real ones do
ls src/main.tsx src/App.tsx          # → No such file or directory
ls src/root.tsx src/entry.client.tsx src/entry.server.tsx

# Type-safety: total casts, and the Supabase-client subset
grep -rn 'as any' src --include='*.ts' --include='*.tsx' | grep -vE '\.test\.|/test/' | wc -l   # 116
grep -rn 'supabase as any' src --include='*.ts' --include='*.tsx' | wc -l                       # 97
grep -rL . src/integrations/supabase/plano-tables.types.ts >/dev/null; \
  grep -rl 'plano-tables' src | grep -v 'plano-tables.types.ts' | wc -l                         # 0 imports (orphaned)

# Service-layer leakage: components calling Supabase directly
grep -rl 'supabase.from(' src --include='*.tsx' | wc -l                                         # 35 files

# TS is not strict
grep -E '"strict"|"noImplicitAny"' tsconfig.app.json                                            # both false

# Tests: features with zero tests, and service-file coverage
for d in src/features/*/; do n=$(find "$d" -name '*.test.*' | wc -l); [ "$n" -eq 0 ] && echo "$d"; done   # 14 of 26
find src/features/*/api -name '*.test.ts' | wc -l                                               # 3 (of 23 service files)

# Pivot evidence: the prior product's schema lives in the migration history
ls supabase/migrations | grep -E 'group_sessions|polls|watchlist|ranking_sparkline|add_slug_to_groups'

# Governance docs reference a stack that isn't here
grep -rn 'apps/web\|packages/supabase\|createBrowserRouter\|turbo run build\|use server' CLAUDE.md GEMINI.md .cursor/rules/
```
