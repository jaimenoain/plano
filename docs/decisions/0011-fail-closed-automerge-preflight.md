# 0011 — Fail-closed auto-merge preflight (refuse to arm when main is unprotected)

**Status:** accepted (2026-07-22)

Ports the template's **ADR-0028** to plano. Refines [ADR-0005](0005-auto-merge-on-green.md);
complements [ADR-0010](0010-drop-strict-status-checks.md).

## Context

`automerge.yml` arms GitHub-native auto-merge on every ready PR ([ADR-0005](0005-auto-merge-on-green.md)).
Its single step ran the arm command best-effort — `gh pr merge --auto --squash "$PR_URL" || true`
— with **no check that `main` is actually protected first**. Auto-merge on plano is safe *only
because* `main` carries branch protection: the 10 required status checks, `enforce_admins`,
no-force-push, and no-deletion are what stand between an unreviewed PR and `main`
([ADR-0010](0010-drop-strict-status-checks.md) narrowed only the up-to-date requirement, not the
check set).

If that protection were ever dropped or misconfigured — a bad settings change, a botched API
call, a reset that didn't reapply it — the workflow would keep arming auto-merge exactly as
before, now onto an **ungated** `main`. Because arming swallows all errors with `|| true`, there
would be no signal: PRs would merge without their required checks and nothing would go red. This
is the highest-leverage failure in the merge pipeline (principles 4 and 5), and it is silent.

## Decision

Add a **fail-closed preflight** step to `automerge.yml` that reads `main`'s `protected` boolean
and refuses to arm auto-merge when protection is off.

```
protected=$(gh api "repos/${{ github.repository }}/branches/main" --jq '.protected')
[ "$protected" = "true" ] || { echo "::error::..."; exit 1; }
```

- The check reads the branch object's `.protected` field (via `repos/{repo}/branches/main`), which
  is exactly the boolean the roadmap names and which the built-in `GITHUB_TOKEN` can read with the
  existing `contents` scope. It deliberately does **not** call `repos/{repo}/branches/main/protection`,
  which needs admin scope and 404s when protection is absent.
- When `protected` is not `true`, the step exits non-zero, the **Auto-merge job fails**, and the
  arm step never runs — the failure is loud and visible.
- The `|| true` on the *arm* step is retained. Its only job is idempotency: arming a PR whose
  auto-merge is already set, or one already merged/closed, is a benign no-op that should not fail
  the job. The fail-closed behaviour lives entirely in the preflight, not in the arm step.

## Consequences

- A stripped or misconfigured `main` protection now surfaces immediately as a failed **Auto-merge**
  job on the next PR, instead of silently arming auto-merge onto an ungated branch.
- No change to the happy path: while `main` is protected (the normal state — `enforce_admins`,
  10 required checks), the preflight passes and auto-merge arms exactly as before. This PR itself
  exercises the new step against the live, protected `main`.
- The preflight uses only the built-in `GITHUB_TOKEN` and the existing `contents` permission — no
  new secret, PAT, or elevated scope.
- The check is a guard on *arming*, not on *merging*: GitHub's own protection is still the thing
  that gates the actual merge. If protection is off, this workflow declines to help — it does not
  attempt to re-enable protection.
- As with [ADR-0005](0005-auto-merge-on-green.md), a PR that weakens or removes `main`'s branch
  protection remains a review red flag; this ADR makes the auto-merge pipeline notice such a state
  rather than paper over it.
