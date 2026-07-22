# Roadmap — Principles alignment (COMPLETED)

**Status:** completed 2026-07-23. Installed 2026-07-22 (replacing the Design Precision
Programme, [`0001-design-precision-programme.md`](0001-design-precision-programme.md)); closed
out 2026-07-23 when the owner descoped the one optional task. Archived here per
[`docs/roadmaps/README.md`](README.md).

---

## Delivery Record

**What this roadmap was.** Close the gaps found auditing plano against the operating-principles
charter ([`docs/PRINCIPLES.md`](../PRINCIPLES.md), adopted in
[ADR-0008](../decisions/0008-adopt-principles-charter.md)). Meta work — CI, repo settings,
docs, ADRs — risk-ordered: merge-pipeline integrity → data safety → self-repair → hand-over
quality. The audit and per-principle evidence live in
[`docs/specs/principles-alignment.md`](../specs/principles-alignment.md).

**What shipped.**

- **Phase 1 — merge-pipeline integrity.** 1.1 dropped strict status checks
  ([ADR-0010](../decisions/0010-drop-strict-status-checks.md)); 1.2 made the auto-merge
  preflight fail closed ([ADR-0011](../decisions/0011-fail-closed-automerge-preflight.md)).
- **Phase 2 — data safety (highest-severity gap).** 2.1 shipped data-safety rails on the free
  tier — scheduled encrypted `pg_dump` backups + a pre-destructive-migration restore point,
  with the RUNBOOK checklist and "no local Supabase" reconciliation
  ([ADR-0012](../decisions/0012-data-safety-rails.md)). Gated on owner decision 0.1 (owner
  chose scripted backups over a paid upgrade).
- **Phase 3 — self-repair & production watching.** 3.1 added the session-start pipeline-health
  check ([ADR-0013](../decisions/0013-session-pipeline-health-check.md)) and made the nightly
  `review` job tolerate Anthropic credit exhaustion; 3.2 documented and verified production
  error tracking via Sentry ([ADR-0014](../decisions/0014-production-error-tracking.md)),
  DSN set live in Vercel (owner action 0.2).
- **Phase 4 — hand-over quality.** 4.1 reconciled the charter's dangling ADR/§ pointers to
  plano's real numbers (crosswalk in `PRINCIPLES.md`). 4.2 backfilled ADRs for the five
  enforced-but-undocumented mechanisms:
  [0015](../decisions/0015-data-layer-import-boundary.md) (import boundary),
  [0016](../decisions/0016-design-token-guard.md) (design-token guard),
  [0017](../decisions/0017-gitleaks-secret-scan.md) (gitleaks scan),
  [0018](../decisions/0018-types-staleness-gate.md) (types-staleness gate),
  [0019](../decisions/0019-risk-based-uat.md) (risk-based UAT).

**What was descoped.** **4.3 (optional additional hand-over gates)** — a dead-code gate (knip),
a contract-drift check, and a coverage-floor ratchet. Owner declined 2026-07-23: plano is
already well-ratcheted and the extra CI cost wasn't judged worth it. Any of the three can be
picked up later as its own roadmap task.

**Open owner item (non-blocking).** **0.3 — Anthropic credits.** The nightly AI-review job
fails until the owner tops up the account; hardened in 3.1 so credit exhaustion no longer pages
as a `nightly-failure`. This is an account top-up, not project work, and did not block delivery.

**Final UAT.** The three business claims were confirmed by evidence from the shipped tasks:
the pipeline merges unattended while behind `main` (1.1, exercised repeatedly incl. this
roadmap's own PRs), a backup safety net / restore point exists (2.1), and production errors
reach Sentry (3.2, verified live). Presented to the owner at close-out.

**Specs moved.** None relocated; `docs/specs/principles-alignment.md` remains the standing
companion audit.

---

## Original roadmap (as executed)

## Phase 0 — Owner prerequisites (human-only)

- [x] **0.1 — Data backups decision (unblocks 2.1).** Owner chose scripted daily backups
  (2026-07-22); implemented in task 2.1.
- [x] **0.2 — Sentry project + DSN (unblocks 3.2).** Done 2026-07-22: owner created the Sentry
  project + set `VITE_SENTRY_DSN` in Vercel Production; verified live.
- [ ] **0.3 — Anthropic credits.** Owner to top up when convenient — the nightly AI-review job
  fails until then; hardened in 3.1 so it no longer pages. Non-blocking; carried forward as a
  standing owner action.

## Phase 1 — Merge-pipeline integrity (principles 4, 5)

- [x] **1.1 — Drop strict status checks** (ADR-0010).
- [x] **1.2 — Fail-closed auto-merge preflight** (ADR-0011).

## Phase 2 — Data safety (principle 7)

- [x] **2.1 — Data-safety rails** — scheduled `pg_dump` backups + pre-destructive-migration
  restore point + RUNBOOK checklist (ADR-0012). Gated on 0.1.

## Phase 3 — Self-repair & production watching (principles 9, 8)

- [x] **3.1 — Session pipeline-health check** (ADR-0013); nightly `review` made
  credit-exhaustion-tolerant.
- [x] **3.2 — Production error-tracking ADR + docs** (ADR-0014); prod DSN verified live. Gated
  on 0.2.

## Phase 4 — Hand-over quality (principles 10, 11)

- [x] **4.1 — Charter ↔ ADR reconciliation.**
- [x] **4.2 — ADR backfill** — ADRs 0015–0019; README index + `PRINCIPLES.md` crosswalk
  reconciled.
- [x] **4.3 — (Optional) additional hand-over gates.** → **Descoped 2026-07-23 (owner
  decision).** Dead-code gate (knip), contract-drift check, and coverage-floor ratchet not
  pursued.

## Final UAT

Confirmed at close-out (see Delivery Record above):

- The pipeline still merges unattended (a test PR auto-merges while behind `main`). ✓
- A backup safety net exists (a restore point can be produced before a destructive migration). ✓
- Production errors show up somewhere the owner can see them (a test error reaches Sentry). ✓
