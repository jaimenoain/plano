# Plano: Design Tokens

> **Authoritative source for all visual design decisions.**
> Token values are reflected in `apps/web/tailwind.config.ts`. Update this file when changing design decisions, then sync `tailwind.config.ts` to match.

---

## 1. Design Intent

**Personality:** Editorial, modern, minimalist, sharp, photographic, architectural

**Reference products:** A24 Films (a24films.com) — aggressive sans-serif typography at extreme scale, monochromatic palette (black/gray/white), zero UI chrome, generous whitespace as structure, content floats directly on white canvas. Contemporary architecture studio websites (OMA, BIG, Zaha Hadid Architects) — photography-first layouts, sharp geometry, zero ornamentation.

**Editorial direction:** The feed, content detail pages (building, profile, architect), and all primary-surface pages follow an editorial magazine aesthetic. Typography weight and scale create hierarchy — not borders, not shadows, not card containers. Content sits directly on the white surface. The contrast between tiny uppercase category labels and massive bold headlines *is* the design. Whitespace is not empty space — it is editorial pause. Images are presented raw, with sharp edges and no decorative chrome.

**Monochromatic content surfaces:** All content and feed pages are strictly monochromatic. Rating dots, active tab indicators, section accent bars, verified badges, icon fills, filter toggles, and interactive icon states all use `text-primary` (`#171717`). **`brand-primary` is near-black (`#171717`) — the primary action colour is black, not lime.** The lime (`#BEFF00`) lives in a separate `brand-accent` token and is reserved for: text selection highlight (`::selection`) and the notification dot on the bell icon. Focus rings and CTA arrows now use monochromatic signals. If `brand-accent` appears anywhere on a content or feed page outside those two contexts, it is an error.

**Single-column editorial layout:** Content detail pages (building detail, profile, architect profile) use a single-column `max-w-4xl` layout. No right sidebars on content pages. The sidebar pattern is restricted to admin and settings contexts.

**CTA pattern:** In editorial contexts, calls to action are rendered as uppercase tracked text with a `→` arrow — never a filled button. Format: `text-xs font-medium uppercase tracking-widest`. On hover, the label text dims to `text-secondary` and the `→` arrow remains `text-primary`. This applies to all in-page action links (review, save, follow, directions, etc.) outside of modal and form contexts.

**App shell:** The application uses a **horizontal sticky top navigation bar** (logo + nav links + search + primary CTA + bell + avatar), not a left sidebar. The body is a two-column grid: a fluid center feed column and a 320px sticky right rail.

**Mode:** Light only

---

## 2. Colour Palette

### Raw Palette (never use these directly in components — use semantic aliases below)

| Token | Hex | Usage |
|---|---|---|
| `palette-brand-50` | `#F7FFE0` | Barely-there neon tint — hover surfaces |
| `palette-brand-100` | `#EEFFB8` | Light neon wash — selected rows, active states |
| `palette-brand-200` | `#DEFF82` | Soft neon — secondary badges, tag backgrounds |
| `palette-brand-300` | `#CFFF4A` | Medium neon — progress indicators |
| `palette-brand-400` | `#C5FF1E` | Strong neon — active focus rings |
| `palette-brand-500` | `#BEFF00` | **Primary neon accent — the one colour** |
| `palette-brand-600` | `#9ACC00` | Hover state for primary actions |
| `palette-brand-700` | `#739900` | Pressed state, high-contrast contexts |
| `palette-brand-800` | `#4D6600` | Dark neon — foreground on light brand surfaces |
| `palette-brand-900` | `#2B3A00` | Darkest neon shade — rarely used |
| | | |
| `palette-neutral-50` | `#FAFAFA` | Page background |
| `palette-neutral-100` | `#F5F5F5` | Muted surfaces — sidebars, code blocks |
| `palette-neutral-200` | `#E5E5E5` | Default borders, dividers |
| `palette-neutral-300` | `#D4D4D4` | Subtle borders, separator lines |
| `palette-neutral-400` | `#A3A3A3` | Disabled text, placeholder text |
| `palette-neutral-500` | `#737373` | Mid-gray — icons, metadata |
| `palette-neutral-600` | `#525252` | Secondary body text |
| `palette-neutral-700` | `#404040` | Strong secondary text |
| `palette-neutral-800` | `#262626` | Near-black — headings, emphasis |
| `palette-neutral-900` | `#171717` | Primary text — body copy |
| `palette-neutral-950` | `#0A0A0A` | Maximum contrast — hero text |
| | | |
| `palette-success-500` | `#16A34A` | Success states (differentiated from brand lime by hue: true green) |
| `palette-warning-500` | `#F59E0B` | Warning states — amber |
| `palette-destructive-500` | `#EF4444` | Error and destructive actions — red |

