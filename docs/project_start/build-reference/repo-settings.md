# GitHub Repository Settings — Build Reference

> **Audience:** the coding agent, wiring a freshly stamped project (README Step 4).
> **When to use:** once, after the project's GitHub repo exists, when the owner
> says something like _"apply the repo settings"_. Also safe to re-run any time —
> every command here is idempotent.

Branch protection, auto-merge, and branch auto-delete live in **GitHub**, not in
this repo, so a project stamped from the template does not inherit them. They are
all reachable from the CLI, so the agent applies them instead of walking the
non-technical owner through dashboard clicks (owner decision D2). Requires an
authenticated `gh` with `repo` + `admin:repo_hook`-equivalent scope; confirm with
`gh auth status`.

## What to apply

1. **Auto-delete merged branches** and **allow auto-merge** — repository flags.
2. **Branch protection on `main`** requiring the five blocking CI checks to pass
   before a merge.

The five blocking check contexts are the job ids in `.github/workflows/ci.yml`
(a job's context name equals its id): **`checks`**, **`build`**, **`audit`**,
**`e2e`**, **`gitleaks`**. The advisory jobs (`dependency-review`,
`claude-review` in `advisory.yml`) are **never** required — they never gate a
merge (ADR-0001). If `ci.yml` gains or renames a blocking job, update the list
here and re-run.

## Procedure

Resolve the repo once (`gh` infers it from the `origin` remote):

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
```

### 1. Repository flags (auto-merge + auto-delete)

```bash
gh api -X PATCH "repos/$REPO" \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true
```

Idempotent — re-running is a no-op if the flags are already set. (Auto-merge was
already enabled on the template repo itself on 2026-07-10; this folds it into the
standard set.)

### 2. Branch protection on `main`

```bash
gh api -X PUT "repos/$REPO/branches/main/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["checks", "build", "audit", "e2e", "gitleaks"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Notes:

- `strict: false` — a PR merges once its own five checks pass, without having to
  be up to date with `main` first. This is deliberate: auto-merge (ADR-0020)
  performs merges with no agent present, and GitHub neither auto-updates a stale
  branch nor lets a bot re-trigger CI on one — so a `strict: true` PR that falls
  behind (whenever a second PR is in flight) stalls forever with nobody to update
  it. `strict: false` keeps merges autonomous; the accepted trade-off and the
  merge-queue alternative are recorded in ADR-0021 (which supersedes the
  `strict: true` choice in ADR-0018). All five checks stay required — only the
  up-to-date requirement is dropped.
- `enforce_admins: true` keeps the DoD's "never push to `main`" honest for
  everyone, including the owner.
- `required_pull_request_reviews: null` — the owner is the sole maintainer and
  self-approval is not possible on GitHub, so a mandatory review would deadlock a
  one-person project. Raise this only if the project later adds reviewers.
- Re-running `PUT` replaces the protection with the same payload — idempotent.

## Report back

After applying, read the settings back and tell the owner in plain English what is
now in force (and flag anything that was already correct vs. changed):

```bash
gh api "repos/$REPO" -q '{delete_branch_on_merge, allow_auto_merge}'
gh api "repos/$REPO/branches/main/protection" \
  -q '{required: .required_status_checks.contexts, admins: .enforce_admins.enabled}'
```

If a project's protection is missing a context that `ci.yml` now blocks on (e.g.
an older repo protected before `build`/`audit` existed), re-running step 2 brings
it current. Never remove a context to make a red check pass — fix the code
(ADR-0001).
