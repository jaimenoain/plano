# Principles — the charter this factory is built on

This document is the constitution of the template. It records the operating
principles the owner has agreed to, in plain language, so that every future
change to the system can be tested against them.

**How the layers relate:** this document says _why_, the ADRs in
`docs/decisions/` say _what was decided_, the rules in `.cursor/rules/` say
_how to act on a task_, and CI enforces what can be enforced. A proposed
change that serves no principle — or fights one — needs the owner's explicit
sign-off, surfaced as a business decision. Changing a principle itself
requires an ADR that supersedes [ADR-0036](decisions/0036-principles-charter.md).

---

## 1. The owner is the CEO, not an engineer

The owner is strictly non-technical and never performs a technical task —
any task delegated to them will be done poorly, and that is the system's
failure, not theirs. The agent owns all infrastructure work end to end.
Questions to the owner are business questions, in plain English, answerable
in five seconds with a yes or no.

_In practice:_ `.cursor/rules/06-agent-behaviour.mdc` §3 (make the call,
ask only when it matters), ADR-0014 (agent-first manual tasks).

## 2. Owner time is the project's scarcest input

Every human check that a test can replace ships as a test. The human checks
that survive are batched: a mid-roadmap gate only when later work genuinely
depends on it, and one Final UAT sitting per roadmap for everything else.
Every UAT request arrives with an evidence pack — the link to click, what to
expect, screenshots — so the sitting takes minutes and tests the business
claim, nothing else.

_In practice:_ ADR-0015 (automation-first UAT), ADR-0019 (risk-based UAT).

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

_In practice:_ `.cursor/rules/06-agent-behaviour.mdc` §16, ADR-0017/0018
(clean-branch loop), ADR-0020/0028 (auto-merge on green), ADR-0035
(worktrees only for parallel sessions, dying with their PR).

## 5. Gates are boring; judgment is advisory

There is no human reviewer, so a flaky or slow blocking check does not add
safety — it silently stalls the factory. Required checks are fast,
deterministic, and mechanical. Judgment-shaped verification (AI review,
full e2e, subjective quality) runs on the nightly tier and files issues
instead of blocking merges. A red gate is never cleared by weakening the
gate.

_In practice:_ ADR-0001 (guardrails policy), ADR-0021 (no strict status
checks), ADR-0031 (nightly heavy tier).

## 6. Frugal by default

CI minutes, API calls, and service tiers are real money the product has not
earned yet. The PR tier runs only cheap static checks; everything heavy runs
nightly and skips itself when `main` has not moved; scheduled jobs run daily,
not per-event.

_In practice:_ ADR-0025 (CI cost posture), ADR-0031/0033 (nightly heavy
tier, static-only PR tier).

## 7. Data is sacred; code is expendable

Any code the agent loses can be regenerated in an hour; customer data cannot
be regenerated at all. Every destructive or irreversible database operation
is preceded by an automatic restore point; point-in-time recovery is
verified during project setup; destructive migrations are rehearsed against
a local copy before touching production.

## 8. The system watches production, not just the pipeline

The owner must never be the person who discovers the live site is broken —
customers reporting to the CEO is the most expensive error channel there is.
Runtime errors and uptime feed the same find-and-fix loop as CI failures.

_In practice:_ ADR-0008 (production error tracking) plus the scheduled
self-repair loop (principle 9).

## 9. The system repairs and maintains itself on a clock

Stalled PRs, red pipelines, aging dependencies, silently disabled cron
workflows, drifted repo settings: all of these are found and fixed by
scheduled runs, not by waiting for a human to start a session. Unattended
rot is a defect of the system, never of the owner.

_In practice:_ the nightly tier's failure issues (ADR-0031), the session
pipeline health check (`06-agent-behaviour.mdc` §0), the branch sweep
(ADR-0020/0025).

## 10. The repo is the only memory

Sessions end and context evaporates. Any decision, known issue, or piece of
project state that lives only in a conversation is already lost. Everything
a future agent session — or a future human developer — needs is in the
repository: PRD, data contract, ADRs, status file, roadmaps.

_In practice:_ `docs/AI_STATUS.md` discipline (§9), ADR discipline (§14),
the Product Change Protocol (§15).

## 11. Built to be handed over

Boring mainstream technology, small well-organised files, a predictable
layout, ratchets that only move in the improving direction, and an ADR for
every structural choice. The success test: a professional developer taking
over the codebase should be productive quickly — and should not want to
rebuild it.

_In practice:_ the boring-technology rule (§14), the debt ratchet and
coverage floor (ADR-0001/0006), the dead-code gate (ADR-0007).