### Semantic Aliases — Light Mode

These are the only colour tokens Cursor and components are permitted to use.

| Alias | Resolves to | Purpose |
|---|---|---|
| `brand-primary` | `palette-neutral-900` · `#171717` | **Primary actions — near-black button colour.** |
| `brand-primary-hover` | `#000000` | Hover state for primary actions (pure black) |
| `brand-primary-foreground` | `#FFFFFF` | Text/icons on brand-primary background (white on black) |
| `brand-accent` | `palette-brand-500` · `#BEFF00` | The lime accent — used sparingly (text selection highlight, notification dot) |
| `brand-accent-hover` | `palette-brand-600` · `#9ACC00` | Hover state for accent elements |
| `brand-accent-foreground` | `palette-neutral-900` · `#171717` | Text/icons on brand-accent background (dark on lime) |
| `brand-secondary` | `palette-neutral-100` · `#F5F5F5` | Secondary surfaces — muted tonal background |
| `brand-secondary-foreground` | `palette-neutral-900` · `#171717` | Text on brand-secondary background |
| `surface-default` | `palette-neutral-50` · `#FAFAFA` | Page background |
| `surface-card` | `#FFFFFF` | Card and panel background |
| `surface-overlay` | `#FFFFFF` | Modal and popover background |
| `surface-muted` | `palette-neutral-100` · `#F5F5F5` | Muted/subdued surface — code blocks, input backgrounds, skeletons |
| `surface-inverse` | `#000000` | Pitch-black surface — overlaid menus, dark panels, tweaks panel |
| `border-default` | `palette-neutral-200` · `#E5E5E5` | Default border — cards, inputs, dividers |
| `border-strong` | `palette-neutral-400` · `#A3A3A3` | Emphasis border — focus, selected states |
| `border-hairline` | `rgba(0,0,0,0.08)` | Softest separator — lighter than `border-default`, for density contexts |
| `text-primary` | `palette-neutral-900` · `#171717` | Primary body text |
| `text-secondary` | `palette-neutral-600` · `#525252` | Secondary/supporting text |
| `text-disabled` | `palette-neutral-400` · `#A3A3A3` | Disabled and placeholder text |
| `text-inverse` | `#FFFFFF` | Text on dark backgrounds |
| `feedback-success` | `palette-success-500` · `#16A34A` | Success states |
| `feedback-success-foreground` | `#FFFFFF` | Text on success background |
| `feedback-warning` | `palette-warning-500` · `#F59E0B` | Warning states |
| `feedback-warning-foreground` | `palette-neutral-900` · `#171717` | Text on warning background (dark on amber) |
| `feedback-destructive` | `palette-destructive-500` · `#EF4444` | Error and destructive actions |
| `feedback-destructive-foreground` | `#FFFFFF` | Text on destructive background |

### Semantic Aliases — Dark Mode

Dark mode: not configured.

---

## 3. Typography

| Token | Value | Notes |
|---|---|---|
| `font-sans` | `'Inter', sans-serif` | Neutral grotesk — excellent legibility at UI sizes, clean at editorial display sizes. Optical sizing via Google Fonts. |
| `font-mono` | `'Space Mono', monospace` | Technical contrast to Inter — building IDs, coordinates, metadata codes. Google Fonts. |
| `font-size-2xs` | `0.625rem` | 10px — micro labels (avatar fallbacks, section dividers); Tailwind `text-2xs` |
| `font-size-2xs-plus` | `0.6875rem` | 11px — uppercase meta / status chips; Tailwind `text-2xs-plus` |
| `font-size-xs` | `0.75rem` | 12px — captions, timestamps, badge labels |
| `font-size-sm` | `0.875rem` | 14px — secondary text, table cells, form labels |
| `font-size-base` | `1rem` | 16px — body copy |
| `font-size-lg` | `1.125rem` | 18px — lead text, card descriptions |
| `font-size-xl` | `1.25rem` | 20px — card titles |
| `font-size-2xl` | `1.5rem` | 24px — section headings |
| `font-size-3xl` | `2rem` | 32px — page headings (spacious density: larger than default) |
| `font-size-4xl` | `2.5rem` | 40px — page headings (spacious density) |
| `font-size-5xl` | `3rem` | 48px — editorial feed building names (hero cards) |
| `font-size-6xl` | `3.75rem` | 60px — editorial hero headlines, landing hero |
| `font-size-7xl` | `4.5rem` | 72px — editorial maximum, landing page hero text |
| `font-weight-normal` | `400` | Body text |
| `font-weight-medium` | `500` | Labels, nav items, form labels |
| `font-weight-semibold` | `600` | Headings, emphasis |
| `font-weight-bold` | `700` | Hero text, strong emphasis |
| `line-height-tight` | `1.0` | Massive display headlines — editorial maximum compression |
| `line-height-snug` | `1.2` | Standard headings — tighter than default for editorial lockup |
| `line-height-normal` | `1.5` | Body copy |
| `line-height-relaxed` | `1.75` | Long-form text — reviews, descriptions |
| `letter-spacing-tight` | `-0.03em` | Large headings — slight negative tracking for tight display type |
| `letter-spacing-normal` | `0em` | Body |
| `letter-spacing-wide` | `0.08em` | All-caps labels, badges, table headers |
| `letter-spacing-widest` | `0.15em` | Section labels, CTA text, right-rail labels — maximum tracking |

