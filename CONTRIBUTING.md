# Contributing

## Branch protection (recommended)

In GitHub: **Settings → Branches → Branch protection rules** for `main`:

- Require status checks to pass before merging: **CI / Quality checks**
- Require branches to be up to date before merging
- Require pull request reviews before merging

This keeps `main` aligned with typecheck, lint, unit tests, and production build.
