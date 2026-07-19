# 0007 — Worktree lifecycle: in-repo, fresh-based, dies with its PR

**Status:** accepted (2026-07-19) — fleet-wide policy, template ADR-0035

**Context.** Concurrent agent sessions improvised isolation by creating worktrees as sibling folders (`<repo>-wt-<task>`) in the owner's projects directory. Nothing codified the practice: naming drifted, nothing cleaned up after merges, and worktrees cut from stale refs produced conflicting PRs whose auto-merge silently stalled.

**Decision.** Worktrees are the sanctioned isolation for parallel sessions, with a lifecycle (§14 of `06-agent-behaviour.mdc`): they live at `.claude/worktrees/<slug>` inside the repo (gitignored), are cut from a just-fetched `origin/main` after an open-PR overlap check, and are removed — with their branch — the moment their PR merges. A machine-level daily janitor backstops cleanup; it removes only provably-landed, clean worktrees and never touches dirty or unpushed work.

**Rejected alternative.** Sibling-folder worktrees with a naming convention: still clutters the folder the owner navigates, and cleanup tooling outside the repo boundary proved fragile.
