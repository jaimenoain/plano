# Principles — the charter this factory is built on

This document is the constitution of the template. It records the operating
principles the owner has agreed to, in plain language, so that every future
change to the system can be tested against them.

**How the layers relate:** this document says _why_, the ADRs in
`docs/decisions/` say _what was decided_, the rules in `.cursor/rules/` say
_how to act on a task_, and CI enforces what can be enforced. A proposed
change that serves no principle — or fights one — needs the owner's explicit
sign-off, surfaced as a business decision. Changing a principle itself
requires an ADR that supersedes [ADR-0008](decisions/0008-adopt-principles-charter.md).

---

## 1. The owner is the CEO, not an engineer

The owner is strictly non-technical and never performs a technical task —
any task delegated to them will be done poorly, and that is the system's
failure, not theirs. The agent owns all infrastructure work end to end.
Questions to the owner are business questions, in plain English, answerable
in five seconds with a yes or no.

_In practice:_ `.cursor/rules/06-agent-behaviour.mdc` §3 (make the call,
ask only when it matters) plus the user-level operating instructions — encoded
behaviourally, no plano ADR.

## 2. Owner time is the project's scarcest input

Every human check that a test can replace ships as a test. The human checks
that survive are batched: a mid-roadmap gate only when later work genuinely
depends on it, and one Final UAT sitting per roadmap for everything else.
Every UAT request arrives with an evidence pack — the link to click, what to
expect, screenshots — so the sitting takes minutes and tests the business
claim, nothing else.

_In practice:_ the automation-first, risk-based UAT convention in
`docs/project_start/04-writing-the-roadmap.md` — followed but not yet recorded as a
plano ADR (backfill is roadmap task 4.2).

## 3. Permission is business consent, not technical consent

The agent never asks "may I run this command / edit this file / connect to
this service". It asks only when the _outcome_ needs an owner decision:
destroying data the owner did not ask to destroy, materially changing what
users see, spending real money, or accepting a security trade-off. The
confirmation before a destructive, irreversible operation is deliberate
protection, not friction — it stays.

_In practice:_ `.cursor/rules/06-agent-behaviour.mdc` §3 and §13.

## 4. `main` is the only long-lived branch; machines open, merge, and clean up

Work rides ephemeral, single-concern branches that live minutes to hours:
cut from a just-updated `main`, landed by auto-merge the moment CI is green,
deleted on merge. The owner never opens, reviews, or merges a PR. There is
no `dev` branch and no human merge step — controlling when customers see a
change is a _deployment_ decision (staged deploys, one-sentence promotion,
agent-drafted release notes), never a git decision. Drift is a function of
branch lifetime, so branch lifetime is kept near zero.

_In practice:_ `AGENTS.md` §5 (ephemeral single-concern PRs, no human merge step),
ADR-0005 + ADR-0011 (auto-merge on green, fail-closed preflight), ADR-0007
(worktrees only for parallel sessions, dying with their PR).

## 5. Gates are boring; judgment is advisory

There is no human reviewer, so a flaky or slow blocking check does not add
safety — it silently stalls the factory. Required checks are fast,
deterministic, and mechanical. Judgment-shaped verification (AI review,
full e2e, subjective quality) runs on the nightly tier and files issues
instead of blocking merges. A red gate is never cleared by weakening the
gate.

_In practice:_ the guardrails posture across ADR-0003/0006/0010/0013 (no single
plano ADR), ADR-0010 (no strict status checks), ADR-0006 (nightly heavy tier).

## 6. Frugal by default

CI minutes, API calls, and service tiers are real money the product has not
earned yet. The PR tier runs only cheap static checks; everything heavy runs
nightly and skips itself when `main` has not moved; scheduled jobs run daily,
not per-event.

_In practice:_ ADR-0006 (nightly heavy tier that self-skips when `main` has not
moved, and the static-only PR tier) — plano folds the CI-cost posture into ADR-0006.

## 7. Data is sacred; code is expendable

Any code the agent loses can be regenerated in an hour; customer data cannot
be regenerated at all. Every destructive or irreversible database operation
is preceded by an automatic restore point; point-in-time recovery is
verified during project setup; destructive migrations are rehearsed against
a local copy before touching production.

_In practice:_ ADR-0012 (data-safety rails — scheduled encrypted backups plus a
pre-destructive-migration restore point on the free tier).

## 8. The system watches production, not just the pipeline

