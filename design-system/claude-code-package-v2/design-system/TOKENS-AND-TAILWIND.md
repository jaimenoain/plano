# Tokens → Tailwind / shadcn

This is the bridge between the design tokens (`plano-tokens.css`, CSS variables) and the way Plano is actually
built (Tailwind + shadcn/ui). **Every** colour, spacing, radius, and font value in code must resolve to
a token here. Raw hex, raw `px`, and non-system fonts are lint errors (`adherence.oxlintrc.json`).

> **First step, every time: reconcile with the live config.** Read the repo's `tailwind.config.*`
> (Tailwind v3) or the `@theme` block in the global CSS (Tailwind v4) before adding anything. Extend
> what's missing; never silently change a value that already exists. The tables below are the intended
> values — if the repo differs, surface the discrepancy rather than overwriting working code.

---

## Colour tokens

Raw palette ramps exist for reference (`--palette-*`) but **components must use the semantic aliases**,
never the raw palette directly.

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `--surface-default` | `#FAFAFA` | Page background |
| `--surface-card` | `#FFFFFF` | Cards, form surfaces |
| `--surface-overlay` | `#FFFFFF` | Popovers, menus |
| `--surface-muted` | `#F5F5F5` | Muted fills, outline-button hover |
| `--surface-inverse` | `#000000` | **Only** the global menu, mobile sidebar, site footer |

### Text

| Token | Hex | Use |
|---|---|---|
| `--text-primary` | `#171717` | Default text, headlines |
| `--text-secondary` | `#525252` | Subtitles, meta, secondary copy |
| `--text-disabled` | `#A3A3A3` | Disabled labels, far-meta (timestamps) |
| `--text-inverse` | `#FFFFFF` | Text on inverse surfaces |

### Borders

| Token | Hex | Use |
|---|---|---|
| `--border-default` | `#E5E5E5` | Hairlines, card borders, default separators |
| `--border-strong` | `#A3A3A3` | Active / focused border |
| `--border-hairline` | `rgba(0,0,0,0.08)` | The finest editorial separator |

### Brand & accent

| Token | Hex | Use |
|---|---|---|
| `--brand-primary` | `#171717` | **Neutral action + all text = black.** Not the lime CTA |
| `--brand-primary-hover` | `#000000` | Primary hover |
| `--brand-primary-foreground` | `#FFFFFF` | Text on primary |
| `--brand-accent` | `#BEFF00` | The lime — **sanctioned uses:** primary CTA button, focus ring, hover `→` arrow, `.accent-tag` pill (+ `::selection`, bell dot). Not rating dots — those are black |
| `--brand-accent-hover` | `#9ACC00` | Lime hover (darken) |
| `--brand-accent-foreground` | `#171717` | Dark text on lime |
| `--brand-secondary` | `#F5F5F5` | Secondary fill |
| `--brand-secondary-foreground` | `#171717` | Text on secondary |

### Feedback (dots, not fills)

Use as **10px status dots next to labels**, not surface fills. Saturated feedback fills are reserved for
destructive-modal confirm actions only. Success green is a deliberately different hue from brand lime so
"success" and "brand" never conflate.

| Token | Hex |
|---|---|
| `--feedback-success` / `-foreground` | `#16A34A` / `#FFFFFF` |
| `--feedback-warning` / `-foreground` | `#F59E0B` / `#171717` |
| `--feedback-destructive` / `-foreground` | `#EF4444` / `#FFFFFF` |

---

## Typography tokens

- **Family:** `--font-sans: 'Inter'` for everything · `--font-mono: 'Space Mono'` for tiny numeric meta only.
- **Weights:** `--fw-normal` 400 · `--fw-medium` 500 · `--fw-semibold` 600 · `--fw-bold` 700. **Never 800/900.**
- **Line-height:** `--lh-tight` 1.0 · `--lh-snug` 1.2 · `--lh-normal` 1.5 · `--lh-relaxed` 1.75 · `--lh-display` 0.92.
- **Tracking:** `--tracking-tighter` −0.045em (poster headlines) · `--tracking-tight` −0.03em (large display)
  · `--tracking-normal` 0 · `--tracking-wide` 0.08em · `--tracking-widest` 0.15em (uppercase labels/CTAs).

