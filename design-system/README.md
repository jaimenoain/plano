# Plano Design System

> **Plano: The world's architecture, catalogued.**
> A social platform for architecture enthusiasts to discover, document, and share notable buildings. Like Letterboxd, but for buildings.

The product is editorial-first, monochrome, and aggressively typographic — modelled on **A24 Films** and the websites of contemporary studios like **OMA, BIG, Zaha Hadid**. Architecture photography is the hero; everything else gets out of the way.

---

## Sources

This design system is reverse-engineered from the production Plano codebase. The codebase is exceptionally well-documented — most decisions here cite `docs/DESIGN_TOKENS.md` and live components.

- **GitHub:** [`jaimenoain/plano`](https://github.com/jaimenoain/plano) — explore the repo if you want pixel-level ground truth on a specific component. Particularly worth reading: `docs/DESIGN_TOKENS.md`, `docs/PRD.md`, `src/features/feed/components/landing/*`, `src/components/layout/AppTopNav.tsx`.
- **Logo:** `uploads/PlanoLogo.tsx` — the wordmark `<svg>` from production.
- **PWA icons:** `uploads/{favicon, apple-touch-icon, android-chrome-*}.png`.

If you're building real Plano UI — extending the product itself, not designing in its style — go to the source. This system is a faithful summary, not a substitute.

---

## Index

| Path | What's in it |
|---|---|
| `README.md` | This file — context, content fundamentals, visual foundations, iconography. |
| `SKILL.md` | Cross-compatible Agent Skill manifest. |
| `colors_and_type.css` | All design tokens as CSS vars + semantic element styles (`h1`, `.eyebrow`, `.cta-link`, `.display-hero`, etc). |
| `assets/` | Logo SVGs, favicons, PWA icons. |
| `preview/` | Design-system cards rendered for the review pane. |
| `ui_kits/website/` | Faithful recreation of the Plano marketing site (landing) + editorial feed view. |

---

## Brand essence

| | |
|---|---|
| **What it is** | The definitive, community-maintained database of the world's notable architecture, with social, mapping, and itinerary layers. |
| **Tagline** | "The world's architecture, catalogued." |
| **Positioning line** | "Like IMDb, but for buildings." (also: "Like Letterboxd, but for architecture.") |
| **Personality** | Editorial · monographic · curatorial · cool · slick · contemporary · sharp. |
| **Reference world** | A24 Films · OMA · BIG · Zaha Hadid Architects · architecture monographs and exhibition catalogues. |
| **Audience** | Enthusiasts, students, practising architects, curators, social explorers. |
| **What it is not** | Generic SaaS. Bluish-purple gradients. Rounded-corner consumer softness. Emoji. Serif. Retro. |

---

## CONTENT FUNDAMENTALS

### Voice

The voice is the voice of a quietly authoritative editorial publication. **Calm, precise, and architectural — never breathless, never marketing-y, never cute.** Plano speaks the way a serious magazine speaks about its subject: with respect for the work, an assumption that the reader cares, and zero fluff.

### Tone register

- **Declarative, not aspirational.** "The world's architecture, catalogued." — not "Imagine if every building…"
- **Confident, not loud.** No exclamation marks (effectively never). No "AMAZING" or "incredible". Restraint is a brand signal.
- **Specific, not generic.** "Brutalist Gems of London" beats "Cool buildings". Real buildings, real architects, real cities are always the example.
- **Editorial pause.** Short sentences. Periods, not commas, do the heavy lifting. The cadence is closer to a museum wall label than a marketing page.

### Casing

| Context | Rule | Example |
|---|---|---|
| Headlines (display) | Sentence case. End with a full stop. | `The world's architecture, catalogued.` |
| Section headings | Sentence case. | `What we're building` |
| Eyebrow labels, badges, tab strips | UPPERCASE, tracked (`letter-spacing: 0.15em`). | `COMING SOON` · `DISCOVER` · `TOP 1%` |
| CTA links (inline) | UPPERCASE, tracked, with `→`. | `READ REVIEW →` |
| Button labels | Sentence case, normal tracking. | `Join the waiting list` · `Log a visit` |
| Body copy | Sentence case. | `Track every building you've visited.` |
| Architect / building names | Title Case as the world spells them. | `Le Corbusier` · `Unité d'Habitation` |

**Pronouns:** *We* and *you*. Plano is the team, the reader is the user. Never "users" in copy — always "you" or, when in third person, a persona (`The Enthusiast`, `The Curator`).

**Emoji:** **None.** Not in headlines, not in copy, not in empty states. The lime accent is the entire chromatic vocabulary; emoji would shatter the monochrome contract.

**Spelling:** British English in editorial copy (`catalogued`, `colour`, `realised`) is acceptable and matches the codebase, but American English (`cataloged`) appears in the canonical tagline. Pick one per document and stay consistent.

### Examples (lifted from production)

> **Hero:**
> COMING SOON
> The world's architecture database.
> *Like IMDb, but for buildings. We're cataloging every structure on earth — so the architects, engineers, and studios who make them possible finally get the credit they deserve.*

> **Feature eyebrows:** `DISCOVER` · `CREDIT` · `TRACK`
> **Feature titles:** `Every building, documented.` · `Architects get the credit they deserve.` · `Your architecture journey.`

> **About page:**
> "Architecture shapes every city, neighbourhood, and street we live in. Yet most of it goes unrecorded, undiscovered, and unappreciated outside a small professional circle. Plano changes that."

> **Persona descriptions:**
> *The Enthusiast — Travels to see notable buildings, keeps a personal log of visits, and rates what they see. Plano is Letterboxd for architecture.*

> **CTAs:** `Join the waiting list` · `Log a visit` · `Read review →` · `Save to collection →`

### Anti-examples (do not write)

- ❌ "Get ready to discover amazing buildings!"
- ❌ "Unlock the world's coolest architecture 🏛️"
- ❌ "Join thousands of architecture lovers today!"
- ❌ "Welcome to the future of building discovery."
- ❌ Multi-clause hype paragraphs with em-dashes used as drama beats.

---

## VISUAL FOUNDATIONS

### The one rule

**Let the architecture be the colour.** Every photograph of a building will be the most chromatic thing on screen. Everything that isn't a photograph is black, white, or grey. The single neon lime (`#BEFF00`) lives in exactly two contexts — text selection and the notification dot — and that's it.

### Colour

| Token | Hex | Where |
|---|---|---|
| `--brand-primary` | `#171717` | Primary buttons, primary text, active states, focus rings. The "brand colour" is near-black. |
| `--brand-primary-hover` | `#000000` | Hover state on primary actions. |
| `--brand-accent` | `#BEFF00` | Text selection (`::selection`) and notification dot on the bell. Nowhere else. |
| `--surface-default` | `#FAFAFA` | The page. One application only — `<body>`. |
| `--surface-card` | `#FFFFFF` | Cards, panels, modals, popovers in admin/settings contexts. |
| `--surface-muted` | `#F5F5F5` | Sidebar background, input fills, code blocks, taxonomy chips, skeletons. |
| `--surface-inverse` | `#000000` | Dark overlay panels, menus on photographs. |
| `--border-default` | `#E5E5E5` | Every divider, every input outline. Borders replace shadows. |
| `--border-strong` | `#A3A3A3` | Active/focused state on inputs. |
| `--text-primary` | `#171717` | Body, headings, anything you have to read. |
| `--text-secondary` | `#525252` | Metadata, timestamps, table column headers, persona bios. |
| `--text-disabled` | `#A3A3A3` | Placeholders only — never use to "de-emphasise" content. |
| `--feedback-success` | `#16A34A` | Toasts, validation. (Deliberately different hue from lime so "success" and "brand" never collide.) |
| `--feedback-warning` | `#F59E0B` | Toasts, validation. |
| `--feedback-destructive` | `#EF4444` | Destructive actions, error banners. |

### Type

- **Sans:** **Inter** — variable, with optical sizing (`opsz 14..32`). Used for everything from 10px micro-labels to 72px editorial headlines. The neutrality of Inter is deliberate — it doesn't compete with photography.
- **Mono:** **Space Mono** — for building IDs, coordinates, timestamps, footer eyebrows. The technical contrast to Inter that signals "this is data, not voice."

> ⚠️ **Font availability note:** The codebase prefers self-hosted `Inter-VariableFont_opsz_wght.ttf`. We could not locate a font file in the provided assets, so `colors_and_type.css` pulls Inter and Space Mono from Google Fonts. **If you have the variable Inter file, drop it into `fonts/` and replace the `@import` line in `colors_and_type.css` with the `@font-face` block from `docs/DESIGN_TOKENS.md` §3.**

#### Signature type moves

1. **Scale contrast as design.** The contrast between an 11px tracked uppercase eyebrow and a 60–72px tight-tracked headline *is the design*. Do not soften this gap.
2. **Tight tracking on display sizes.** `letter-spacing: -0.03em` to `-0.035em` for anything ≥ 32px.
3. **Near-zero leading on hero type.** `line-height: 0.95–1.0` on display headlines. Lines stack like printed type.
4. **Widest tracking on labels.** `letter-spacing: 0.15em` (`--letter-spacing-widest`) for eyebrows, CTAs, tab strips, section dividers. This is what gives Plano its architectural-print feel.
5. **The 10–11px label.** A surprising amount of structural copy lives at this size: section dividers, stat labels, footer chrome. Tracked, uppercase, dimmed to `text-disabled`.

### Backgrounds

- **One surface colour per page** — `#FAFAFA` is the canvas, and that's it. No gradients. No textures. No patterns. No illustrations.
- **Photography full-bleed** in heroes — the building photo runs edge-to-edge. The only overlay permitted is a `bg-gradient-to-t from-black/60` cinematic gradient at the bottom for text legibility on hero images.
- **Photography is presented raw** in the feed — sharp corners, no border, no shadow, no rounded crops. Like a magazine plate.
- **Imagery colour vibe:** the architecture is what gives the page colour. Plano does not filter photos to be warm, cool, or B&W — they appear as uploaded. No grain, no vignettes, no Instagram filters.

### Animation

Subtle. **Editorial fades**, not bouncy springs.

- **Hero entrance:** the building image scales from `1.05 → 1.0` over `1.2s` with the easing `[0.22, 1, 0.36, 1]` (Framer Motion's `"easeOutExpo"`-ish cubic). Headlines fade-and-rise (`opacity 0 → 1`, `y: 16 → 0`) over `~0.6s`, staggered by `~0.1s` per element.
- **Marquee:** infinite horizontal scroll for the community avatars on the landing page. Constant velocity, no easing.
- **Hover transitions:** `120–200ms ease` on colour. No transforms.
- **Press:** primary buttons `active:scale-[0.98]`. No translate-y bounce.
- **Page transitions:** none. SPA fades only.

### Hover & press states

| Element | Hover | Press |
|---|---|---|
| Primary button | `bg-brand-primary` → `bg-brand-primary-hover` (`#171717` → `#000000`). | `scale-[0.98]`. |
| Secondary / outline button | Border darkens (`border-default` → `border-strong`); fill goes `surface-card` → `surface-muted`. | `scale-[0.98]`. |
| Inline CTA link (`READ REVIEW →`) | Label dims to `text-secondary`; the `→` stays `text-primary`. (Reverses the visual emphasis — a deliberate editorial flourish.) | — |
| Nav link (default → active) | `text-secondary` → `text-primary`. Active also adds a `1px` solid `bg-text-primary` bar pinned at `-bottom-0.5`. | — |
| Input | Border `border-default` → `border-strong`; subtle `shadow-sm` lifts. Focus: `border-brand-primary` + `ring-2 ring-brand-primary`. | — |
| Icon button | Foreground `text-secondary` → `text-primary`. No background fill. | — |
| Image card | No hover effect on the image itself. Title underlines on hover when wrapped in a link. | — |

### Borders

Borders are the primary hierarchy mechanism, **replacing** shadows in most contexts.

- **Default:** `1px solid #E5E5E5` (`border-default`). Every card, every input, every divider.
- **Strong:** `1px solid #A3A3A3` (`border-strong`). Focused inputs, selected sidebar item, highlighted table row.
- **Hairline:** `0.5px solid var(--border-default)`. Custom `.hairline` utility — used between dense rows in lists where a full 1px would feel heavy.
- **Feed section dividers:** `1px solid var(--text-primary)` — black, not grey. Paired with the section label. This is rare and intentional; standard dividers stay grey.

### Shadows

**Effectively unused** on content surfaces. The shadow tokens exist mostly for overlays.

| Token | Value | Where |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Inputs on hover. |
| `--shadow-md` | `0 2px 8px 0 rgb(0 0 0 / 0.06)` | Optional card lift — admin only. Prefer borders. |
| `--shadow-lg` | `0 8px 24px 0 rgb(0 0 0 / 0.10)` | Modals, dropdowns, popovers. Always paired with `bg-black/50` backdrop. |

**No inner shadows. No glow effects. No coloured shadows.**

### Capsules vs. protection gradients

- **Capsule pill backgrounds:** not used on photographs. If a label needs to sit on an image, it's set on a **black panel** (`bg-surface-inverse`) with white text — rarely.
- **Protection gradients:** one place only — the cinematic `bg-gradient-to-t from-black/60 via-transparent to-transparent` at the bottom of full-bleed building hero images.

### Transparency & blur

- **App top nav:** `rgba(250,250,250,0.92)` + `backdrop-blur-md`. The nav fades through scrolling content. Bordered at the bottom with `border-default`.
- **Landing nav:** `bg-surface-default/95` + `backdrop-blur-sm`. Slightly less glassy.
- **Glass utility:** `.glass` — `background: color-mix(in srgb, var(--surface-card) 70%, transparent)` + `backdrop-blur-xl`. Used inside modals over photography.
- **Modal backdrop:** `bg-black/50`, no blur. Modal panel is opaque `surface-overlay`.

### Corner geometry

This is one of the most important spatial decisions. **The default is `0px`. The exception is the legacy primitive ladder.**

- **Editorial and content-detail surfaces (building, profile, architect, feed):** `--radius-none` (`0px`). Sharp. Cut, not moulded. Echoes drafting and physical models.
- **Photography always:** `0px`. No exceptions. Square crops, sharp edges.
- **Legacy shared primitives (`Button`, `Input`, `Badge`, `Card`):** `--radius-sm` (`2px`) — minimal softening for ergonomics. Many surfaces override this to `0px`.
- **Circular only:** avatars (`--radius-full`) and small dot markers. These are *identity discs*, not rounded rectangles.
- **Modals & popovers:** `--radius-lg` (`6px`) for legacy reasons; new modals on editorial surfaces should use `0px`.

### Cards

The card system is a paradox: **most "cards" in the feed aren't card containers at all**. They're typographic blocks separated by whitespace and a black border-bottom.

- **Feed item:** `border-b border-border-default py-8`. No `surface-card` background. No shadow. No rounding. Content floats directly on `surface-default`. The card has earned its space through type, not chrome.
- **Admin / settings card:** `bg-surface-card border border-border-default` (no shadow). Rounded `radius-sm` (legacy). Optional `shadow-md` only if hierarchy demands.
- **Image card (building thumbnail):** image with `aspect-card-standard` (4:3) or `aspect-card-hero` (16:9). No rounding. No frame. Title + meta sit *below*, never overlaid.

### Layout rules

- **App shell:** horizontal sticky top nav (logo + nav links + search + primary CTA + bell + avatar). **Not a left sidebar.** Height `64px`. Sticky `top-0`, `z-50`.
- **Editorial body:** two-column grid — fluid centre feed column + `320px` sticky right rail. Max width `~960px`.
- **Content detail pages:** single column, `max-w-4xl`. No right rail. Generous vertical rhythm.
- **Section gaps:** `64–96px` between major page sections. Whitespace is editorial pause, not waste.
- **Page padding:** `20px` mobile, `32px` desktop, on the inner container.

### Fixed elements

- Top nav (sticky, `z-50`).
- Right rail (sticky to viewport, only on desktop in editorial contexts).
- Modal backdrop + dialog.
- Mobile bottom nav (the codebase has a `BottomNav` component; the marketing site does not use it).
- Cookie banner (when shown, fixed-bottom over the canvas).

---

## ICONOGRAPHY

### System

**Lucide React** is the canonical icon library. The production codebase imports directly from `lucide-react` throughout — `<Bell />`, `<Search />`, `<MapPin />`, `<Building2 />`, `<Trophy />`, `<Gem />`, `<Sparkles />`, `<BadgeCheck />`, `<Briefcase />`, `<Landmark />`, `<Settings />`, `<LogOut />`, `<User />`, etc. No custom icon font, no SVG sprite sheet, no Material/Heroicons.

### Stroke & style

- **Stroke-only.** No filled icons. Default stroke weight `2px` (Lucide default).
- **Sizes:** `12px` (h-3 w-3, inline-with-text micro), `14px` (h-3.5 w-3.5, eyebrow icons), `16px` (h-4 w-4, default in buttons and nav), `20–24px` (hero/feature contexts).
- **Colour:** inherits `currentColor` — typically `text-secondary` at rest, `text-primary` on hover or active state.
- **Spacing from text:** `gap-2` (8px) in flex rows.

### Identifying icons in use (from the codebase)

| Use | Lucide name |
|---|---|
| Bell / notification | `Bell` |
| Search | `Search` |
| Map pin / location | `MapPin` |
| Building (generic) | `Building2` · `Landmark` |
| User / avatar fallback | `User` |
| Verified architect | `BadgeCheck` |
| Top 1% / Top 5% / Top 10% | `Trophy` · `Gem` · `Sparkles` |
| Settings | `Settings` |
| Sign out | `LogOut` |
| Portfolio | `Briefcase` |
| Loading | `Loader2` (with `animate-spin`) |

### How to include Lucide

- **In React/JSX prototypes:** `<script type="module">import { Building2 } from "https://esm.sh/lucide-react@0.451.0"</script>` for quick prototyping; in production code use the npm package.
- **In static HTML:** [Lucide static](https://unpkg.com/lucide-static@0.451.0/icons/) gives raw SVG by name. Or embed Lucide's web component via `<script src="https://unpkg.com/lucide@latest"></script>` then `<i data-lucide="bell"></i>` + `lucide.createIcons()`.

This design system's previews use the static SVG approach inlined for performance.

### Logos

- **Wordmark:** `assets/plano-logo.svg` / `assets/PlanoLogo.tsx`. The full "Plano" set in a custom geometric sans. Five glyphs, each drawn with quadratic curves — the `P`, `L`, `A`, `N`, `O` shapes carry the brand's architectural lockup. **The wordmark is monochrome `currentColor`.** Place it on light surfaces in `text-text-primary`; on dark surfaces invert with `text-text-inverse`.
- **Symbol:** `assets/plano-symbol.svg`. Just the `P` glyph — used as the favicon, PWA icon, and small-format app mark. Renders white on a black square for the PWA. Inside the product the symbol is rarely used; the wordmark is preferred.
- **Favicons & PWA icons:** `assets/{favicon-16, favicon-32, apple-touch-icon, android-chrome-192, android-chrome-512, favicon.ico}`. Black `P` on white, or white `P` on black square — both ship.

### Emoji

**Never.** Not in copy, not in empty states, not in section labels. The monochrome contract forbids it. If a presence feels needed, use a Lucide stroke icon.

### Unicode characters

A handful are first-class brand glyphs:

- `→` — the CTA arrow. Always paired with uppercase tracked text (`READ REVIEW →`).
- `·` — the meta separator. `Le Corbusier · 1952 · Marseille`.
- `§` — section prefix in feed dividers (e.g. `§ 01 · BUILDINGS`).
- `↗` — external link indicator (used sparingly).
- `—` — em dash for editorial pause. Use unstyled, surrounded by spaces in prose.

---

## Designer reminders

- One thousand no's for every yes. If a section feels empty, that's a composition problem to solve with type and whitespace, not by adding content.
- The contrast between an 11px eyebrow and a 72px headline is the design. Don't compress it.
- Photography is the colour. Don't add a second colour.
- If you need a divider, it's `1px solid #E5E5E5`. Not a shadow. Not a gradient.
- The lime only appears in two places. Two.
- Rounded corners feel like a consumer app. Plano isn't one.

---

*Last updated 2026 · derived from `jaimenoain/plano` `docs/DESIGN_TOKENS.md` and live source.*