The owner must never be the person who discovers the live site is broken —
customers reporting to the CEO is the most expensive error channel there is.
Runtime errors and uptime feed the same find-and-fix loop as CI failures.

_In practice:_ ADR-0014 (production error tracking) plus the scheduled
self-repair loop (principle 9).

## 9. The system repairs and maintains itself on a clock

Stalled PRs, red pipelines, aging dependencies, silently disabled cron
workflows, drifted repo settings: all of these are found and fixed by
scheduled runs, not by waiting for a human to start a session. Unattended
rot is a defect of the system, never of the owner.

_In practice:_ the nightly tier's failure issues (ADR-0006), the session
pipeline-health check (`06-agent-behaviour.mdc` §0, recorded as ADR-0013), the
branch sweep (ADR-0005 plus the daily `sweep-merged-branches` workflow).

## 10. The repo is the only memory

Sessions end and context evaporates. Any decision, known issue, or piece of
project state that lives only in a conversation is already lost. Everything
a future agent session — or a future human developer — needs is in the
repository: PRD, data contract, ADRs, status file, roadmaps.

_In practice:_ `docs/AI_STATUS.md` discipline (`06-agent-behaviour.mdc` §9), ADR
discipline (`AGENTS.md` "Boring technology" plus `docs/decisions/`), the Product
Change Protocol (`docs/AGENT_GUIDE.md`).

## 11. Built to be handed over

Boring mainstream technology, small well-organised files, a predictable
layout, ratchets that only move in the improving direction, and an ADR for
every structural choice. The success test: a professional developer taking
over the codebase should be productive quickly — and should not want to
rebuild it.

_In practice:_ the boring-technology rule (`AGENTS.md` "Boring technology"), the
debt ratchet (ADR-0003; a coverage-floor ratchet is not yet built — roadmap task
4.3), the dead-code gate (not yet built — roadmap task 4.3).

---

## Template → plano ADR crosswalk

This charter was ported from the owner's `jaimenoain/template` repo, so its original
_In practice:_ lines cited the **template's** ADR numbers. Plano keeps its own independent
0001–0014 sequence (ADRs are never renumbered once accepted — ADR-0002). The prose above has
been rewritten to plano's real pointers; this table records the lineage and is the canonical
map for anyone comparing plano against the template. "Rules only" means the mechanism lives in
`.cursor/rules/` / `AGENTS.md` rather than an ADR; "roadmap 4.x" means the plano ADR is a
planned backfill.

| Template ADR (as cited) | Subject | Plano resolution |
|---|---|---|
| ADR-0036 | principles charter | **ADR-0008** (adopt-principles-charter) |
| ADR-0014 | agent-first manual tasks | rules only (`06-agent-behaviour.mdc` §3 + user-level ops) |
| ADR-0015 | automation-first UAT | convention in `project_start/04-writing-the-roadmap.md`; ADR backfill = roadmap 4.2 |
| ADR-0019 | risk-based UAT | as above — roadmap 4.2 |
| ADR-0017 / 0018 | clean-branch loop | **ADR-0005** (auto-merge) + **ADR-0007** (worktree lifecycle) |
| ADR-0020 / 0028 | auto-merge on green | **ADR-0005** + **ADR-0011** (fail-closed preflight) |
| ADR-0035 | worktrees for parallel sessions | **ADR-0007** |
| ADR-0001 | guardrails policy | posture across **ADR-0003 / 0006 / 0010 / 0013** (no single plano ADR) |
| ADR-0021 | no strict status checks | **ADR-0010** |
| ADR-0025 | CI cost posture | folded into **ADR-0006** |
| ADR-0031 | nightly heavy tier / failure issues | **ADR-0006** |
| ADR-0033 | static-only PR tier | folded into **ADR-0006** |
| ADR-0008 | production error tracking | **ADR-0014** |
| ADR-0006 | coverage-floor ratchet | not yet built — roadmap 4.3 |
| ADR-0007 | dead-code gate | not yet built — roadmap 4.3 |

Prose section pointers were template-numbered too and are corrected above: the
boring-technology rule and ADR discipline live in `AGENTS.md` ("Boring technology") and
`docs/decisions/`, and the Product Change Protocol lives in `docs/AGENT_GUIDE.md` — not in
`06-agent-behaviour.mdc` §14/§15/§16 (that rules file ends at §14, worktrees).