**Font loading:**

**Inter — local variable font (preferred):** Self-host the Inter variable font (`Inter-VariableFont_opsz_wght.ttf`) and declare it with `@font-face`. This eliminates the Google Fonts round-trip, enables optical sizing (`opsz`), and gives access to the full 100–900 weight range:

```css
@font-face {
  font-family: 'Inter';
  src: url('fonts/Inter-VariableFont_opsz_wght.ttf') format('truetype-variations'),
       url('fonts/Inter-VariableFont_opsz_wght.ttf') format('truetype');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

**Space Mono — Google Fonts:** Space Mono remains loaded via Google Fonts `<link>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

**This repository (React Router 7 + SSR):** font declarations live in `src/root.tsx` — `Layout` component `<head>`. Inter font files are served from `public/fonts/`.

---

## 4. Spacing Scale

Base unit: 4px (`0.25rem`). All spacing tokens are multiples of this base.

The spacious density directive means defaulting to the higher end of the scale for component padding, section gaps, and page margins. Typical defaults: card padding `spacing-6` to `spacing-8`, section gap `spacing-12` to `spacing-16`, page margin `spacing-8` to `spacing-12`.

| Token | Value | Pixels |
|---|---|---|
| `spacing-0` | `0` | 0px |
| `spacing-1` | `0.25rem` | 4px |
| `spacing-2` | `0.5rem` | 8px |
| `spacing-3` | `0.75rem` | 12px |
| `spacing-4` | `1rem` | 16px |
| `spacing-5` | `1.25rem` | 20px |
| `spacing-6` | `1.5rem` | 24px |
| `spacing-8` | `2rem` | 32px |
| `spacing-10` | `2.5rem` | 40px |
| `spacing-12` | `3rem` | 48px |
| `spacing-16` | `4rem` | 64px |
| `spacing-20` | `5rem` | 80px |
| `spacing-24` | `6rem` | 96px |
| `spacing-32` | `8rem` | 128px |

Named layout tokens (exact measures, not constrained to the 4px grid):

