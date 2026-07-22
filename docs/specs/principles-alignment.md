# Spec — Principles alignment

**Companion to:** [`docs/PRINCIPLES.md`](../PRINCIPLES.md) (the charter) and
[ADR-0008](../decisions/0008-adopt-principles-charter.md) (its adoption).
**Status:** audit complete 2026-07-22; updated the same day with the owner's answers on
Supabase plan, Sentry DSN, and Anthropic credits (see principles 7–9 and the owner-actions
list). Remediation roadmap is now **active** in [`docs/ROADMAP.md`](../Roadmap.md). This is a
deep-reference spec, not a source of truth — the charter is the *why*, the ADRs are the *what*,
`.cursor/rules/` are the *how*.

This document audits each of the charter's 11 principles against plano's actual state —
its docs, rules, CI, git hooks, ratchets, **and live GitHub/infra state** (branch
protection, auto-merge history, workflow states, open issues/PRs, Sentry wiring, Vercel,
Supabase) as of 2026-07-22 — and specifies what must change. It changes no behavior itself;
each gap is closed by its own later PR.

## Reference implementations

Where a principle is already solved in the owner's **template** repo
(`jaimenoain/template`, `docs/decisions/`), the remediation **ports the template's proven
mechanism** rather than inventing one. The relevant template ADRs are cited inline. One
principle — **7, data safety** — is not yet implemented in the template either; its task is
therefore "adopt the template's pattern once it lands," not an original design.

---

## Verdict summary

| # | Principle | Verdict |
|---|-----------|---------|
| 1 | The owner is the CEO, not an engineer | **Aligned** |
| 2 | Owner time is the project's scarcest input | **Partial** |
| 3 | Permission is business consent, not technical consent | **Aligned** |
| 4 | `main` is the only long-lived branch | **Partial** |
| 5 | Gates are boring; judgment is advisory | **Aligned** (minor) |
| 6 | Frugal by default | **Aligned** |
| 7 | Data is sacred; code is expendable | **Missing** |
| 8 | The system watches production, not just the pipeline | **Partial** |
| 9 | The system repairs and maintains itself on a clock | **Partial** |
| 10 | The repo is the only memory | **Aligned** (minor) |
| 11 | Built to be handed over | **Partial** |

**Cross-cutting finding.** `docs/PRINCIPLES.md` was copied verbatim from the template, so
**all 17 of its `ADR-00NN` citations use the template's numbering** (0008, 0014, 0015,
0017–0021, 0025, 0028, 0031, 0033, 0035, 0036). None of these exist in plano, which has an
independent 0001–0007 sequence on unrelated subjects. The charter's *prose* pointers
(`.cursor/rules/06-agent-behaviour.mdc`, `docs/AI_STATUS.md`) resolve fine; every ADR
pointer is dangling or mis-directed. Reconciled by roadmap task 4.1.

---

## Per-principle detail

### 1. The owner is the CEO, not an engineer — Aligned
- **Current state.** Encoded behaviourally. `.cursor/rules/06-agent-behaviour.mdc` §3
  ("Make the Call — Ask Only When It Matters") plus the user-level operating instructions
  push all technical judgment to the agent and reserve owner questions for 5-second
  business calls.
