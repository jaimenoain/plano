# 0005 — Auto-merge on green; human review not required

**Status:** accepted (2026-07-15)

## Context

This is a solo-maintainer repo with a non-technical owner whose time is the scarcest
resource. Merges to `main` are already gated by a strong set of machine checks: 10
required status checks (lint, typecheck, test + coverage floor, build, migrations lint,
warning ratchet, secret scan, types staleness, debt ratchet, RLS coverage), a strict
up-to-date-branch requirement, and `enforce_admins`. An advisory AI reviewer posts
inline comments on every PR.

Despite this, branch protection had drifted to require **1 approving human review**,
which contradicted the documented intent ("human reviews deliberately not required") and
forced the owner to click *Approve* on every PR before it could merge — a per-PR
touchpoint that added friction without adding a gate the machine checks didn't already
provide. Auto-merge also had to be armed by hand (`gh pr merge --auto`), a step that can
be forgotten, leaving a green PR lingering.

## Decision

Merges to `main` are gated **solely on the required machine checks**; human approval is
not required. Auto-merge is **armed automatically** for every ready (non-draft) PR by
`.github/workflows/automerge.yml`, and GitHub lands the PR (squash) the moment all
required checks pass, deleting the head branch.

- Branch protection: `required_approving_review_count` removed; the 10 required checks and
  `enforce_admins` stay mandatory. No check is ever made advisory to get a merge through.
- The AI reviewer remains advisory (never blocks) — it informs, it does not gate.
- Risk-based human review still applies for genuinely subjective/irreversible work; it is
  a deliberate choice on that PR, not a standing gate on every PR.

## Consequences

- A mergeable PR never waits on a human; the owner's only standing role is the final
  consolidated sign-off on subjective/product work, not per-PR mechanics.
- The quality bar is exactly the required-checks set — so that set must stay comprehensive
  (this is why RLS coverage was promoted into it, and why advisory checks graduate to
  blocking once stable).
- Removing `--auto` arming from human hands means the manual `gh pr merge --auto` step in
  AGENTS.md/CONTRIBUTING is now optional convenience, not a required step.
- Reviewers (human or AI) should treat any PR that weakens branch protection, removes a
  required check, or adds `continue-on-error` to a blocking job as a red flag.
