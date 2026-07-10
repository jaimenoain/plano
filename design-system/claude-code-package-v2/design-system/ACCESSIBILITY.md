# Accessibility

Plano's restraint makes most of accessibility easy — high-contrast monochrome, no motion soup — but the
extreme type scale and the rationed colour need deliberate handling.

---

## Colour & contrast

- Body text `--text-primary` (`#171717`) on `--surface-default` (`#FAFAFA`) and on white easily clears
  WCAG AA and AAA.
- `--text-secondary` (`#525252`) on white passes AA for body text. **`--text-disabled` (`#A3A3A3`) does
  not** — use it only for genuinely de-emphasised, non-essential meta (timestamps), never for information
  a user must read.
- **Never rely on colour alone.** Feedback uses a coloured dot **plus** a text label. Rating meaning is the
  dot *count* (an earned reward), not the hue — dots are shown only when earned, never padded with empty rings.
- The lime `#BEFF00` has poor contrast on white, so it is **never used as text and never as rating dots**
  (those are black). Where it appears it is a **fill with dark `#171717` foreground** (primary button,
  `.accent-tag` pill, `::selection`) or a small non-text indicator (focus ring with a 2px white offset, the
  bell unread dot). Meaning is never carried by the lime alone — buttons have labels, the bell dot pairs
  with the icon.

## Focus

- Visible focus is mandatory: 2px **lime** ring (`--brand-accent` / `ring-brand-accent`) with a 2px white
  offset, shown on **keyboard** focus (`focus-visible`), not on mouse click. The white offset separates the
  ring from the element so the lime reads even against a lime button.
- Don't remove it to "clean up" a design — the focus ring is a required affordance.
- Every interactive element (buttons, editorial `.cta-link`, rating input, nav items, links) must be
  reachable and operable by keyboard, in a logical tab order.

## Hit targets

- Minimum **44×44px** touch target, especially in `BottomNav` and `MobileTopBar`. The editorial `.cta-link`
  is visually small text — give it enough padding to meet the target.
- Rating dots are small; ensure the *input* affordance (not just the dot) meets the target.

## Type & readability

- Editorial display sizes are decorative-scale but still real text — keep them as semantic headings
  (`h1`/`h2`), not images, so they're announced and zoomable.
- Body stays at `--fs-base` (16px) or above with `lh-normal`/`lh-relaxed`. Don't drop body below 14px.
- `max-w-4xl` reading measure keeps line length comfortable — preserve it.
- Space Mono is for tiny numeric meta only; never set letter-heavy or essential reading copy in it.

## Motion

- Honour `prefers-reduced-motion`. Entry animations (fade + 12px translate, 600ms) and the rating
  `whileTap` squish must be disabled/neutralised when reduced motion is requested.
- There are no parallax or scroll-driven effects to worry about — keep it that way.

## Semantics & images

- Real architecture photos need meaningful `alt` (building · architect · year). `.photo-placeholder` is
  decorative-pending-art — give it an empty/role-appropriate alt or describe the intended subject.
- Icons that carry meaning (status, action) need an accessible label; Lucide icons are decorative-by-default
  SVGs, so pair them with text or `aria-label`.
- The wordmark SVG carries `aria-label="Plano"`.

## Checklist (per change)

- [ ] Text contrast meets AA (and `text-disabled` only on non-essential meta).
- [ ] Keyboard reachable, logical order, visible `focus-visible` **lime** ring intact.
- [ ] Touch targets ≥ 44px.
- [ ] No colour-only signals (dot + label, count not hue).
- [ ] `prefers-reduced-motion` respected.
- [ ] Images have meaningful `alt`; meaningful icons have labels.
