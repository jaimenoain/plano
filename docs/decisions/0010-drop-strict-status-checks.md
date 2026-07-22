# 0010 — Drop strict status checks (branch need not be up-to-date to merge)

**Status:** accepted (2026-07-22)

Ports the template's **ADR-0021** to plano. Refines [ADR-0005](0005-auto-merge-on-green.md).

## Context

`main`'s required-checks protection was configured with `strict: true`, meaning GitHub
required a PR's branch to be **up to date with `main`** before it could merge, on top of the
10 required status checks passing. Combined with automatic auto-merge ([ADR-0005](0005-auto-merge-on-green.md)),
this repeatedly stalled ready PRs: whenever another PR landed first — the norm for stacked or
parallel work — the still-open PR fell "behind" and its auto-merge froze until someone ran a
manual `gh pr update-branch`. That manual step is exactly the per-PR touchpoint auto-merge
exists to remove, and in a solo-maintainer repo with a non-technical owner it silently leaves
green PRs lingering.

The up-to-date requirement is meant to catch *semantic* conflicts that a textual merge does not
— a change that passes on its own branch but breaks once combined with what landed meanwhile.
In practice plano's gate against that is the required check set, which re-runs on the merge
result, plus the nightly heavy tier; the strict flag mostly bought a stall, not safety.

## Decision

Set `strict: false` on `main`'s `required_status_checks` protection. A PR may merge while behind
`main` as long as the required checks are green.

- The **10 required contexts** (Lint, Typecheck, Test, Build, Migrations lint, Warning ratchet,
  Secret scan, Types staleness, Debt ratchet, RLS coverage) and `enforce_admins`,
  no-force-push, and no-deletion all remain mandatory and unchanged. Only the
  up-to-date-first requirement is dropped.

## Consequences

- Auto-merge no longer stalls on stacked or behind-`main` PRs; no manual `gh pr update-branch`
  is needed to land a green PR.
- The tradeoff (accepted, and the same one the template's ADR-0021 makes): a PR can merge
  without having been rebased on the latest `main`, so a semantic conflict that the required
  checks do not catch could reach `main`. This is backstopped by the checks re-running on the
  merge, the nightly heavy tier ([ADR-0006](0006-nightly-heavy-tier.md)), and the session-start
  pipeline-health check that watches for a red `main` (roadmap task 3.1).
- GitHub still refuses to merge a PR with *textual* conflicts regardless of this flag.
- As with [ADR-0005](0005-auto-merge-on-green.md), a PR that weakens branch protection or removes
  a required check remains a review red flag — this ADR narrows only the up-to-date requirement,
  not the check set.
