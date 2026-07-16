# 0006 — Nightly heavy tier: one scheduled AI review + E2E, off the PR path

**Status:** accepted (2026-07-17)

## Context

Every PR was getting **two** automatic AI reviews — `advisory.yml`'s
`claude-review` (Haiku) and `ai-review.yml`'s `pull_request` trigger (Sonnet) —
plus the advisory Playwright E2E job in `ci.yml`. Actions minutes are free on
this public repo, but the AI reviews spend real Anthropic API tokens on every
PR push, mostly duplicating each other. The E2E job carried
`continue-on-error: true`, so a red suite still showed a green job — noise, not
signal. The owner's other repos already run these heavy checks on a nightly
schedule.

## Decision

Move the heavy tier to a scheduled workflow, `.github/workflows/nightly.yml`
(cron + manual dispatch), shaped `guard → { e2e, review } → alert`:

- **guard** skips the run when `main` hasn't moved since the last successful
  nightly, so idle nights cost nothing.
- **e2e** runs the same Playwright steps the deleted `ci.yml` job had, but
  **without** `continue-on-error` — a red suite fails the job and trips the
  alert.
- **review** is ONE Sonnet review of `git diff <last-verified>..HEAD`; findings
  go to a single open `ai-review`-labeled issue, and an empty diff or a clean
  review posts nothing.
- **alert** opens (or comments on) a `nightly-failure` issue on any failure —
  scheduled runs have no watcher, so the issue is the signal.

Removed: `advisory.yml`'s `claude-review` job and `ai-review.yml`'s
`pull_request` trigger. Kept: the `@claude` comment responder in `ai-review.yml`
for on-demand PR reviews, and all blocking checks in `ci.yml` — the required
contexts on `main` are untouched (the e2e job was never one of them).

## Consequences

- Anthropic API cost drops from two reviews per PR push to at most one review
  per day; review feedback arrives next-morning as an issue instead of on the
  PR. Comment `@claude review` on a PR when immediate review is worth a run.
- E2E regressions surface within a day via the `nightly-failure` issue rather
  than being silently green on the PR.
- GitHub auto-disables the cron after ~60 days without repo activity; any
  commit or a manual dispatch revives it.