| Token | Value | Pixels | Usage |
|---|---|---|---|
| `collection-mosaic` | `10.5rem` | 168px | Feed collection card 2×2 preview (`w-collection-mosaic` / `h-collection-mosaic`) |
| `mosaic-gap` | `1.5px` | 1.5px | Gutter between mosaic cells (`gap-mosaic-gap`) |
| `search-serp` | `25rem` | 400px | Search map results column width (`w-search-serp`, `ml-search-serp`, etc.) |
| `search-serp-alt` (max-width) | `12.5rem` | 200px | Secondary building name line clamp in SERP list rows (`max-w-search-serp-alt`) |

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-none` | `0px` | Flat elements — images, hero sections |
| `radius-sm` | `2px` | **Default** — inputs, buttons, badges, cards |
| `radius-md` | `4px` | Slightly softer — dropdowns, tooltips |
| `radius-lg` | `6px` | Panels, modals |
| `radius-xl` | `8px` | Large cards, sheets (use sparingly) |
| `radius-full` | `9999px` | Avatars only — everything else stays sharp |

**Default component radius:** `radius-sm` (`2px`). The sharp directive means almost no rounding. Elements should feel cut, not moulded. Only avatars use `radius-full`.

---

## 6. Shadows

Shadows are intentionally flat and minimal. The design relies on borders and whitespace for hierarchy, not elevation. Use shadows only when layering is semantically necessary (overlays, dropdowns).

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Subtle lift — inputs on hover |
| `shadow-md` | `0 2px 8px 0 rgb(0 0 0 / 0.06)` | Cards (optional — prefer border-only cards) |
| `shadow-lg` | `0 8px 24px 0 rgb(0 0 0 / 0.10)` | Modals, dropdowns, popovers |
| `shadow-none` | `none` | Default — most elements have no shadow |

---

## 6b. Card Tokens (feed / review cards)

Semantic tokens for the card system (`CardSpec` / `resolveCardSpec`). Values live in `src/index.css` (`:root`); Tailwind utilities reference the CSS variables.

| Token (CSS variable) | Value | Tailwind utility | Archetypes / usage |
|---|---|---|---|
| `--card-image-ratio-hero` | `16 / 9` | `aspect-card-hero` | `media-forward`, hero imagery, gallery-led layouts |
| `--card-image-ratio-standard` | `4 / 3` | `aspect-card-standard` | `balanced` feed imagery, default building/photo frame |
| `--card-image-ratio-compact` | `1 / 1` | `aspect-card-compact` | `compact-stack`, dense thumbnails, small surfaces |
| `--card-text-clamp-snippet` | `2` (lines) | `line-clamp-card-snippet` | `CardTextWeight.snippet` — short review copy |
| `--card-text-clamp-body` | `4` (lines) | `line-clamp-card-body` | `CardTextWeight.body` — medium review copy |
| `--card-elevation-elevated` | `0 2px 8px 0 rgb(0 0 0 / 0.06)` (same as §6 `shadow-md`) | `shadow-card-elevated` | `CardProminence.elevated` — subtle lift vs standard feed chrome |

**Essay** (`CardTextWeight.essay`) is not clamped by these tokens — full body display. **None** text uses no line-clamp utilities.

---

## 7. Tailwind Config Block

The `theme.extend` object that reflects these tokens in `apps/web/tailwind.config.ts`.

```typescript
theme: {
  extend: {
    colors: {
      // --- Raw palette (for reference only — use semantic aliases in components) ---
      palette: {
        brand: {
          50:  '#F7FFE0',
          100: '#EEFFB8',
          200: '#DEFF82',
          300: '#CFFF4A',
          400: '#C5FF1E',
          500: '#BEFF00',
          600: '#9ACC00',
          700: '#739900',
          800: '#4D6600',
          900: '#2B3A00',
        },
        neutral: {
          50:  '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
      },
      // --- Semantic aliases (use ONLY these in components) ---
      'brand-primary':              '#171717',  // Near-black — primary button background
      'brand-primary-hover':        '#000000',
      'brand-primary-foreground':   '#FFFFFF',  // White text on black button
      'brand-accent':               '#BEFF00',  // Lime — text selection, notification dot
      'brand-accent-hover':         '#9ACC00',
      'brand-accent-foreground':    '#171717',
      'brand-secondary':            '#F5F5F5',
      'brand-secondary-foreground': '#171717',
      'surface-default':            '#FAFAFA',
      'surface-card':               '#FFFFFF',
      'surface-overlay':            '#FFFFFF',
      'surface-muted':              '#F5F5F5',
      'surface-inverse':            '#000000',  // Pitch-black surface — menus, overlaid panels
      'border-default':             '#E5E5E5',
      'border-strong':              '#A3A3A3',
      'border-hairline':            'rgba(0,0,0,0.08)',
      'text-primary':               '#171717',
      'text-secondary':             '#525252',
      'text-disabled':              '#A3A3A3',
      'text-inverse':               '#FFFFFF',
      'feedback-success':           '#16A34A',
      'feedback-success-foreground':'#FFFFFF',
      'feedback-warning':           '#F59E0B',
      'feedback-warning-foreground':'#171717',
      'feedback-destructive':       '#EF4444',
      'feedback-destructive-foreground': '#FFFFFF',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Space Mono', 'monospace'],
    },
    fontSize: {
      '2xs':      ['0.625rem',  { lineHeight: '0.875rem' }],
      '2xs-plus': ['0.6875rem', { lineHeight: '0.875rem' }],
      'xs':   ['0.75rem',  { lineHeight: '1rem' }],
      'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem',     { lineHeight: '1.5rem' }],
      'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
      'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
      '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
      '3xl':  ['2rem',     { lineHeight: '2.4rem' }],
      '4xl':  ['2.5rem',   { lineHeight: '3rem' }],
      '5xl':  ['3rem',     { lineHeight: '3.25rem' }],
      '6xl':  ['3.75rem',  { lineHeight: '4rem' }],
      '7xl':  ['4.5rem',   { lineHeight: '4.75rem' }],
    },
    spacing: {
      'collection-mosaic': '10.5rem',
      'mosaic-gap': '1.5px',
      'search-serp': '25rem',
    },
    maxWidth: {
      'search-serp-alt': '12.5rem',
    },
    aspectRatio: {
      'card-hero':     'var(--card-image-ratio-hero)',
      'card-standard': 'var(--card-image-ratio-standard)',
      'card-compact':  'var(--card-image-ratio-compact)',
    },
    lineClamp: {
      'card-snippet': 'var(--card-text-clamp-snippet)',
      'card-body':    'var(--card-text-clamp-body)',
    },
    borderRadius: {
      'none': '0px',
      'sm':   '2px',
      'md':   '4px',
      'lg':   '6px',
      'xl':   '8px',
      'full': '9999px',
      DEFAULT: '2px',
    },
    boxShadow: {
      'sm':   '0 1px 2px 0 rgb(0 0 0 / 0.04)',
      'md':   '0 2px 8px 0 rgb(0 0 0 / 0.06)',
      'lg':   '0 8px 24px 0 rgb(0 0 0 / 0.10)',
      'none': 'none',
      'card-elevated': 'var(--card-elevation-elevated)',
    },
    lineHeight: {
      'tight':   '1.0',   // Massive display headlines
      'snug':    '1.2',   // Standard editorial headings (was "tight" previously)
      'normal':  '1.5',
      'relaxed': '1.75',
    },
    letterSpacing: {
      'tight':   '-0.03em',
      'normal':  '0em',
      'wide':    '0.08em',
      'widest':  '0.15em',  // Section labels, CTA text, right-rail labels
    },
  },
},
```

---

## 8. Shadcn/UI Theme Variables

Shadcn/UI uses CSS custom properties mapped to HSL values. These must be set in
`apps/web/app/globals.css` (or `src/index.css` for Vite projects) to align Shadcn
primitives with the project's tokens.

```css
@layer base {
  :root {
    --background:             0 0% 98%;           /* surface-default #FAFAFA */
    --foreground:             0 0% 9%;            /* text-primary #171717 */
    --card:                   0 0% 100%;          /* surface-card #FFFFFF */
    --card-foreground:        0 0% 9%;            /* text-primary #171717 */
    --popover:                0 0% 100%;          /* surface-overlay #FFFFFF */
    --popover-foreground:     0 0% 9%;            /* text-primary #171717 */
    --primary:                0 0% 9%;             /* brand-primary #171717 — near-black buttons */
    --primary-foreground:     0 0% 100%;          /* brand-primary-foreground #FFFFFF — white on black */
    --secondary:              0 0% 96%;           /* brand-secondary #F5F5F5 */
    --secondary-foreground:   0 0% 9%;            /* brand-secondary-foreground #171717 */
    --muted:                  0 0% 96%;           /* surface-muted #F5F5F5 */
    --muted-foreground:       0 0% 32%;           /* text-secondary #525252 */
    --accent:                 0 0% 96%;           /* surface-muted #F5F5F5 */
    --accent-foreground:      0 0% 9%;            /* text-primary #171717 */
    --destructive:            0 86% 60%;          /* feedback-destructive #EF4444 */
    --destructive-foreground: 0 0% 100%;          /* feedback-destructive-foreground #FFFFFF */
    --border:                 0 0% 90%;           /* border-default #E5E5E5 */
    --input:                  0 0% 90%;           /* border-default #E5E5E5 */
    --ring:                   0 0% 9%;            /* brand-primary #171717 — focus ring (monochromatic) */
    --selection:              75 100% 50%;        /* brand-accent #BEFF00 — text selection */
    --radius:                 0.125rem;           /* radius-sm 2px — sharp default */
    --brand-accent:           75 100% 50%;        /* brand-accent #BEFF00 — lime, notification dot, CTA arrow */
    --brand-accent-foreground: 0 0% 9%;           /* brand-accent-foreground #171717 */

    /* Extended semantic tokens for Plano-specific components */
    --success:                142 76% 36%;        /* feedback-success #16A34A */
    --success-foreground:     0 0% 100%;          /* #FFFFFF */
    --warning:                38 92% 50%;         /* feedback-warning #F59E0B */
    --warning-foreground:     0 0% 9%;            /* #171717 */
  }

  /* Dark mode: not configured. Remove .dark block entirely. */
}
```

---

## 9. Typography Application Matrix

**This section is the authoritative guide for how typography tokens are applied
to UI contexts. Follow this matrix exactly. Do not invent type pairings that are not listed here.**

The spacious density directive pushes h1 to `font-size-4xl` and increases
breathing room between heading levels. Letter spacing is tighter on large
headings to keep display type tight and editorial. Table headers and badges
use `letter-spacing-wide` with uppercase text — a deliberate architectural
convention.

| UI context | Font size | Font weight | Letter spacing | Line height | Colour alias |
|---|---|---|---|---|---|
| Page title (h1) | `font-size-4xl` | `font-weight-bold` | `letter-spacing-tight` | `line-height-snug` | `text-primary` |
| Section heading (h2) | `font-size-3xl` | `font-weight-semibold` | `letter-spacing-tight` | `line-height-snug` | `text-primary` |
| Card title (h3) | `font-size-xl` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-snug` | `text-primary` |
| Subsection heading (h4) | `font-size-base` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-snug` | `text-primary` |
| Body copy | `font-size-base` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Supporting / secondary text | `font-size-sm` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-secondary` |
| Table header | `font-size-xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Table cell | `font-size-sm` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Form label | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Input placeholder | `font-size-sm` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-disabled` |
| Helper / hint text | `font-size-xs` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-secondary` |
| Button (primary) | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-tight` | `brand-primary-foreground` |
| Button (secondary) | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-tight` | `brand-secondary-foreground` |
| Button (destructive) | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-tight` | `feedback-destructive-foreground` |
| Badge / tag | `font-size-xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-tight` | *(foreground alias of badge colour)* |
| Navigation item | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Caption / timestamp | `font-size-xs` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-secondary` |
| Code / monospace | `font-size-sm` (font-mono) | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Building ID / short_id | `font-size-xs` (font-mono) | `font-weight-normal` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Map pin label | `font-size-xs` | `font-weight-medium` | `letter-spacing-normal` | `line-height-tight` | `text-primary` |
| Empty state heading | `font-size-lg` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight` | `text-primary` |
| Empty state body | `font-size-sm` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-secondary` |
| | | | | | |
| **Feed editorial contexts** | | | | | |
| Feed category label | `font-size-2xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Feed building name (hero) | `clamp(48px, 6vw, 72px)` | `font-weight-bold` | `-0.035em` | `0.95` | `text-primary` |
| Feed building name (compact / sm) | `clamp(36px, 4vw, 48px)` | `font-weight-bold` | `-0.035em` | `1.0` | `text-primary` |
| Feed review excerpt | `font-size-base` | `font-weight-normal` | `letter-spacing-normal` | `line-height-relaxed` | `text-secondary` |
| Feed user name | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-normal` | `text-primary` |
| Feed timestamp | `font-size-xs` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-disabled` |
| Feed CTA link | `font-size-xs` | `font-weight-medium` | `letter-spacing-widest` | `line-height-tight` | `text-primary` (stays black on hover) |
| Feed section divider label | `11px` | `font-weight-medium` | `letter-spacing-widest` | `line-height-normal` | `text-primary` |
| Feed section divider § prefix | `font-size-xs` (mono) | `font-weight-normal` | `letter-spacing-wide` | `line-height-normal` | `text-disabled` |
| Feed above-title line | `13px` | `font-weight-normal` | `-0.005em` | `line-height-normal` | `text-secondary` |
| Feed pull-quote (short review) | `clamp(28px, 3vw, 40px)` | `font-weight-medium` | `-0.025em` | `1.15` | `text-primary` |
| Feed photo caption (mono) | `font-size-xs` (mono) | `font-weight-normal` | `0.04em` | `line-height-normal` | `text-disabled` |
| Feed footer action | `10px` | `font-weight-medium` | `letter-spacing-widest` | `line-height-normal` | `text-secondary` |
| Feed activity row timestamp | `11px` (mono) | `font-weight-normal` | `0.04em` | `line-height-normal` | `text-disabled` |
| Right rail section label | `11px` | `font-weight-medium` | `letter-spacing-widest` | `line-height-normal` | `text-disabled` |
| Right rail stat value | `24px` | `font-weight-semibold` | `-0.025em` | `1.0` | `text-primary` |
| Right rail stat label | `10px` | `font-weight-medium` | `0.14em` | `line-height-normal` | `text-disabled` |
| Right rail trending rank | `font-size-xs` (mono) | `font-weight-normal` | `0.04em` | `line-height-normal` | `text-disabled` |
| Top nav link (default) | `14px` | `font-weight-medium` | `-0.01em` | `line-height-normal` | `text-secondary` |
| Top nav link (active) | `14px` | `font-weight-medium` | `-0.01em` | `line-height-normal` | `text-primary` |
| | | | | | |
| **Content detail pages (building, profile, architect)** | | | | | |
| Page hero title (building/person name) | `font-size-4xl` / `font-size-5xl` / `font-size-6xl` | `font-weight-bold` | `letter-spacing-tight` | `line-height-tight` | `text-primary` |
| Page section label (divider header) | `font-size-2xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Page section body | `font-size-base` | `font-weight-normal` | `letter-spacing-normal` | `line-height-relaxed` | `text-secondary` |
| Tier / category rank label | `font-size-2xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Inline CTA (text link with arrow) | `font-size-xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-tight` | `text-primary` |
| Profile stat value | `font-size-2xl` | `font-weight-bold` | `letter-spacing-tight` | `line-height-tight` | `text-primary` |
| Profile stat label | `font-size-2xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-secondary` |
| Tab strip item (active) | `font-size-xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-primary` |
| Tab strip item (inactive) | `font-size-xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-disabled` |
| Portfolio card title | `font-size-sm` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight` | `text-primary` |
| Portfolio card meta | `font-size-2xs` | `font-weight-normal` | `letter-spacing-normal` | `line-height-normal` | `text-secondary` |
| Highlights sub-section label | `font-size-2xs` | `font-weight-medium` | `letter-spacing-wide` | `line-height-normal` | `text-disabled` |
| Quote blockquote text | `font-size-sm` | `font-weight-medium` | `letter-spacing-normal` | `line-height-relaxed` | `text-secondary` |

**Feed editorial typography notes:** The extreme scale contrast between the `feed-above` building metadata line (13px, gray) and the massive feed title (`clamp(48px, 6vw, 72px)`, bold, near-zero line-height) is the defining visual signature of the editorial feed. The contrast *is* the design — do not flatten it. Feed CTA links use uppercase tracked text (`letter-spacing-widest`) with a `→` arrow: on hover, the text dims to `text-secondary` and the arrow remains sharp black (`text-primary`). This preserves the strictly monochromatic editorial feel. Feed section dividers use `text-primary` (not secondary) for their labels, paired with a black `1px solid text-primary` bottom border — not the default gray hairline.

---

## 10. Semantic Colour Usage Guide

**This section defines exactly when each surface, border, and text alias from
Section 2 is applied. Do not deviate from these rules. If a component
does not map cleanly to a rule below, it must use the nearest named ancestor
context — never a raw palette value.**

### Surface aliases

**`surface-default`** (`#FAFAFA`) is the page background only. It is applied once, to the root layout element. It must never appear on cards, panels, sidebar sections, or any component that sits on top of the page. Using it on a component makes that component invisible against the page — treat any such usage as a bug.

