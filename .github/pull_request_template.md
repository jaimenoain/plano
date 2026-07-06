## What & why

<!-- One short paragraph in product language: what changes for users/the project, and why now. -->

## Agent checklist

<!-- Fill truthfully. Delete lines that don't apply to this PR — do not leave unchecked boxes. -->

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` all pass locally
- [ ] No new `getSession()`, mock data, raw Tailwind palette colors, or direct `supabase.from()` outside feature `api/` modules
- [ ] Warning ratchet clean: `node scripts/check-eslint-ratchet.mjs` (baseline lowered via `--update` if this PR removed warnings)
- [ ] Migrations: applied via Supabase MCP `apply_migration` AND regenerated types (`npm run gen-types`) committed in this PR
- [ ] New UI uses design tokens (`docs/DESIGN_TOKENS.md`) and existing `src/components/ui` primitives
- [ ] `docs/AI_STATUS.md` updated if architecture or known issues changed
