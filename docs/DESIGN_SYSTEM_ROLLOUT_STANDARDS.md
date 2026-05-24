# Design System Rollout Standards

This document defines the non-negotiable implementation rules for the design-system migration.

## Source-of-truth order

1. `tailwind.config.ts` and `src/index.css` (runtime implementation)
2. `docs/DESIGN_TOKENS.md` and `docs/COMPONENT_SPEC.md` (documented rules)
3. `design-system/colors_and_type.css` + `design-system/preview/*` + `design-system/ui_kits/website/*` (reference specimens)

When sources drift, code implementation is updated first, then docs/reference artifacts are synced in the same batch.

## Token enforcement rules

- Use semantic tokens only (`brand-*`, `surface-*`, `border-*`, `text-*`, `feedback-*`)
- Do not use raw palette utilities in feature code
- Keep focus ring token monochrome (`ring` maps to `brand-primary`)
- Keep text selection token accent (`::selection` maps to `brand-accent`)
- Keep `surface-inverse` and `border-hairline` available globally for overlays and dense separators

## Navigation/system consistency rules

- Route navigation config must be centralized and reused by top nav, sidebar, and bottom nav
- Route active-state behavior must be defined once and reused
- Global shell spacing and top inset behavior must be controlled by shared layout components

## Page migration acceptance checklist

- Page uses semantic tokens only
- Typography and spacing align with `docs/DESIGN_TOKENS.md`
- All mandatory states are implemented (`idle`, `loading`, `error`, `empty`, `success`)
- Mobile + desktop layouts are visually consistent with the new system
- Existing behavior and data flows remain unchanged
