# Playbook — adding a dependency without breaking CI's `npm ci`

Use when: you added or bumped a dependency and CI fails at `npm ci` with a
missing-module or missing-from-lock-file error (e.g. `Cannot find module
'@swc/helpers/...'` during `next build`, or `Missing @emnapi/core@x from lock
file`) — **or**, preventively, whenever you are about to add a dependency and your
local Node major differs from the project's `.nvmrc` (currently `22`;
`packageManager` = `npm@10.9.2`).

## Quick check

1. `node -v` — is your local Node a different major than `.nvmrc` (`22`)? If yes,
   a plain `npm install` here will not produce the lockfile CI expects.
2. Was the failing lockfile written by a bare `npm install` (not the procedure
   below)? A clean install under a newer Node re-resolves and **prunes** required
   platform/subtree deps; an incremental install leaves a dangling `@emnapi/core`
   reference. Either way `npm ci` on CI (Node 22) then fails.

## Fix

Do not run a bare `npm install` to add the dep. Instead:

1. Edit `package.json` to add or change the dependency.
2. Restore main's known-good lockfile so you extend it rather than re-resolve it
   from scratch: `git checkout main -- package-lock.json`.
3. Add the new subtree while preserving every existing platform entry:
   `npx -y npm@10.9.2 install --package-lock-only`.
4. Validate exactly what CI runs: `npx -y npm@10.9.2 ci`. If that succeeds, CI's
   `npm ci` will too. Do **not** rely on `npm ci --dry-run` alone — it has passed
   lockfiles that were actually missing a required dep.

## Two gotchas

- **`overrides` won't re-pin an already-locked direct dep.** `--package-lock-only`
  does not re-resolve a workspace's own direct dependency against a newly-added
  root `overrides` entry (npm `overrides` don't apply to a workspace's direct deps
  by design). To force a version, pin it in that workspace's `package.json`
  itself, not only in root `overrides`.
- **A dep that pulls its own React can duplicate React.** If a new dependency
  brings a second copy of `react`/`react-dom`, npm dedupe can break and `next
build` crashes on prerender (e.g. `Cannot read properties of null (reading
'useContext')`). Fix by pinning `react` and `react-dom` to a single version in
  the app workspace's `package.json` (and the root `overrides` block).
