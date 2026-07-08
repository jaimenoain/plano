# 0003 — Debt ratchets over big-bang cleanups; baselines only shrink

**Status:** accepted (2026-07-06, first ratchet: ESLint warnings)

## Context

The codebase carries real debt: ~640 boundary-import warnings, files over 3,000 lines, lenient TypeScript (`strict: false` in the app config), `as any` escapes. Fixing all of it at once ("big-bang") has failed in past projects: enormous risky diffs, weeks of frozen feature work, and checks that get disabled the first time they block an urgent fix. Checks that exist but don't block are ignored entirely.

## Decision

Every debt dimension gets a **ratchet**: the current count is frozen in a committed baseline file, CI **blocks any growth**, and the baseline may only ever go down. Existing debt never blocks a PR; new debt always does.

- The fix for a ratchet failure is always the code, never the baseline. Failure messages say exactly that.
- Baseline files (e.g. `.eslint-warning-baseline.json`) are updated downward only, via each script's `--update` flag.
- New checks the repo can't pass today enter CI as **advisory**, and are promoted to blocking once green for ~2 weeks.
- TypeScript strictness follows the same principle: a growing per-file allowlist in `tsconfig.strict.json`, no repo-wide flip.

## Consequences

- Debt shrinks monotonically without ever freezing feature work.
- PR authors may be blocked by a warning they didn't cause the pattern of — the rule is still: fix it, don't baseline it.
- Reviewers (human or AI) should treat any PR that edits a baseline upward or adds `continue-on-error` to a blocking job as a red flag.