**`surface-card`** (`#FFFFFF`) is applied to any contained element that sits directly on `surface-default`: building cards, data panels, stat blocks, review cards, collection tiles, and table containers. In non-editorial contexts (admin, settings, tables), it is always paired with `border-default` — shadow is optional (prefer borderless or border-only cards; use `shadow-md` only when explicit lift is needed for visual hierarchy). If a non-editorial element uses `surface-card` but has no border, it will be invisible in light mode — add a border.

**Editorial feed exception:** Feed content (hero cards, activity cards, compact cards, collection cards, sidebar widgets) does *not* use `surface-card` with `border-default`. Feed content sits directly on the page surface without card containers, borders, or backgrounds. Structure in the feed comes from typography scale, whitespace, and content grouping — not from boxes. This is the core editorial principle: content floats on the canvas. The only visual separation between feed items is generous vertical spacing.

**`surface-muted`** (`#F5F5F5`) is applied to secondary or structural areas that must read as visually quieter than the main content: the sidebar background, secondary navigation panels, input field backgrounds, code blocks, building taxonomy chips, and empty-state containers. It communicates "this area is supporting, not primary." It is never used on action-bearing components (buttons, badges, primary CTAs).

**`surface-overlay`** (`#FFFFFF`) is applied exclusively to modals and popovers. It must always be accompanied by a backdrop overlay (`bg-black/50`) and `shadow-lg`. It is never used for inline components.