- **Evidence.** `06-agent-behaviour.mdc` §3 present; §13 (tool-call efficiency) present.
- **What must change.** Nothing structural. The charter's `ADR-0014 (agent-first manual
  tasks)` cite is dangling (task 4.1).

### 2. Owner time is the project's scarcest input — Partial
- **Current state.** The risk-based UAT model (per-phase `X.98` gate only when a later
  phase depends on it, plus one end-of-roadmap Final UAT, each with an evidence pack) is
  imported as convention in `docs/project_start/04-writing-the-roadmap.md`. It is followed
  in practice but not recorded as a plano decision.
- **Evidence.** `04-writing-the-roadmap.md` describes automation-first and risk-based UAT;
  no plano ADR records it. Charter cites template `ADR-0015`/`ADR-0019` — both dangling.
- **What must change.** Low urgency: the convention is present and working. Formalizing it
  as a plano ADR is folded into the ADR backfill (task 4.2); pointer fix in task 4.1.

### 3. Permission is business consent, not technical consent — Aligned
- **Current state.** `06-agent-behaviour.mdc` §3 and §13 encode "never ask technical
  permission; ask only when the outcome needs an owner decision." Reinforced by the
  user-level operating instructions.
- **Evidence.** Both rule sections present.
- **What must change.** Nothing.

### 4. `main` is the only long-lived branch — Partial
- **Current state (strong).** Live check: `main` is protected (`enforce_admins: true`, no
  force-push, no deletion, 10 required checks). Auto-merge is allowed and *works* — recent
  history shows PRs merged by `github-actions[bot]`. `delete_branch_on_merge` is on and a
  daily `sweep-merged-branches` workflow backstops it. Ephemeral branches + worktree
  lifecycle are codified (ADR-0007).
- **Gaps (live evidence).**
  1. Required status checks are **`strict: true`** (branch must be up-to-date before merge).
     For stacked/parallel PRs this stalls auto-merge until a manual `gh pr update-branch`.
     The template deliberately sets **`strict: false`** for exactly this reason (template
     **ADR-0021**).
  2. `automerge.yml` arms auto-merge best-effort (`|| true`) with **no fail-closed check
     that `main` is actually protected** before arming — the template's preflight refuses
     if protection is off (template **ADR-0028**).
- **What must change.** Roadmap tasks 1.1 (drop strict) and 1.2 (fail-closed preflight).

### 5. Gates are boring; judgment is advisory — Aligned (minor)
- **Current state.** Required PR checks are fast, deterministic, mechanical (lint,
  typecheck, unit tests, migrations lint, ratchets, secret scan, RLS coverage, types
  staleness). Judgment-shaped work (AI review, full E2E) runs on the nightly tier and files
  `nightly-failure` / `ai-review` issues instead of blocking (plano ADR-0006). `advisory`
  and on-demand `ai-review` never block.
- **Minor gap.** `Build` is a required blocking check; the template moves build off the PR
  tier into nightly (template **ADR-0033**, static-only PR tier). Keeping build as a gate is
  defensible; noted for consideration, not urgent. The `strict: true` posture (task 1.1) also
  touches this principle.
- **What must change.** Optional (task 4.3 / consideration in task 1.1).

### 6. Frugal by default — Aligned
- **Current state.** The nightly `guard` job self-skips the heavy tier when `main` hasn't
  moved since the last successful run; scheduled jobs (nightly, branch sweep) run daily, not
  per-event; the blocking PR tier is static checks. Matches plano ADR-0006.
- **What must change.** Nothing.

### 7. Data is sacred; code is expendable — **Missing** (highest data risk)
- **Current state.** No mechanism exists for an automatic restore point before a
  destructive/irreversible DB operation, no verification that Supabase point-in-time
  recovery is enabled, and no destructive-migration rehearsal step. `docs/RUNBOOK.md` states
  "There is no local Supabase: the app always runs against the hosted Supabase project,"
  which directly contradicts the charter's "destructive migrations are rehearsed against a
  local copy."
- **⚠️ Confirmed by owner (2026-07-22): Supabase is on the FREE plan, which does not support
  daily backups or point-in-time recovery at all.** So there is currently **zero backup
  coverage** — a bad migration or accidental delete against production is unrecoverable. This
  is the single largest risk in the audit, and the free-plan reality means the fix cannot be
  a simple "turn PITR on"; it is a business choice plus a scripted fallback.
- **Evidence.** Grep across `docs/` for backup / PITR / restore-point / rehearse finds only
  tangential hits; no script, no ADR, no RUNBOOK procedure. **The template has not
  implemented this principle either** (its ADR-0036 notes P7–P9 are adopted ahead of
  implementation).
- **What must change.** Roadmap task 2.1, now shaped by the free-plan constraint:
  1. **Owner decision (owner action 1):** either upgrade Supabase to a paid tier to unlock
     PITR/daily backups, **or** accept scripted logical backups as the safety net. Until one
     of these exists, treat every destructive migration as unrecoverable.
  2. If staying on free tier: add a **scheduled logical backup** (a daily `pg_dump` of
     production to off-Supabase storage) and a **pre-destructive-migration `pg_dump` restore
     point** — this is the concrete substitute for the automatic restore point the charter
     assumes.
  3. Add the restore-point + rehearsal checklist to `docs/RUNBOOK.md` and reconcile the "no
     local Supabase" line. Mark the *automated* restore-point mechanism as **"adopt the
     template's pattern once it lands"** — but note the template's pattern will assume a paid
     Supabase tier, so on free tier the scripted `pg_dump` fallback is what actually ships.

### 8. The system watches production, not just the pipeline — Partial
- **Current state.** Sentry is wired: `src/lib/sentry.ts` (`initSentry`), called from
  `src/entry.client.tsx`; `setSentryUser` in `src/root.tsx`; error boundaries
  (`AppErrorBoundary`, `WidgetErrorBoundary`, `MapErrorBoundary`). It is an env-gated no-op
  unless `VITE_SENTRY_DSN` is set.
- **⚠️ Confirmed by owner (2026-07-22): `VITE_SENTRY_DSN` is NOT set in production.** Since
  Sentry is a no-op without a DSN, production error tracking is currently **effectively off** —
  live errors are silently dropped. So this principle is failing *in practice today*, not just
  under-documented.
- **Gaps.** (a) **No DSN in prod** → capture is off right now (owner action 2: create a Sentry
  project and set the DSN). (b) **Client-only** (`@sentry/react`) — no server/SSR-side capture.
  (c) **Undocumented** — absent from `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md`; no ADR (the
  charter's `ADR-0008 (production error tracking)` cite is dangling). (d) No uptime monitor.
- **What must change.** Roadmap task 3.2: write the error-tracking ADR (porting template
  **ADR-0008** shape), document Sentry in ARCHITECTURE/RUNBOOK, verify prod DSN (owner
  action); server-side capture optional.

### 9. The system repairs and maintains itself on a clock — Partial
- **Current state.** The nightly `alert` job opens/updates a `nightly-failure` issue on
  failure — the unattended-merge safety signal (plano ADR-0006). The daily branch sweep runs.
- **Gaps.**
  1. **No session-start pipeline-health check.** The charter's principle-9 cite —
     "the session pipeline health check (`06-agent-behaviour.mdc` §0)" — does not exist:
     plano's §0 is a task pre-flight ("Think Before You Build"), not a stalled-PR / red-main /
     failure-issue triage. The template has this (its **ADR-0026** + §0 item).
  2. No guard against silently disabled crons (GitHub auto-disables scheduled workflows after
     ~60 days of inactivity) or drifted repo settings.
  3. **Live proof of unrepaired rot (as found 2026-07-22):** the Nightly workflow had been
     **red on `main` since 2026-07-16** (open issue **#1572**), and PR **#1576** had been
     **stalled 5 days**. Both are now addressed:
     - **PR #1576 — fixed and merging.** It was net-new root-cause work (a DB trigger + backfill
       keeping `auth.users` metadata in sync with `profiles.username`), *not* superseded. It was
       blocked because its migration touched `supabase/migrations/` without the required
       types regen, and it carried two number collisions (an ADR numbered `0007`, now
       `worktree-lifecycle`, and a migration `20271174…`, now the pagination migration). It was
       rebased onto main, both numbers freed (ADR → `0009`, migration → `20271176…`), and the
       migration correctly marked `-- types-neutral:` (it changes no schema, only a
       function/trigger/backfill). **Note: merging lands the migration in the repo; it still
       has to be *applied* to production for the 7 drifted accounts to be corrected** — a
       separate step needing Supabase access.
     - **Nightly red (#1572):** the `review` job fails because the Anthropic account is out of
       credits (owner confirmed a top-up is pending — owner action 3), and the `E2E` job fails
       separately. The credit-exhaustion failure is transient; the E2E failure needs a look
       during roadmap task 3.1. A hardening follow-up: make the nightly `review` job treat
       credit exhaustion as a skip, not a hard failure, so it stops opening `nightly-failure`
       issues for a known-benign cause.
- **What must change.** Roadmap task 3.1: port the template's session pipeline-health check
  (**ADR-0026**) into `06-agent-behaviour.mdc` §0, diagnose the nightly `E2E` failure, and make
  the `review` job credit-exhaustion-tolerant.

### 10. The repo is the only memory — Aligned (minor)
- **Current state.** `docs/AI_STATUS.md`, `docs/PRD.md`, `docs/DATA_CONTRACT.md`, the ADR
  series, and the roadmaps/archive convention are all present and disciplined.
- **Minor gaps.** The charter cites a "Product Change Protocol (§15)" but
  `06-agent-behaviour.mdc` ends at §14; `docs/decisions/README.md` index was missing 0007
  (fixed in this PR); `docs/specs/` did not exist (bootstrapped by this file).
- **What must change.** Pointer reconciliation (task 4.1); the §15 reference is folded into
  that task.

### 11. Built to be handed over — Partial
- **Current state.** Debt/warning/file-size/strict-allowlist/RLS ratchets all enforce
  improve-only (plano ADR-0003); boring mainstream stack; ADRs for structural choices.
- **Gaps.** (a) **No dead-code gate** — the charter cites `ADR-0007` for it, but plano's
  0007 is worktree lifecycle; the template's dead-code gate is knip (template ADR-0007). (b)
  Coverage is configured in `vitest.config.ts` (json-summary "feeds any future automated
  coverage ratchet") but **not ratcheted** (template ADR-0006). (c) No contract-drift gate
  (template ADR-0012) though `DATA_CONTRACT.md` is large. (d) Several live mechanisms lack
  ADRs (data-layer import boundary, raw-hex/token guard, gitleaks scan, types-staleness).
- **What must change.** Roadmap tasks 4.1 (pointers), 4.2 (ADR backfill), 4.3 (optional gates).

---

## Roadmap — now active in `docs/ROADMAP.md`

**Promoted 2026-07-22** into [`docs/ROADMAP.md`](../Roadmap.md) — the repo's single
active-roadmap slot — replacing the completed Design Precision Programme, now archived at
[`docs/roadmaps/0001-design-precision-programme.md`](../roadmaps/0001-design-precision-programme.md).

`docs/ROADMAP.md` is the **authoritative task list**: Phase 0 (owner prerequisites) → Phase 1
(merge-pipeline integrity) → Phase 2 (data safety) → Phase 3 (self-repair & production
watching) → Phase 4 (hand-over quality), one concern = one PR, risk-ordered, each porting the
template's proven mechanism. This spec is the companion audit — the "what must change" notes
per principle above reference the roadmap's phase-task IDs (e.g. task 2.1, 3.1). The grouped
owner actions below are Phase 0 of the roadmap, kept here with their business rationale.

## Owner actions (grouped — plain English)

Updated 2026-07-22 with the owner's answers.

1. **Data backups (principle 7) — the important one.** Supabase is on the free plan, which
   has **no backups and no point-in-time recovery**, so right now a bad migration or delete is
   unrecoverable. Decide: **upgrade Supabase to a paid tier** (turns on daily backups + PITR),
   **or** tell the agent to set up **scripted daily backups** instead. Either way, this should
   happen before the next destructive database change.
2. **Sentry (principle 8).** The production error-tracking key (`VITE_SENTRY_DSN`) is not set,
   so live errors are currently invisible. To turn it on: create a Sentry project and give the
   agent the DSN to put in Vercel (or say "set up Sentry" and it will walk you through the
   one signup step).
3. **Anthropic credits (principle 9).** Top up when convenient — the nightly AI-review job
   fails until then (owner noted a top-up is coming). No action needed beyond the top-up.
4. **PR #1576 — done, no action needed.** The agent fixed and merged it (it was real
   root-cause work, not a duplicate). One residual: the data fix it contains still needs to be
   *applied* to the production database to correct the ~7 affected accounts — the agent can do
   that once it has Supabase access.
