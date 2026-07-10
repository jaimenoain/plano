# Patterns — page composition recipes

Copy a recipe, then adjust. Compose from existing components (`COMPONENTS.md`) and size with tokens
(`TOKENS-AND-TAILWIND.md`). The constants across every Plano surface: single-column `max-w-4xl` for
reading, hard-left anchoring, enormous vertical air, sharp imagery, monochrome + the rationed lime.

---

## Hero (landing / section opener)

Tiny eyebrow → giant headline → one-line sub → one action.

```
eyebrow   .eyebrow  (10px, uppercase, 0.08em, text-secondary)
headline  .display  → clamp(3.5rem, 11vw, 8rem), 700, -0.045em, lh 0.92
sub       .body-relaxed, ~18px, text-secondary, max-width ~52ch
action    one lime primary button + one .cta-link beside it
spacing   24px eyebrow→headline · 32px headline→sub · 48px sub→action
          ≥96px of air below the whole block before anything else
```

Signature move: italicise **one** word of the headline (Inter italic) for emphasis. Don't hedge the size —
the hero is where the type-scale lever does the most work.

## Feed (the gallery surface)

The most distinctive surface — it deliberately does not look like a social app, it looks like a magazine.

```
shell       desktop = AppTopNav + a fluid centre feed column + a 320px sticky right rail
column      the feed column reads comfortably narrow; content centred for reading
per item    a Feed item (COMPONENTS.md) — no box, no border, no shadow
gap         64–96px between items
section     a tiny uppercase eyebrow (FEATURED / NEARBY YOU / NEW IN LONDON) above a run of items
```

No card containers anywhere in the feed. Structure is type scale + whitespace, full stop.

## Building detail — `src/features/buildings/`

```
hero        full-bleed building photo (radius-none) OR .photo-placeholder at 16/9
title       .display or .headline, hard-left, building name; rating dots inline if awarded
meta        architect · city · year — .body-secondary; coordinates in .meta-code if shown
actions     editorial CTAs (.cta-link): LOG VISIT → · SAVE → · REVIEW → · DIRECTIONS →
            (or a single lime primary button for the key action)
body        single column max-w-4xl: description, reviews, photos
reviews     each = small avatar + who + rating dots + prose; hairline separators, no boxes
spacing     64px+ between major sections
```

## Profile / architect profile — `src/features/`

```
header      avatar (radius-full) + display-name + .meta-code counts (12 buildings · 4 collections)
            architect profile adds: Briefcase portfolio, BadgeCheck if verified
tabs        quiet text tabs (Visited / Wants to visit / Collections / Reviews), not pills
grid        building entries as feed items or a mosaic
mosaic      collection mosaic = 168px cells (--collection-mosaic), 1.5px hairline gap (--mosaic-gap)
```

## Map / search — `src/features/`

```
layout      map fills the viewport (MapLibre GL); results in a left column
serp        results column width = 400px (--search-serp)
markers     MapPin, currentColor — never lime
result row  thumbnail (radius-none) + name + .meta-code (distance · year); hairline separators
nav over map  may use the glass utility (backdrop-blur-xl + 70% white tint)
```

## Modal / dialog — `src/components/ui/dialog.tsx`

```
surface     white fill, radius-lg (6px), shadow-lg
backdrop    black 50%
title       h3 (20px semibold), sentence case
body        body text, generous padding (24–32px)
actions     right-aligned: ghost "Cancel" + primary action
destructive confirm  the ONE place a saturated feedback fill is allowed on a button
```

## Forms / settings — admin surface

```
card        admin card: 1px border-default, white fill, radius-sm, no shadow
labels      14px text-primary; helper text 12px text-secondary
inputs      shadcn Input — border-default, radius-sm; focused border → border-strong + lime focus ring (2px + 2px white offset)
layout      sidebar layout is allowed here (and only here + admin)
spacing     24–32px field groups
```

## Empty states

Never a blank panel. An empty state is a small editorial composition:

```
eyebrow   a quiet uppercase label (NOTHING HERE YET)
line      one sentence, imperative, text-secondary ("Log your first visit to start your catalogue.")
action    one .cta-link or one primary button
```

No spot illustration, no emoji, no cartoon. If a visual is needed, use a `.photo-placeholder`.

## Toasts / feedback

- Quiet by default. The rating-boost toast (*"You just boosted this building's rank!"*) is the one playful
  moment — keep everything else plain.
- Feedback colour appears as a **10px dot** next to the label (success green, amber, red), not as a fill.
- Saturated feedback fills are reserved for destructive-modal confirm buttons only.

---

## Motion (applies everywhere)

- **Minimal**, Framer Motion but restrained.
- Entry: fade + 12px y-translate, 600ms ease-out, optional 150ms stagger.
- Hover: 150ms colour change only — no scale, no lift.
- Press: `active:scale-[0.98]` on buttons; `whileTap: scale 0.9` on rating input. Nothing else squishes.
- **No** bounces, spring overshoots, parallax, or scroll-driven effects.
- Respect `prefers-reduced-motion` — see ACCESSIBILITY.md.

## The four things that make any new surface read as Plano

1. Push the headline scale (don't hedge to medium).
2. Give it air — 64–96px between sections.
3. Anchor hard-left, asymmetric; `max-w-4xl` for reading.
4. Stay monochrome; lime is spent only on its sanctioned uses (primary button, focus ring, hover `→`, one `.accent-tag` pill) — never as decoration. Rating dots are black, shown only when earned.
