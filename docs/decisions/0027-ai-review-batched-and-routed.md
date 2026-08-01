# 0027 — The scheduled AI review leaves the nightly tier: own baseline, batched, model-routed, capped

**Status:** accepted (2026-08-01) — amends [ADR-0006](0006-nightly-heavy-tier.md), supersedes the `continue-on-error` mechanism in [ADR-0013](0013-session-pipeline-health-check.md)

## Context

ADR-0006 put the scheduled AI review in `nightly.yml` as a `review` job alongside `e2e`, sharing one
`guard`. That guard resolves its baseline as "the `head_sha` of this workflow's last **successful
run**" — and a run is only successful when *every* job passed.

The consequence is not theoretical. On six of the eight nights to 2026-08-01, `review` concluded
`success` while `E2E` failed (issue #1610, an unrelated QA-credential/flake problem open since
2026-07-23). Because the *run* failed, the baseline never advanced past the 2026-07-30 nightly, so the
AI re-reviewed the same — steadily growing — diff at full Sonnet price every single night. Playwright
flakiness was silently setting the API bill.

Three further costs rode along:

- **No noise filter.** A night whose only change was `docs/` or `package-lock.json` still bought a
  full review.
- **No batching.** A one-commit, six-line night cost the same fixed overhead as a fifty-commit night.
- **No routing and no ceiling.** Every review was `claude-sonnet-5`, with `--max-turns 25` as the only
  bound — and turns are a *failure* bound, not a spend bound.

Failure handling was also a false dichotomy. ADR-0013 hung `continue-on-error: true` on the action
step so an exhausted API key would not open a red `nightly-failure` issue. That worked, but left a
genuinely broken reviewer completely silent — and a step carrying `continue-on-error` reports a
non-failure conclusion even when the review errored, so it can never be used as evidence that a
review actually happened.

## Decision

Extract the review into `.github/workflows/ai-review-scheduled.yml`, shaped `guard → review → alert`,
on its own cron (`58 5 * * *`, staggered against this repo's other three crons). The `review` job is
deleted from `nightly.yml`, which is now `guard → e2e → alert`; `alert.needs` drops `review`.

*(The filename is `ai-review-scheduled.yml`, not `ai-review.yml`, because the latter is already this
repo's on-demand `@claude` PR responder. That workflow is unchanged.)*

1. **A baseline that only advances when a review actually happened.** The guard walks recent runs
   newest-first and takes the `head_sha` of the first whose **job `review`, step `Run AI review`**
   concluded `success`. It does *not* use `?status=success`: a run whose review step was *skipped*
   (no API key, or "not enough change") also concludes `success` and would advance the baseline over a
   diff nobody read. Matching on those two literal strings is the trade-off — renaming either costs
   one redundant review, the same class of trade-off ADR-0006 already accepted for the filename match.
2. **Removing `continue-on-error`** from the action step, which is what makes (1) trustworthy.
3. **A noise filter.** `.github/**`, `docs/**`, `*.md`, `*.lock`, `package-lock.json`, `.gitignore`,
   `.prettierignore`, `.gitleaksignore`, `.nvmrc`, `CODEOWNERS` are dropped from the diff. Ratchet
   baseline JSON is explicitly **not** noise — a raised baseline violates
   [ADR-0003](0003-ratchets-over-big-bang.md) and is precisely what a reviewer should see. An empty
   signal set skips *without* advancing the baseline, so the noise simply rides along in a later diff.
4. **A batching threshold.** Review when `signal_commits >= 3` **or** `signal_lines >= 200` **or**
   `days >= 7`. Below that, change accumulates and is reviewed in one pass instead of five. The guard
   writes the decision and all three numbers to the step summary, so a skip explains itself.
5. **Model routing.** `claude-haiku-4-5` by default; `claude-sonnet-5 --effort medium` only when the
   diff exceeds 800 lines or touches a risk path — migrations, edge functions, the generated Supabase
   client/types, the auth feature, `*.server.ts`, resource routes, SSR loaders, feature `api/`
   modules, or anything matching `*rls*` / `*polic*`. `--effort` errors on Haiku 4.5, so it is passed
   through a guard output rather than the static `claude_args` block.
6. **A real spend ceiling.** `--max-budget-usd 2` per run, with `--max-turns 60` set deliberately high
   so turns are not the binding constraint (running out of turns is a hard `error_max_turns` failure).
7. **An advisory alert.** A failed review opens or comments on an `ai-review-broken` issue (amber
   `FBCA04`) **only on the third consecutive failure** — never the red `nightly-failure`, which means
   "`main` is broken". A one-off API blip stays silent; a dead key surfaces on the third night.
8. **A scoped prompt.** It reviews only the signal paths and is told explicitly not to re-report what
   the deterministic gates already block (lint, types, tests, coverage, the four ratchets, gitleaks,
   `npm audit`, the data-layer import boundary, RLS-enabled coverage, migration collisions, types
   staleness, `.env.example` drift), so the paid model spends its turns on RLS *correctness*,
   authorization logic, hollow tests, arithmetic, swallowed errors, SSR safety, and contract drift.

Alongside this, `check-env-example.mjs` is backported from the `nomi` repo — one more thing a script
can decide, so the reviewer does not have to. It is added as a **step on the existing `debt-ratchet`
job**, never a new job: a new job means a new runner and a new billed-minute floor.

## Consequences

- Idle and noise-only nights cost roughly one billed minute and zero API tokens — the guard exits
  before `actions/checkout`.
- A flaky E2E suite no longer touches the review's baseline or its bill. The two tiers fail
  independently.
- Typical nights run on Haiku with a $2 cap; Sonnet is reserved for diffs where a miss is expensive.
- Review feedback arrives in batches rather than nightly. That is the point, but it does mean a small
  change can sit unreviewed for up to seven days. `@claude` on a PR remains the way to get an
  immediate read, and `workflow_dispatch` with `force=true` bypasses the batching threshold.
- Renaming the workflow file, the `review` job, or the `Run AI review` step resets the baseline: one
  redundant full review, then normal service.
- A broken API key now takes three nights to surface instead of never — the deliberate cost of not
  paging on the first blip.
