# 0019 — Risk-based, automation-first UAT

**Status:** accepted (convention formalized; recorded retroactively 2026-07-23) — template ADR-0015 / ADR-0019

**Context.** Owner time is the project's scarcest input (`docs/PRINCIPLES.md` §2). A roadmap that
stops for a human check at the end of every phase burns that input on things a test could have
verified. plano already follows a risk-based UAT model — imported as convention in
[`docs/project_start/04-writing-the-roadmap.md`](../project_start/04-writing-the-roadmap.md) and
referenced by `.cursor/rules/05-vertical-slice.mdc` (Task `X.98`) — but it was never recorded as
a plano decision. The principles audit flagged this (`docs/specs/principles-alignment.md` §2,
verdict Partial), and the charter's `_In practice:_` pointer cited the dangling **template
ADR-0015 (automation-first UAT) / ADR-0019 (risk-based UAT)**. This ADR is that backfill (roadmap
task 4.2).

**Decision.** UAT is split by **risk, not by phase**, across two surfaces, and it is
**automation-first**: a check is UAT *only where automation cannot reach*. Before writing any
human check, ask whether a Playwright E2E test (or the agent via MCP/CLI) could verify it — if so
it is not UAT; it is a test the feature task ships (Definition of Done). Data creation,
persistence, RLS isolation, navigation, and validation are all automation territory. What
survives is human-only: subjective visual/brand quality, a real email or SMS in a personal inbox,
third-party dashboard states behind human logins, and the overall "does this feel right"
sign-off. Each survivor belongs to exactly one surface:

1. **Per-phase Critical Gate (`X.98`)** — a human-only check that a *later phase depends on*.
   Generated **only** when such a gate exists; a phase with no downstream-blocking human check has
   no `X.98` and does not interrupt the owner. When in doubt, it is *not* a gate — over-gating
   reintroduces the per-phase interruptions this model removes.
2. **End-of-roadmap Final UAT** — every non-gating human check accumulates into a **single
   sitting** at the roadmap's end.

Both surfaces are `[MANUAL TASK]`s written for a non-technical owner, each arriving with an
evidence pack; only the coding agent flips the checkbox.

**Rejected alternative.** A UAT gate at the end of every phase — rejected: it spends the owner's
scarcest input (principle 2) on checks that are either automatable or non-blocking. Dropping human
UAT entirely and trusting automation — rejected: subjective quality and externally-delivered
artifacts (real inboxes, third-party dashboards) genuinely can't be asserted by a test, so a
small, batched, risk-targeted human surface remains.
