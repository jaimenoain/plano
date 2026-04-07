# Contributing

## Branch protection (recommended)

In GitHub: **Settings → Branches → Branch protection rules** for `main`:

- Require status checks to pass before merging (align names with Vercel/GitHub checks configured for this repo, e.g. deployment + any Actions you add)
- Require branches to be up to date before merging
- Require pull request reviews before merging

This keeps `main` aligned with typecheck, lint, unit tests, and production build.