### Font-size scale

| Token | px | Use |
|---|---|---|
| `--fs-2xs` | 10 | Micro labels, eyebrows, uppercase meta |
| `--fs-xs` | 12 | Captions, badges |
| `--fs-sm` | 14 | Secondary text |
| `--fs-base` | 16 | Body |
| `--fs-lg` | 18 | Lead |
| `--fs-xl` | 20 | Card titles (h3) |
| `--fs-2xl` | 24 | h3 |
| `--fs-3xl` | 32 | h2 |
| `--fs-4xl` | 40 | h1 |
| `--fs-5xl` | 48 | Feed name (floor) |
| `--fs-6xl` | 60 | Feed name (ceiling) |
| `--fs-7xl` | 72 | — |
| `--fs-8xl` | 96 | Editorial display |
| `--fs-9xl` | 128 | **Poster-scale hero. This is the move. Use it.** |

Heroes use `clamp(3.5rem, 11vw, 8rem)`; feed names use `clamp(2.5rem, 6vw, 3.75rem)`.

---

## Spacing scale (4px base)

| Token | px | | Token | px |
|---|---|---|---|---|
| `--space-1` | 4 | | `--space-8` | 32 |
| `--space-2` | 8 | | `--space-10` | 40 |
| `--space-3` | 12 | | `--space-12` | 48 (section-gap floor) |
| `--space-4` | 16 | | `--space-16` | 64 (editorial gap) |
| `--space-5` | 20 | | `--space-20` | 80 |
| `--space-6` | 24 (card padding) | | `--space-24` | 96 (the big editorial gap) |
| | | | `--space-32` | 128 |

Default generously: card padding 24–32, section gaps 48–64, page margins 32–48, feed-item gaps 64–96.

## Radius — sharp by default

| Token | px | Use |
|---|---|---|
| `--radius-none` | 0 | **All imagery** — true sharp edges |
| `--radius-sm` | 2 | Everything — cards, buttons, inputs |
| `--radius-md` | 4 | — |
| `--radius-lg` | 6 | Modals, sheets |
| `--radius-xl` | 8 | Rare |
| `--radius-full` | 9999 | **Avatars only** |

## Shadows — borders do the work

| Token | Value | Use |
|---|---|---|
| `--shadow-none` | none | Default (almost everything) |
| `--shadow-sm` | `0 1px 2px rgb(0 0 0/.04)` | Rare |
| `--shadow-md` | `0 2px 8px rgb(0 0 0/.06)` | Cards needing explicit lift |
| `--shadow-lg` | `0 8px 24px rgb(0 0 0/.10)` | Modals, popovers |

**Never** an inner shadow. **Never** a coloured glow.

## Named layout tokens

| Token | Value | Use |
|---|---|---|
| `--card-image-ratio-hero` | 16/9 | Hero imagery |
| `--card-image-ratio-standard` | 4/3 | Standard cards |
| `--card-image-ratio-compact` | 1/1 | Compact / square |
| `--collection-mosaic` | 168px | Collection mosaic cell |
| `--mosaic-gap` | 1.5px | Hairline between mosaic cells |
| `--search-serp` | 400px | Map search results column width |

---

## Mapping to Tailwind

### Tailwind v3 (`tailwind.config.{js,ts}` → `theme.extend`)

Point Tailwind utilities at the CSS variables so `plano-tokens.css` stays the single source of truth:

