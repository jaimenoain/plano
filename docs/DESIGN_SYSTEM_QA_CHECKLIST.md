# Design System QA Checklist

Use this checklist for every phase and every release candidate in the design-system rollout.

## 1) Token Compliance

- [ ] No raw palette classes introduced in feature code
- [ ] Semantic token classes only (`brand-*`, `surface-*`, `border-*`, `text-*`, `feedback-*`)
- [ ] Focus state uses the approved ring token (`brand-primary`)
- [ ] Selection highlight uses the approved accent token (`brand-accent`)
- [ ] No unauthorized accent usage on content/feed surfaces

## 2) Typography and Spacing

- [ ] Heading hierarchy matches `docs/DESIGN_TOKENS.md`
- [ ] Section labels and tracked editorial labels are consistent
- [ ] Spacing scale aligns with token ladder (no ad hoc spacing patterns)
- [ ] Card/media geometry follows editorial corner policy

## 3) Component and Shell Consistency

- [ ] Top nav, sidebar, and bottom nav are behaviorally consistent
- [ ] Shared shell spacing/insets are correct across desktop and mobile
- [ ] No duplicate one-off nav configs introduced
- [ ] Reused primitives are applied instead of per-page custom variants

## 4) State Coverage

- [ ] `idle` state verified
- [ ] `loading` state verified
- [ ] `error` state verified
- [ ] `empty` state verified
- [ ] `success` state verified

## 5) Accessibility

- [ ] Keyboard navigation works across primary interactions
- [ ] Focus visibility is clear on all actionable controls
- [ ] Text and controls maintain required contrast
- [ ] Semantic landmarks/headings remain logical after restyling

## 6) Route Family Regression

- [ ] Landing/feed/building detail flows still work end-to-end
- [ ] Discovery/search/map flows still work end-to-end
- [ ] Profile/credits/events/awards flows still work end-to-end
- [ ] Embassy operational flows still work end-to-end
- [ ] Admin operational flows still work end-to-end

## 7) Build Integrity

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes

## 8) Sign-Off

- [ ] Design sign-off complete
- [ ] QA sign-off complete
- [ ] Product/stakeholder sign-off complete
