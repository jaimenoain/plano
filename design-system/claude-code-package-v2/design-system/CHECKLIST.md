# Checklist — "Is this Plano?"

Run this gate before finishing any UI change. If a line fails, it's not done. The first three sections are
also enforced mechanically by `adherence.oxlintrc.json` (raw hex / raw px / non-system font → warning).

---

## Tokens & values (lint-enforced)

- [ ] **No raw hex colours.** Every colour resolves to a semantic token (`--text-primary`, `--surface-card`…).
- [ ] **No raw `px` values** for spacing/size/radius. Use the spacing scale, radius tokens, or Tailwind
      utilities that map to them.
- [ ] **Only Inter and Space Mono.** No other font families.
- [ ] Components use **semantic aliases**, never the raw `--palette-*` ramps.

## Colour discipline

- [ ] Surface is monochrome (neutrals + the inverse black where sanctioned).
- [ ] **Lime appears only** in its sanctioned uses: primary-button fills, focus rings, the hover `→` arrow,
      one `.accent-tag` pill per view, the `::selection` highlight, the bell dot.
      Section accents, surface fills, verified badges, lime icons/markers, lime rating dots = bug.
- [ ] The primary button is **lime** (`brand-accent`, dark text); secondary/outline/ghost stay monochrome.
- [ ] No gradients, textures, noise, or coloured glows.
- [ ] Feedback colour is a dot + label, not a surface fill (except a destructive-modal confirm button).
- [ ] The wordmark is `currentColor`, never recoloured to lime.

## Typography

- [ ] Headline scale is **pushed**, not hedged — heroes 96–128px, feed names 48–60px. A medium headline is
      the #1 reason a screen fails this gate.
- [ ] Weight is 400–700 only. No 800/900.
- [ ] Tracking matches scale: tighter/tight on display, wide/widest on uppercase labels, flat on body.
- [ ] Sentence case everywhere except 10–12px tracked labels and CTAs.
- [ ] Space Mono only on tiny numeric meta (coordinates, dates, counters) — never display or letter-heavy.

## Layout & whitespace

- [ ] Generous air — 64–96px between feed items, 48–64px between sections.
- [ ] Reading surfaces are single-column `max-w-4xl`; sidebars only on admin/settings.
- [ ] Composition is hard-left / asymmetric, not timidly centred.
- [ ] Imagery is `radius-none` (sharp), correct aspect ratio, no drop shadow, no overlay.
- [ ] Borders/hairlines carry hierarchy; shadows are absent unless a modal/explicit lift needs one.
- [ ] Radius is 2px default · 6px modals · 9999px avatars only.

## Components

- [ ] Reused an existing component instead of forking a one-off variant.
- [ ] Ratings are 1–3 **dots** (filled **black**, a reward not a scale), never stars, never padded with empty/deactivated rings (no dots is valid and complete).
- [ ] Feed cards are unboxed — no border, background, or shadow.
- [ ] In-content actions use the editorial `.cta-link` (text + `→`), not filled buttons, where appropriate.
- [ ] Icons are Lucide, 1.5px stroke, `currentColor`, informative (never decorative, never lime).- [ ] No emoji, no spot illustrations, no invented vector art.

## Imagery

- [ ] Photo-less slots use `.photo-placeholder` with a `data-label`, not a blank/flat-grey box, gradient,
      or invented art.
- [ ] Real photos tend cool/documentary; no warm saturated lifestyle stock.

## Content & voice

- [ ] Copy is quiet, imperative, no hype words, no emoji, real em dashes and middots.
- [ ] Rating language uses Impressive / Essential / Masterpiece.
- [ ] CTAs sentence case (buttons) or uppercase tracked + `→` (editorial).

## Accessibility (see ACCESSIBILITY.md)

- [ ] AA contrast; `text-disabled` only on non-essential meta.
- [ ] Keyboard reachable; `focus-visible` **lime** ring (2px + 2px white offset) intact; touch targets ≥ 44px.
- [ ] No colour-only signals; `prefers-reduced-motion` respected; images/icons labelled.

## Process

- [ ] Reconciled with the live repo (existing components, Tailwind config) — didn't reinvent or overwrite
      working patterns.
- [ ] Changed only what was asked; surrounding layout, spacing, and tokens left intact.