```js
// tailwind.config.js — extend, don't replace existing keys
export default {
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'var(--surface-default)',
          card: 'var(--surface-card)',
          muted: 'var(--surface-muted)',
          inverse: 'var(--surface-inverse)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          disabled: 'var(--text-disabled)',
          inverse: 'var(--text-inverse)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        brand: {
          DEFAULT: 'var(--brand-primary)',
          accent: 'var(--brand-accent)',
          'accent-hover': 'var(--brand-accent-hover)',
        },
        feedback: {
          success: 'var(--feedback-success)',
          warning: 'var(--feedback-warning)',
          destructive: 'var(--feedback-destructive)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': 'var(--fs-2xs)', xs: 'var(--fs-xs)', sm: 'var(--fs-sm)',
        base: 'var(--fs-base)', lg: 'var(--fs-lg)', xl: 'var(--fs-xl)',
        '2xl': 'var(--fs-2xl)', '3xl': 'var(--fs-3xl)', '4xl': 'var(--fs-4xl)',
        '5xl': 'var(--fs-5xl)', '6xl': 'var(--fs-6xl)', '7xl': 'var(--fs-7xl)',
        '8xl': 'var(--fs-8xl)', '9xl': 'var(--fs-9xl)',
      },
      letterSpacing: {
        tighter: 'var(--tracking-tighter)', tight: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)', wide: 'var(--tracking-wide)',
        widest: 'var(--tracking-widest)',
      },
      borderRadius: {
        none: 'var(--radius-none)', sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)',
      },
    },
  },
}
```

Spacing: Tailwind's default 4px scale already matches the token scale (`p-6` = 24, `gap-24` = 96), so you
usually don't need to remap spacing — just use the numeric utilities.

### Tailwind v4 (`@theme` in the global CSS)

```css
@import "tailwindcss";
@theme {
  --color-surface: #FAFAFA;
  --color-surface-card: #FFFFFF;
  --color-text-primary: #171717;
  --color-text-secondary: #525252;
  --color-border: #E5E5E5;
  --color-brand: #171717;
  --color-brand-accent: #BEFF00;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Space Mono', ui-monospace, monospace;
  --radius-sm: 2px;
  /* …extend with the remaining tokens from plano-tokens.css… */
}
```

In v4, keep `plano-tokens.css` as the human-readable reference and mirror the values into `@theme` (v4 generates
utilities from `@theme` variables directly).

### shadcn/ui

shadcn components read CSS variables like `--background`, `--foreground`, `--primary`, `--ring`, `--radius`.
Map shadcn's variables onto Plano tokens in the global stylesheet so every shadcn primitive inherits the
system automatically:

```css
:root {
  --background: var(--surface-default);
  --foreground: var(--text-primary);
  --card: var(--surface-card);
  --muted: var(--surface-muted);
  --border: var(--border-default);
  --input: var(--border-default);
  --primary: var(--brand-primary);            /* black — generic shadcn primary (kept off lime) */
  --primary-foreground: var(--brand-primary-foreground);
  --ring: var(--brand-accent);                /* lime focus ring, 2px + 2px white offset */
  --destructive: var(--feedback-destructive);
  --radius: var(--radius-sm);                 /* 2px — sharp */
}
```

Note: shadcn's generic `--primary` stays **black** so lime doesn't bleed onto every primary-coloured
primitive (checkboxes, switches, etc.). The **lime primary CTA button is the Button `accent` variant**
(`bg-brand-accent`, dark text) — see COMPONENTS.md. The focus ring (`--ring`) **is** lime, with a 2px white
offset. Lime is also used for the `.accent-tag` pill, `::selection`, and the bell dot. Rating dots are
**black** (`brand-primary`) — a reward shown only when earned, never lime (poor contrast on white).

---

## Quick reference: utility classes from `plano-tokens.css`

These ship in `plano-tokens.css` and can be used directly or used as the spec for Tailwind equivalents:

- `.display` / `.hero` — the 96–128px poster headline (`clamp(3.5rem, 11vw, 8rem)`, 700, −0.045em, lh 0.92).
- `.headline` — feed building-name (`clamp(40px, 6vw, 60px)`, 700, −0.03em).
- `.eyebrow` / `.label-upper` — 10px uppercase tracked label, `text-secondary`.
- `.cta-link` — editorial CTA: uppercase tracked text + `→`, no button container.
- `.body-secondary` / `.body-relaxed` — secondary and relaxed (1.75 lh) body.
- `.meta-code` — Space Mono numeric meta (coordinates, date ranges, counters), 12px.
- `.hairline` — the 0.5px separator (use instead of shadows).
- `.photo-placeholder` — on-brand image stand-in (diagonal hatch + `data-label` caption). See PATTERNS.md.
- `.accent-tag` — the sanctioned lime status pill (BETA / NEW / LIVE), at most one per view. Not a section accent, verified badge, or surface fill.