### Border aliases

**`border-default`** (`#E5E5E5`) is the standard border for all components: cards, inputs, table cells, dividers, and section separators. In this minimal design system, borders are the primary hierarchy mechanism — they replace shadows in most contexts. Apply consistently to every card and container.

**`border-strong`** (`#A3A3A3`) is used to communicate active or focused state: the focused border on an active input, the selected state of a sidebar item, or a highlighted table row. It should appear in exactly those three contexts and no others. Do not use it for decorative emphasis.

### Text aliases

**`text-primary`** (`#171717`) is used for all content the user must read to complete a task: body copy, building names, form labels, table cell values, modal headings, and navigation items. This is near-black, providing maximum contrast against the light palette. When in doubt, default to `text-primary`.

**`text-secondary`** (`#525252`) is used for supporting information that provides context but is not the primary action target: timestamps, visit counts, review metadata, helper text, table column headers, architect bios, and empty-state descriptions. It should never be used for interactive labels (buttons, links) or required form labels.

**`text-disabled`** (`#A3A3A3`) is used exclusively for placeholder text in inputs and for labels or values on disabled interactive elements. It must not be used to de-emphasise content that is merely less important — use `text-secondary` for that. If content is worth showing, it is either primary or secondary; if it is truly inert, it is disabled.

