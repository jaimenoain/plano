# Plano: Design Tokens

> **Authoritative source for all visual design decisions.**
> Cursor reads this file during the Walking Skeleton (Task 0.1–0.2) and injects
> these values into `apps/web/tailwind.config.ts`. Do not edit `tailwind.config.ts`
> token values manually — edit this file and re-run the injection task.

---

## 1. Design Intent

**Personality:** Modern, minimalist, neon, sharp, clean, photographic, architectural

**Reference products:** Contemporary architecture studio websites (OMA, BIG, Zaha Hadid Architects) — stark grayscale palettes, bold typography, photography-first layouts, sharp geometry, zero ornamentation.

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
| `brand-primary` | `palette-brand-500` · `#BEFF00` | Primary actions, accent blocks, active indicators |
| `brand-primary-hover` | `palette-brand-600` · `#9ACC00` | Hover state for primary actions |
| `brand-primary-foreground` | `palette-neutral-900` · `#171717` | Text/icons on brand-primary background (dark on neon) |
| `brand-secondary` | `palette-brand-50` · `#F7FFE0` | Secondary surfaces — selected rows, subtle highlights |
| `brand-secondary-foreground` | `palette-brand-800` · `#4D6600` | Text on brand-secondary background |
| `surface-default` | `palette-neutral-50` · `#FAFAFA` | Page background |
| `surface-card` | `#FFFFFF` | Card and panel background |
| `surface-overlay` | `#FFFFFF` | Modal and popover background |
| `surface-muted` | `palette-neutral-100` · `#F5F5F5` | Muted/subdued surface — sidebar, code blocks |
| `border-default` | `palette-neutral-200` · `#E5E5E5` | Default border — cards, inputs, dividers |
| `border-strong` | `palette-neutral-400` · `#A3A3A3` | Emphasis border — focus, selected states |
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
| `font-sans` | `'Space Grotesk', sans-serif` | Geometric, architectural. Sharp letterforms with no humanist curves. Google Fonts. |
| `font-mono` | `'Space Mono', monospace` | Sibling to Space Grotesk — used for building IDs, coordinates, metadata codes. Google Fonts. |
| `font-size-2xs` | `0.625rem` | 10px — micro labels (avatar fallbacks, section dividers); Tailwind `text-2xs` |
| `font-size-2xs-plus` | `0.6875rem` | 11px — uppercase meta / status chips; Tailwind `text-2xs-plus` |
| `font-size-xs` | `0.75rem` | 12px — captions, timestamps, badge labels |
| `font-size-sm` | `0.875rem` | 14px — secondary text, table cells, form labels |
| `font-size-base` | `1rem` | 16px — body copy |
| `font-size-lg` | `1.125rem` | 18px — lead text, card descriptions |
| `font-size-xl` | `1.25rem` | 20px — card titles |
| `font-size-2xl` | `1.5rem` | 24px — section headings |
| `font-size-3xl` | `2rem` | 32px — page headings (spacious density: larger than default) |
| `font-size-4xl` | `2.5rem` | 40px — hero headings, landing page |
| `font-weight-normal` | `400` | Body text |
| `font-weight-medium` | `500` | Labels, nav items, form labels |
| `font-weight-semibold` | `600` | Headings, emphasis |
| `font-weight-bold` | `700` | Hero text, strong emphasis |
| `line-height-tight` | `1.2` | Headings — tighter than default to match architectural precision |
| `line-height-normal` | `1.5` | Body copy |
| `line-height-relaxed` | `1.75` | Long-form text — reviews, descriptions |
| `letter-spacing-tight` | `-0.03em` | Large headings — pulled in for geometric type |
| `letter-spacing-normal` | `0em` | Body |
| `letter-spacing-wide` | `0.08em` | All-caps labels, badges, table headers |

**Font loading — two options (this project uses Vite/React SPA — use Option B):**

**Option A — `next/font/google` (Next.js only):** If the project migrates to Next.js, add the following to `apps/web/app/layout.tsx`:

```typescript
import { Space_Grotesk, Space_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

// Apply to <html> element: className={`${spaceGrotesk.variable} ${spaceMono.variable}`}
```

**Option B — `<link>` tag (recommended for Vite/React SPA):** Add this to `apps/web/index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## 4. Spacing Scale

Base unit: 4px (`0.25rem`). All spacing tokens are multiples of this base.

The spacious density directive means Cursor should default to the higher end of the scale for component padding, section gaps, and page margins. Typical defaults: card padding `spacing-6` to `spacing-8`, section gap `spacing-12` to `spacing-16`, page margin `spacing-8` to `spacing-12`.

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

## 7. Tailwind Config Block

This is the exact object to merge into `apps/web/tailwind.config.ts`. Cursor reads
this block verbatim during Task 0.2 of the Scaffold Prompt.

```typescript
// Paste into the `theme.extend` section of tailwind.config.ts
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
      'brand-primary':              '#BEFF00',
      'brand-primary-hover':        '#9ACC00',
      'brand-primary-foreground':   '#171717',
      'brand-secondary':            '#F7FFE0',
      'brand-secondary-foreground': '#4D6600',
      'surface-default':            '#FAFAFA',
      'surface-card':               '#FFFFFF',
      'surface-overlay':            '#FFFFFF',
      'surface-muted':              '#F5F5F5',
      'border-default':             '#E5E5E5',
      'border-strong':              '#A3A3A3',
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
      sans: ['Space Grotesk', 'sans-serif'],
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
    },
    spacing: {
      'collection-mosaic': '10.5rem',
      'mosaic-gap': '1.5px',
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
    },
  },
},
```

> **Note:** Since this project uses Vite (not Next.js), `fontFamily` references
> literal font names loaded via `<link>` tag — not CSS variable references. If the
> project migrates to Next.js with `next/font`, update to:
> `sans: ['var(--font-sans)', 'sans-serif']` and
> `mono: ['var(--font-mono)', 'monospace']`.

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
    --primary:                75 100% 50%;        /* brand-primary #BEFF00 */
    --primary-foreground:     0 0% 9%;            /* brand-primary-foreground #171717 */
    --secondary:              75 100% 94%;        /* brand-secondary #F7FFE0 */
    --secondary-foreground:   75 100% 20%;        /* brand-secondary-foreground #4D6600 */
    --muted:                  0 0% 96%;           /* surface-muted #F5F5F5 */
    --muted-foreground:       0 0% 32%;           /* text-secondary #525252 */
    --accent:                 75 100% 94%;        /* brand-secondary #F7FFE0 */
    --accent-foreground:      75 100% 20%;        /* brand-secondary-foreground #4D6600 */
    --destructive:            0 86% 60%;          /* feedback-destructive #EF4444 */
    --destructive-foreground: 0 0% 100%;          /* feedback-destructive-foreground #FFFFFF */
    --border:                 0 0% 90%;           /* border-default #E5E5E5 */
    --input:                  0 0% 90%;           /* border-default #E5E5E5 */
    --ring:                   75 100% 50%;        /* brand-primary #BEFF00 — focus ring */
    --radius:                 0.125rem;           /* radius-sm 2px — sharp default */

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
to UI contexts. Cursor must follow this matrix exactly. Do not invent type
pairings that are not listed here.**

The spacious density directive pushes h1 to `font-size-4xl` and increases
breathing room between heading levels. Letter spacing is tighter on large
headings to match Space Grotesk's geometric precision. Table headers and badges
use `letter-spacing-wide` with uppercase text — a deliberate architectural
convention.

| UI context | Font size | Font weight | Letter spacing | Line height | Colour alias |
|---|---|---|---|---|---|
| Page title (h1) | `font-size-4xl` | `font-weight-bold` | `letter-spacing-tight` | `line-height-tight` | `text-primary` |
| Section heading (h2) | `font-size-3xl` | `font-weight-semibold` | `letter-spacing-tight` | `line-height-tight` | `text-primary` |
| Card title (h3) | `font-size-xl` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight` | `text-primary` |
| Subsection heading (h4) | `font-size-base` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight` | `text-primary` |
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

---

## 10. Semantic Colour Usage Guide

**This section defines exactly when each surface, border, and text alias from
Section 2 is applied. Cursor must not deviate from these rules. If a component
does not map cleanly to a rule below, it must use the nearest named ancestor
context — never a raw palette value.**

### Surface aliases

**`surface-default`** (`#FAFAFA`) is the page background only. It is applied once, to the root layout element. It must never appear on cards, panels, sidebar sections, or any component that sits on top of the page. Using it on a component makes that component invisible against the page — treat any such usage as a bug.

