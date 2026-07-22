# Roadmap — Principles alignment

**Status:** active (installed 2026-07-22, replacing the completed Design Precision Programme,
now archived at [`docs/roadmaps/0001-design-precision-programme.md`](roadmaps/0001-design-precision-programme.md)).
Generated in subsequent mode per [`docs/project_start/04-writing-the-roadmap.md`](project_start/04-writing-the-roadmap.md).

**Read order for a fresh conversation:** this file →
[`docs/specs/principles-alignment.md`](specs/principles-alignment.md) (the audit + evidence
behind every task) → [`docs/PRINCIPLES.md`](PRINCIPLES.md) (the charter) →
[ADR-0008](decisions/0008-adopt-principles-charter.md) (adoption).

## What this is

Close the gaps found auditing plano against the charter. This is **meta work** (CI, repo
settings, docs, ADRs), so the single sizing rule is **one concern = one PR — no vertical
slices**. Tasks are ordered by risk of losing work or data: merge-pipeline integrity first,
then data safety, then self-repair, then hand-over quality. Each task **ports the template's
proven mechanism** where one exists (template ADRs cited); it does not invent a plano-specific
design. Plano is an active project already running a nightly heavy tier and a full ratchet
set, so this is reconciliation and gap-filling — right-sized, not a fresh fleet.

Only the coding agent flips `[ ]` → `[x]`, one task per PR through the normal auto-merge flow.
When the last task is checked, run the close-out (archive this file to `docs/roadmaps/`, reset
per [`docs/roadmaps/README.md`](roadmaps/README.md)).

---

## Phase 0 — Owner prerequisites (human-only)

These are the only steps that need the owner; each takes under a minute. The agent cannot do
them because they require accounts, money, or secret values. Later tasks that depend on one say
so.

- [ ] **0.1 — Data backups decision (unblocks 2.1).** Supabase is on the **free plan**, which
  has **no backups and no point-in-time recovery** — today a bad migration or delete is
  unrecoverable. Decide: **upgrade Supabase to a paid tier** (turns on daily backups + PITR),
  **or** tell the agent to set up **scripted daily backups** instead.
- [ ] **0.2 — Sentry project + DSN (unblocks 3.2).** Create a Sentry project and hand the agent
  the DSN to set as `VITE_SENTRY_DSN` in Vercel, so live errors are actually captured. (Or say
  "set up Sentry" and the agent walks you through the one signup step.)
- [ ] **0.3 — Anthropic credits.** Top up when convenient — the nightly AI-review job fails
  until then. No other action needed.

---

## Phase 1 — Merge-pipeline integrity (principles 4, 5)

Protects against losing *work* (stalled or mis-merged PRs). Both are quick settings/CI changes.

- [x] **1.1 — Drop strict status checks.** Port template **ADR-0021**: set `strict: false` on
  `main`'s required-checks protection so auto-merge never stalls on a stale or stacked branch
  (this session hit that stall repeatedly). Write the plano ADR. **Verify:** a PR that is behind
  `main` still auto-merges without a manual branch update.
- [ ] **1.2 — Fail-closed auto-merge preflight.** Port template **ADR-0028**: make
  `automerge.yml` read `main`'s `protected` boolean and refuse to arm auto-merge if protection
  is off (today it arms best-effort with `|| true`). Write the plano ADR.

---

## Phase 2 — Data safety (principle 7)

> ⚠️ **Highest-severity gap in the audit.** With no backups on the free plan, there is zero
> recoverability. Phase 1's tasks are 5-minute settings changes; do them, then treat this as
> the next thing that happens — before any further destructive database change.

- [ ] **2.1 — Data-safety rails.** Gated on **0.1**. If upgrading Supabase: verify PITR/daily
  backups are on and document it. If staying on free tier: add a **scheduled daily `pg_dump`**
  of production to off-Supabase storage and a **pre-destructive-migration `pg_dump` restore
  point**. Either way, add the restore-point + rehearsal checklist to
  [`docs/RUNBOOK.md`](RUNBOOK.md) and reconcile its "no local Supabase" line with the charter's
  rehearsal clause. Mark the *automated* restore-point mechanism as **"adopt the template's
  pattern once it lands"** (the template has not built it yet; note that pattern assumes a paid
  tier, so on free tier the scripted `pg_dump` fallback is what ships). Write the plano ADR.

---

## Phase 3 — Self-repair & production watching (principles 9, 8)

- [ ] **3.1 — Session pipeline-health check.** Port template **ADR-0026**: add a §0
  session-start routine to `.cursor/rules/06-agent-behaviour.mdc` that checks for stalled PRs,
  red `main`, open `nightly-failure` issues, silently disabled crons, and drifted repo settings
  — and repairs them before new work (plano's current §0 is a task pre-flight, not this). Write
  the plano ADR. Also diagnose the open nightly `E2E` failure (issue #1572) and make the
  `review` job treat Anthropic credit-exhaustion as a skip, not a hard failure, so benign
  causes stop paging.
- [ ] **3.2 — Production error-tracking ADR + docs.** Gated on **0.2**. Port template
  **ADR-0008** shape: document Sentry (already wired client-side) in
  [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) and [`docs/RUNBOOK.md`](RUNBOOK.md), write the plano
  ADR, and confirm the prod DSN is live. Server-side (SSR) capture optional.

---

## Phase 4 — Hand-over quality (principles 10, 11)

- [ ] **4.1 — Charter ↔ ADR reconciliation.** Update the charter's "In practice" pointers to
  plano's real ADR numbers (or add a crosswalk table), resolving all 17 dangling ADR citations
  and the §15 Product Change Protocol reference. Confirm `docs/decisions/README.md` is complete.
- [ ] **4.2 — ADR backfill.** Record existing-but-undocumented mechanisms as ADRs: the
  data-layer import boundary, the raw-hex / design-token guard, the gitleaks secret scan, the
  types-staleness gate, and the risk-based-UAT convention (principle 2).
- [ ] **4.3 — (Optional) additional hand-over gates.** Port, if wanted: a dead-code gate (knip,
  template ADR-0007), a contract-drift check (template ADR-0012), and a coverage-floor ratchet
  (template ADR-0006). Nice-to-haves — plano is already well-ratcheted; drop any that aren't
  worth the CI cost.

---

## Final UAT

One sitting at the end of the roadmap. The agent provides the evidence; the owner confirms the
business claims in minutes:

- The pipeline still merges unattended (a test PR auto-merges while behind `main`).
- A backup safety net exists (a restore point can be produced before a destructive migration).
- Production errors show up somewhere the owner can see them (a test error reaches Sentry).