**`text-inverse`** (`#FFFFFF`) is used for text that sits on a dark background: text inside dark panels, text on `feedback-destructive` banners, footer text, or any context where the surface colour is `palette-neutral-800` or darker. Never use `text-primary` on a dark background.

### Brand accent usage

**`brand-primary`** (`#171717`) is the primary action colour — near-black. It is used for: primary button backgrounds everywhere (forms, modals, admin, CTA buttons in the top nav). It is the button colour. It is not the lime. `brand-primary-foreground` is `#FFFFFF` (white text on a black button).

**`brand-accent`** (`#BEFF00`) is the lime accent — the one bright colour in the system. It appears in exactly two places: text selection highlight (`::selection`) and the notification dot on the bell icon. If `brand-accent` appears anywhere outside these two contexts it is an error. It must not appear as: button backgrounds, section accent bars, tab indicators, bookmark fills, verified badge colours, focus rings, CTA arrows, or any fill state on content or feed pages. Focus rings now use `brand-primary` (black).

**`brand-accent-foreground`** (`#171717`) is always used for text placed on `brand-accent` surfaces. The lime is a light colour — it requires dark foreground, not white.

**`brand-secondary`** (`#F5F5F5`) is a neutral muted surface used for: secondary button backgrounds and subdued highlight surfaces.

