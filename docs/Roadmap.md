# Roadmap

## Phase 5 Summary

**Completed:** 2026-03-30

- **Delivered:** `strictNullChecks: true` in app and root TypeScript configs; production code cleared of `@typescript-eslint/no-explicit-any` (error level, tests unchanged); GitHub Actions CI (`.github/workflows/ci.yml`) for `main` PRs/pushes: typecheck, lint (`--max-warnings 0`), test, build with placeholder `VITE_SUPABASE_*`; `CONTRIBUTING.md` with branch protection guidance; ESLint hygiene (unused catch bindings, `_`-prefixed unused destructuring, `use-toast` action types as pure types); `npm run lint` enforces zero warnings.
- **Config choices:** `react-hooks/exhaustive-deps` is **off** repo-wide to avoid risky mass refactors on data-heavy effects (re-enable incrementally per screen). `react-refresh/only-export-components` is **off** for `src/components/ui/**` and a small set of hooks/providers that legitimately co-export helpers.
- **Spec updates:** None required for this phase (typing and tooling only).
- **Descoped / deferred:** None.