**`surface-card`** (`#FFFFFF`) is applied to any contained element that sits directly on `surface-default`: building cards, data panels, stat blocks, review cards, collection tiles, and table containers. In this sharp/minimal design, it is always paired with `border-default` — shadow is optional (prefer borderless or border-only cards; use `shadow-md` only when explicit lift is needed for visual hierarchy). If an element uses `surface-card` but has no border, it will be invisible in light mode — add a border.

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

**`brand-primary`** (`#BEFF00`) is the single neon accent. It is used for: primary button backgrounds, active navigation indicators, focus rings, progress bars, selected states, and the building "visited" checkmark. It must appear sparingly — the power of a single-colour system depends on restraint. If the neon appears in more than two places on any given screen, it is overused.

**`brand-primary-foreground`** (`#171717`) is always used for text and icons placed on `brand-primary` surfaces. The neon is a light colour — it requires dark foreground, not white.

**`brand-secondary`** (`#F7FFE0`) is a barely-there neon tint used for: hovered table rows, selected filter chips, active tab backgrounds, and subtle highlight surfaces. It provides a whisper of the accent without the full neon intensity.

### Feedback aliases

**`feedback-success`** (`#16A34A`), **`feedback-warning`** (`#F59E0B`), and **`feedback-destructive`** (`#EF4444`) are used exclusively for system-generated status communication: toast notifications, inline validation messages, status badges, and alert banners. They must not be used for decorative colour or brand expression. Note that `feedback-success` is a true green (hue ≈142°), intentionally differentiated from the brand lime (hue ≈75°) so that "success" and "brand" are never conflated. Each feedback alias has a corresponding `*-foreground` alias — always pair them; never place `text-primary` on a feedback-coloured background. `feedback-warning-foreground` is dark (`#171717`) because amber is a light background colour.

---

## 11. Designer Notes

The entire system is built on one principle: **let the architecture be the colour.** Plano is a photography-first platform — every building photo will be the most colourful element on screen. The strictly grayscale palette ensures photos sing without competing against brand colours. The single neon accent (#BEFF00 electric lime) provides just enough tension to feel alive — it functions like a fluorescent tube in a concrete gallery, marking where to look and what to press.

**Space Grotesk** was chosen over Inter or DM Sans because its geometric construction echoes architectural drafting — the letterforms feel measured and precise without being cold. Its slightly unconventional `g` and `R` give Plano a distinctive typographic identity that avoids the "generic SaaS" trap. Space Mono extends this identity into metadata, coordinates, and building IDs, reinforcing the technical/cataloguing personality.

The **sharp radius** (2px default) is the single most important spatial decision. Rounded corners signal friendliness and consumer softness — Plano is neither. Sharp edges communicate precision, intentionality, and respect for the subject matter. The 2px value is not 0px (which can feel unfinished in a web context) but it is close enough to read as deliberately sharp.

**Spacious density** with **flat shadows** means hierarchy comes from whitespace and borders, not from elevation stacking. This mirrors the way architecture photography is presented in galleries and monographs — generous margins, clear separation, nothing competing for attention. The result should feel closer to a curated exhibition catalogue than a typical SaaS dashboard.
