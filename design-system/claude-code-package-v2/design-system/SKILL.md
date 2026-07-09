---
name: Plano Design System
description: Editorial, monochrome-plus-one-accent design system for Plano — a "Letterboxd for buildings" social platform for architecture enthusiasts. Use these tokens and patterns whenever designing any Plano surface (web, PWA, marketing, print) so the work reads as part of the Plano world and not a generic product.
when_to_use: Any time you are designing, mocking, coding, or generating visual content for Plano. Also useful as a reference when building adjacent architectural/editorial products.
---

# Plano Design System — Skill Manifest

**Product:** Plano — a social catalogue for architecture. Users log buildings they visit, rate them on a 1–3 Michelin-style scale (Impressive / Essential / Masterpiece), write reviews with photos, follow friends and architects, curate multi-day itineraries, and discover architecture on an interactive map.

**Stack context:** React 18 + Vite SPA, TypeScript, Tailwind + shadcn/ui, Supabase backend, MapLibre GL for maps. Tokens mirror `docs/DESIGN_TOKENS.md` from the source repo.

---

## The aesthetic in one breath

A24 / OMA / Zaha. An architecture magazine, not a social app. Near-zero chrome. Whitespace *is* the structure. The drama is the jump from a 10px tracked label to a 128px headline — and the restraint to do nothing else. Get the type scale and the whitespace right and Plano looks expensive; get timid with either and it looks like a wireframe.

**Where slickness actually comes from here.** With colour, gradients, shadows, and decoration all off the table, three levers carry every surface. Spend your effort here:

1. **Type-scale contrast — push it.** This is the lever people under-use. A hero headline is `clamp(3.5rem, 11vw, 8rem)` — *96 to 128px* — not 48. A safe medium size is the single most common reason a Plano mock looks flat. Go big or it doesn't read as Plano.
2. **Whitespace as architecture.** 96px+ between feed items. 64px+ between sections. Let single elements own enormous empty fields. Air is not wasted space — it's the composition.
3. **Asymmetry and the grid.** Editorial layouts are rarely centred. Anchor a headline hard-left, let it run wide, set meta in a narrow column beside it. Single-column `max-w-4xl` for reading; off-centre for impact.

---

## Recipes — copy these, then adjust

**Hero (landing / section opener).** Tiny eyebrow → giant headline → one-line sub → one action.
```
eyebrow   .eyebrow (10px, uppercase, 0.08em, text-secondary)
headline  .display  → clamp(3.5rem, 11vw, 8rem), weight 700, -0.045em, lh 0.92
sub       .body-relaxed, ~18px, text-secondary, max-width ~52ch
action    one primary button + one .cta-link beside it
spacing   24px eyebrow→headline · 32px headline→sub · 48px sub→action
          ≥96px of air below the whole block before anything else
```
Optionally italicise one word of the headline (Inter italic) for emphasis — that's the kit's signature move.

**Feed item (the gallery surface).** No box, no border, no shadow.
```
eyebrow   .eyebrow → VISITED · WANTS TO VISIT · COLLECTION · 12 BUILDINGS
name      .headline → clamp(2.5rem, 6vw, 3.75rem), 700, tight
subtitle  architect · city, .body-secondary
image     0px radius, full-bleed within column, real photo or .photo-placeholder
footer    hairline; likes/comments far-left, bookmark far-right; .meta-code counts
gap       64–96px between items
```

**Section header.** Numbered, quiet, hard-left.
```
01 / TRACK     .eyebrow, the number + label set the rhythm
Headline       h2/h3, sentence case
body           one or two lines, text-secondary
```

**Image, every time.** Real photography if you have it; otherwise `.photo-placeholder` with a `data-label` naming the building. A photo-less surface should look *deliberate, awaiting art* — never blank, never a flat grey box, never invented SVG art.
```html
<div class="photo-placeholder" style="aspect-ratio: var(--card-image-ratio-hero)"
     data-label="Barbican Centre · 1982"></div>
```

---

## Tokens — the working set

Don't reach past these in normal work. The full ramps exist in `colors_and_type.css` for reference; the subset below is what you actually compose with.

