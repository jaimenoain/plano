# Design System QA Checklist

Use this checklist for design-system work. During the **refinement programme** ([Roadmap.md](Roadmap.md)), agents complete **§1–§7 only** at programme end (see ROADMAP “Automated verification”); **§8 Sign-Off is not required** (no human gate).

## 1) Token Compliance

- [x] No raw palette classes introduced in feature code
- [x] Semantic token classes only (`brand-*`, `surface-*`, `border-*`, `text-*`, `feedback-*`)
- [x] Focus state uses the approved ring token (`brand-primary`)
- [x] Selection highlight uses the approved accent token (`brand-accent`)
- [x] No unauthorized accent usage on content/feed surfaces

## 2) Typography and Spacing

- [x] Heading hierarchy matches `docs/DESIGN_TOKENS.md`
- [x] Section labels and tracked editorial labels are consistent
- [x] Spacing scale aligns with token ladder (no ad hoc spacing patterns)
- [x] Card/media geometry follows editorial corner policy

## 3) Component and Shell Consistency

- [x] Top nav, sidebar, and bottom nav are behaviorally consistent
- [x] Shared shell spacing/insets are correct across desktop and mobile
- [x] No duplicate one-off nav configs introduced
- [x] Reused primitives are applied instead of per-page custom variants

## 4) State Coverage

- [x] `idle` state verified
- [x] `loading` state verified
- [x] `error` state verified
- [x] `empty` state verified
- [x] `success` state verified

## 5) Accessibility

- [x] Keyboard navigation works across primary interactions
- [x] Focus visibility is clear on all actionable controls
- [x] Text and controls maintain required contrast
- [x] Semantic landmarks/headings remain logical after restyling

## 6) Route Family Regression

- [x] Landing/feed/building detail flows still work end-to-end
- [x] Discovery/search/map flows still work end-to-end
- [x] Profile/credits/events/awards flows still work end-to-end
- [x] Embassy operational flows still work end-to-end
- [x] Admin operational flows still work end-to-end

## 7) Build Integrity

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run build` passes

## 8) Sign-Off

- [ ] Design sign-off complete
- [ ] QA sign-off complete
- [ ] Product/stakeholder sign-off complete