### Feedback aliases

**`feedback-success`** (`#16A34A`), **`feedback-warning`** (`#F59E0B`), and **`feedback-destructive`** (`#EF4444`) are used exclusively for system-generated status communication: toast notifications, inline validation messages, status badges, and alert banners. They must not be used for decorative colour or brand expression. Note that `feedback-success` is a true green (hue ≈142°), intentionally differentiated from the brand lime (hue ≈75°) so that "success" and "brand" are never conflated. Each feedback alias has a corresponding `*-foreground` alias — always pair them; never place `text-primary` on a feedback-coloured background. `feedback-warning-foreground` is dark (`#171717`) because amber is a light background colour.

---

## 11. Designer Notes

The entire system is built on one principle: **let the architecture be the colour.** Plano is a photography-first platform — every building photo will be the most colourful element on screen. The strictly grayscale palette ensures photos sing without competing against brand colours. The single neon accent (#BEFF00 electric lime) provides just enough tension to feel alive — it functions like a highlighter pen in a concrete gallery, marking selected text and exactly one high-priority system signal (notifications).

**Inter** is the primary sans: highly legible in dense UI, neutral enough to let photography dominate, and strong at editorial sizes when paired with existing scale and weight rules (tight line height and slight negative letter-spacing on large headings preserve the poster-like feed hierarchy). **Space Mono** remains the monospace — it supplies technical contrast for metadata, coordinates, and building IDs without competing with the sans. Together they keep the catalogue/editorial split: neutral sans for body and display, monospace for machine-readable detail.

The **sharp radius** (2px default) is the single most important spatial decision. Rounded corners signal friendliness and consumer softness — Plano is neither. Sharp edges communicate precision, intentionality, and respect for the subject matter. The 2px value is not 0px (which can feel unfinished in a web context) but it is close enough to read as deliberately sharp. In the editorial feed, images and content blocks use 0px radius — true sharp edges, like printed photographs in a magazine.

**Spacious density** with **flat shadows** means hierarchy comes from whitespace and typography, not from elevation stacking. This mirrors the way architecture photography is presented in galleries and monographs — generous margins, clear separation, nothing competing for attention. The result should feel closer to a curated exhibition catalogue than a typical SaaS dashboard.

**Editorial feed philosophy:** The feed follows A24 Films' design language — white canvas, aggressive typographic hierarchy, zero decorative chrome. Content does not live inside card containers. Structure comes from the contrast between tiny uppercase labels and massive bold headlines, from generous whitespace between items, and from raw photography presented without borders or rounded corners. The feed should feel like flipping through an architecture magazine, not scrolling through a social media app. Every feed item earns its space through the quality of its typography and imagery, not through a containing box that says "I am a card."
