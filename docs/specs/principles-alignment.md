# Spec — Principles alignment

**Companion to:** [`docs/PRINCIPLES.md`](../PRINCIPLES.md) (the charter) and
[ADR-0008](../decisions/0008-adopt-principles-charter.md) (its adoption).
**Status:** audit complete 2026-07-22; remediation **queued** (see the roadmap at the
end). This is a deep-reference spec, not a source of truth — the charter is the *why*, the
ADRs are the *what*, `.cursor/rules/` are the *how*.

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
pointer is dangling or mis-directed. Reconciled by roadmap task 6.

---

## Per-principle detail

### 1. The owner is the CEO, not an engineer — Aligned
- **Current state.** Encoded behaviourally. `.cursor/rules/06-agent-behaviour.mdc` §3
  ("Make the Call — Ask Only When It Matters") plus the user-level operating instructions
  push all technical judgment to the agent and reserve owner questions for 5-second
  business calls.
- **Evidence.** `06-agent-behaviour.mdc` §3 present; §13 (tool-call efficiency) present.
- **What must change.** Nothing structural. The charter's `ADR-0014 (agent-first manual
  tasks)` cite is dangling (task 6).

### 2. Owner time is the project's scarcest input — Partial
- **Current state.** The risk-based UAT model (per-phase `X.98` gate only when a later
  phase depends on it, plus one end-of-roadmap Final UAT, each with an evidence pack) is
  imported as convention in `docs/project_start/04-writing-the-roadmap.md`. It is followed
  in practice but not recorded as a plano decision.
- **Evidence.** `04-writing-the-roadmap.md` describes automation-first and risk-based UAT;
  no plano ADR records it. Charter cites template `ADR-0015`/`ADR-0019` — both dangling.
- **What must change.** Low urgency: the convention is present and working. Formalizing it
  as a plano ADR is folded into the ADR backfill (task 7); pointer fix in task 6.

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
- **What must change.** Roadmap tasks 1 (drop strict) and 2 (fail-closed preflight).

### 5. Gates are boring; judgment is advisory — Aligned (minor)
- **Current state.** Required PR checks are fast, deterministic, mechanical (lint,
  typecheck, unit tests, migrations lint, ratchets, secret scan, RLS coverage, types
  staleness). Judgment-shaped work (AI review, full E2E) runs on the nightly tier and files
  `nightly-failure` / `ai-review` issues instead of blocking (plano ADR-0006). `advisory`
  and on-demand `ai-review` never block.
- **Minor gap.** `Build` is a required blocking check; the template moves build off the PR
  tier into nightly (template **ADR-0033**, static-only PR tier). Keeping build as a gate is
  defensible; noted for consideration, not urgent. The `strict: true` posture (task 1) also
  touches this principle.
- **What must change.** Optional (task 8 / consideration in task 1).

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
- **Evidence.** Grep across `docs/` for backup / PITR / restore-point / rehearse finds only
  tangential hits; no script, no ADR, no RUNBOOK procedure. **The template has not
  implemented this principle either** (its ADR-0036 notes P7–P9 are adopted ahead of
  implementation).
- **What must change.** Roadmap task 3: verify PITR/backups are ON in Supabase (owner
  action), add a pre-destructive-migration restore-point + rehearsal checklist to the
  RUNBOOK, reconcile the "no local Supabase" contradiction, and mark the *automated*
  restore-point mechanism as **"adopt the template's pattern once it lands."**

### 8. The system watches production, not just the pipeline — Partial
- **Current state.** Sentry is wired: `src/lib/sentry.ts` (`initSentry`), called from
  `src/entry.client.tsx`; `setSentryUser` in `src/root.tsx`; error boundaries
  (`AppErrorBoundary`, `WidgetErrorBoundary`, `MapErrorBoundary`). It is an env-gated no-op
  unless `VITE_SENTRY_DSN` is set.
- **Gaps.** (a) **Client-only** (`@sentry/react`) — no server/SSR-side capture. (b)
  **Undocumented** — absent from `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md`; no ADR (the
  charter's `ADR-0008 (production error tracking)` cite is dangling). (c) Whether the prod
  DSN is actually set is unverified (owner action). (d) No uptime monitor.
- **What must change.** Roadmap task 5: write the error-tracking ADR (porting template
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
  3. **Live proof of unrepaired rot:** the Nightly workflow has been **red on `main` since
     2026-07-16** (open issue **#1572**, `review` + `E2E` jobs failing), and PR **#1576** has
     been **stalled 5 days** — auto-merge armed but the required `Types staleness` check
     failing (migration touched without regenerating `src/integrations/supabase/types.ts`;
     it may also be superseded by the merged #1573/#1574).
- **What must change.** Roadmap task 4: port the template's session pipeline-health check
  (**ADR-0026**) into `06-agent-behaviour.mdc` §0, and repair the current red nightly (#1572).
  PR #1576's fate is an owner decision (owner action 3).

### 10. The repo is the only memory — Aligned (minor)
- **Current state.** `docs/AI_STATUS.md`, `docs/PRD.md`, `docs/DATA_CONTRACT.md`, the ADR
  series, and the roadmaps/archive convention are all present and disciplined.
- **Minor gaps.** The charter cites a "Product Change Protocol (§15)" but
  `06-agent-behaviour.mdc` ends at §14; `docs/decisions/README.md` index was missing 0007
  (fixed in this PR); `docs/specs/` did not exist (bootstrapped by this file).
- **What must change.** Pointer reconciliation (task 6); the §15 reference is folded into
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
- **What must change.** Roadmap tasks 6 (pointers), 7 (ADR backfill), 8 (optional gates).

---

## Proposed roadmap (QUEUED)

> **Not active yet.** `docs/ROADMAP.md` (one file; `docs/Roadmap.md` is the same inode on
> the case-insensitive macOS FS) currently holds the **Design Precision Programme**, whose
> phases are all shipped but which has not been closed out and archived. Per the owner's
> instruction this roadmap is **queued behind it**, not written into `docs/ROADMAP.md`.
>
> **To activate:** first close out the Design Precision Programme per
> [ADR-0016 convention](../roadmaps/README.md) (cap it with a Delivery Record, archive to
> `docs/roadmaps/0001-<slug>.md`, reset `docs/ROADMAP.md` to the blank scaffold), then
> generate this roadmap into the clean `docs/ROADMAP.md` following
> `docs/project_start/04-writing-the-roadmap.md` in subsequent mode.

This is **meta work** (CI / settings / docs / ADRs), so **one concern = one PR** — no
vertical slices. Tasks are ordered by risk of losing work or data: pipeline integrity
first, then data safety, then self-repair, then hand-over quality. Each task **ports the
template's proven mechanism** where one exists. Plano is an active project already carrying
a nightly heavy tier and a full ratchet set, so this is reconciliation and gap-filling,
right-sized — not a fresh fleet.

**Pipeline integrity & branch protection (principles 4, 5)**

- [ ] **Task 1 — Drop strict status checks.** Port template **ADR-0021**: set `strict:
  false` on `main`'s required-checks protection so auto-merge never stalls on a stale or
  stacked branch. Write the plano ADR. (Verify: a behind-`main` PR still auto-merges.)
- [ ] **Task 2 — Fail-closed auto-merge preflight.** Port template **ADR-0028**: make
  `automerge.yml` read `main`'s `protected` boolean and refuse to arm auto-merge if
  protection is off. Write the plano ADR.

**Data safety (principle 7) — before any destructive DB operation**

- [ ] **Task 3 — Data-safety rails.** Confirm Supabase point-in-time recovery / daily
  backups are ON (owner action 1). Add a pre-destructive-migration restore-point +
  rehearsal checklist to `docs/RUNBOOK.md` and reconcile its "no local Supabase" line with
  the charter's rehearsal clause. Mark the *automated* restore-point mechanism as **"adopt
  the template's pattern once it lands"** (the template has not built it yet). Write the
  plano ADR.

**Self-repair & production watching (principles 9, 8)**

- [ ] **Task 4 — Session pipeline-health check.** Port template **ADR-0026**: add a §0
  session-start routine to `06-agent-behaviour.mdc` that checks for stalled PRs, red `main`,
  open `nightly-failure` issues, silently disabled crons, and drifted repo settings — and
  repairs them before new work. Write the plano ADR. Repair the current red nightly (#1572)
  as the first exercise of it.
- [ ] **Task 5 — Production error-tracking ADR + docs.** Port template **ADR-0008** shape:
  document Sentry in `docs/ARCHITECTURE.md` and `docs/RUNBOOK.md`, write the plano ADR,
  verify the prod DSN is set (owner action 2). Server-side capture optional.

**Hand-over quality (principles 10, 11)**

- [ ] **Task 6 — Charter ↔ ADR reconciliation.** Update the charter's "In practice"
  pointers to plano's real ADR numbers (or add a crosswalk table), resolving all 17 dangling
  cites and the §15 Product Change Protocol reference. Confirm `docs/decisions/README.md` is
  complete.
- [ ] **Task 7 — ADR backfill.** Record existing-but-undocumented mechanisms as ADRs:
  data-layer import boundary, raw-hex / design-token guard, gitleaks secret scan,
  types-staleness gate, and the risk-based-UAT convention (principle 2).
- [ ] **Task 8 — (Optional, lower priority) additional hand-over gates.** Port, if desired:
  dead-code gate (knip, template ADR-0007), contract-drift check (template ADR-0012),
  coverage-floor ratchet (template ADR-0006). Nice-to-haves — plano is already
  well-ratcheted.

## Owner actions (grouped — each under a minute, plain English)

1. **Supabase backups (principle 7).** Confirm point-in-time recovery / daily backups are
   turned on in the Supabase dashboard. This is the safety net for all customer data.
2. **Sentry (principle 8).** Confirm the production error-tracking key (`VITE_SENTRY_DSN`)
   is set in Vercel, so live errors are actually captured rather than silently dropped.
3. **Stalled PR #1576 (principle 9).** Decide: finish it, or close it as already-superseded
   by the merged #1573/#1574? One yes/no.
4. **Nightly AI review (principle 9).** Confirm the `ANTHROPIC_API_KEY` secret is set if you
   want the nightly AI-review job to run green.