- **Surfaces:** `--surface-default` (#FAFAFA page) · `--surface-card` (#FFFFFF) · `--surface-muted` (#F5F5F5) · `--surface-inverse` (#000000, menu/footer only).
- **Text:** `--text-primary` (#171717) · `--text-secondary` (#525252) · `--text-disabled` (#A3A3A3) · `--text-inverse` (#FFFFFF).
- **Borders:** `--border-default` (#E5E5E5) · `--border-strong` (#A3A3A3 active/focus).
- **Accent:** `--brand-accent` (#BEFF00) — rationed to the **four sanctioned uses** (see below); the primary button is lime, most other chrome is `--brand-primary` (#171717, black).
- **Type scale you'll actually use:** `--fs-2xs` (10px labels) · `--fs-sm`/`--fs-base` (body) · `--fs-3xl` (h2) · `--fs-5xl`/`--fs-6xl` (feed names) · `--fs-8xl`/`--fs-9xl` (heroes).
- **Spacing rhythm:** `--space-6` (24, card padding) · `--space-8` (32) · `--space-12` (48, section gap floor) · `--space-16`/`--space-24` (64/96, the editorial gaps).
- **Radius:** `--radius-sm` (2px, everything) · `--radius-none` (0px, all imagery) · `--radius-full` (avatars only).

## Type & weight

- **Inter for everything.** Weights 400–700 only. Hierarchy is size + tracking, never weight-stacking (no 800/900).
- **Space Mono sparingly** — 11–13px, numeric-heavy content only (coordinates, date ranges, counters). Never letter-heavy labels, never display sizes.
- Tracking: `--tracking-tighter` (−0.045em) on poster headlines · `--tracking-tight` (−0.03em) on large display · `--tracking-wide`/`--tracking-widest` (0.08–0.15em) on uppercase labels and CTAs. Body is flat.

## The lime accent — rationed

Exactly four sanctioned uses. Treat it as one fixture per room.
1. Primary-button fills.
2. Focus rings (2px, 2px white offset, `focus-visible` only).
3. The hover `→` arrow (moves 3px right, colours lime).
4. One small status pill per view — `.accent-tag` (BETA / NEW / LIVE).

The `::selection` highlight and the bell unread dot are also lime. Anywhere else — section accents, surface fills, verified badges, decorative splashes — it's a bug. The logo is always `currentColor`, never recoloured to lime.

## Content & voice

- Sentence case everywhere except 10–12px tracked labels and CTAs (those are uppercase).
- Imperative, confident, quiet. "Log your journey." "Follow architects." No hype words. No emoji, ever. Real em dashes (—), apostrophes, and `·` middots.
- Ratings are 1–3 Michelin dots (Impressive / Essential / Masterpiece) — never stars. A **reward, not a scale**: show only earned dots (filled **black**, `fill-brand-primary`), never padded with empty rings. No lime — poor contrast on white.

## Iconography

Lucide only, 1.5px stroke, inherit `currentColor`, never decorative, never lime. 16px inline, 20–24px nav.

---

## Hard noes (these break Plano instantly)

- Gradients, textures, noise — flat colour only.
- New colours, or **any lime beyond its sanctioned uses** (primary button, focus ring, hover `→` arrow, one `.accent-tag` pill, `::selection`, bell dot). No lime section accents, surface fills, verified badges, lime icons/markers, or lime rating dots.
- Rating dots as a 0–3 scale or padded with empty rings — they're an earned reward; show only the earned black dots.
- Hedging the headline scale to a safe medium — the system lives or dies on the size jump.
- Boxed feed cards, drop shadows where a hairline would do, inner shadows, coloured glows.
- Star ratings · rounded/pill buttons · ALL-CAPS sentences.
- Emoji · illustrated/spot-illustration SVGs · invented vector art · a recoloured wordmark.
- A blank or flat-grey image area — use `.photo-placeholder` instead.

## Files in this skill

- `README.md` — complete system narrative (content + visual + iconography foundations).
- `SOURCE-OF-TRUTH.md` — which file wins when docs disagree; the current canonical rules.
- `MIGRATION.md` — the refresh playbook: order to work in and the gates to pass.
- `TOKENS-AND-TAILWIND.md` · `COMPONENTS.md` · `PATTERNS.md` · `LAYOUT-AND-CHROME.md` ·
  `VOICE-AND-CONTENT.md` · `ACCESSIBILITY.md` · `CHECKLIST.md`.
- `plano-tokens.css` — portable token mirror (tokens + `.photo-placeholder`). **Drop it into any HTML
  and it looks Plano.** Authoritative values live in `docs/DESIGN_TOKENS.md`.
- `assets/plano-logo.svg` — wordmark (uses `currentColor`).
- The repo's existing `design-system/preview/*.html` and `ui_kits/web/` remain the visual specimens and
  the working app recreation — use them as reference when building new surfaces.
