# Plano Design System

> **The world's architecture, cataloged.**

Plano is a social platform for architecture enthusiasts — a "Letterboxd for buildings." Users log the buildings they visit, rate them on a 1–3 Michelin-style scale, write reviews with photos, follow friends and architects, curate collections into multi-day itineraries, and discover new architecture through an interactive global map.

This design system captures the visual DNA of Plano: an **editorial, monochromatic, architectural** aesthetic modelled on **A24 Films** (a24films.com) and contemporary architecture studios (OMA, BIG, Zaha Hadid Architects). Aggressive sans-serif typography at extreme scale. Near-zero UI chrome. Generous whitespace as structure. Photography-first. Essentially all monochrome: the lime (`#BEFF00`) survives only as the text-selection highlight and the bell notification dot — everything you press is black.

> **Authoritative spec:** this design system is the source of truth for token values and visual-behaviour rules; the repo (`docs/DESIGN_TOKENS.md`, `tailwind.config.ts`) is the implementation to bring into line. This README is the narrative rationale. Where they differ on a design decision, this system wins — see `SOURCE-OF-TRUTH.md`.

## Index

| File | What's in it |
|---|---|
| `README.md` | This file — context, content fundamentals, visual foundations, iconography (the bible) |
| `SKILL.md` | Condensed working-set: recipes, key tokens, hard noes |
| `SOURCE-OF-TRUTH.md` | Which file wins when docs disagree (repo config → `docs/DESIGN_TOKENS.md` → this package) |
| `MIGRATION.md` | The refresh playbook — order to work in and the gates to pass |
| `TOKENS-AND-TAILWIND.md` | Token tables + Tailwind/shadcn mapping + reconcile steps |
| `COMPONENTS.md` | Components: variants, usage rules, real file paths |
| `PATTERNS.md` | Page composition recipes (feed, detail, profile, map, modal, forms…) |
| `LAYOUT-AND-CHROME.md` | Responsive shell — top nav + right rail, mobile drawer, glass |
| `VOICE-AND-CONTENT.md` | Copy & voice guide (rating language, microcopy, toasts) |
| `ACCESSIBILITY.md` | Focus, contrast, hit targets, reduced motion |
| `CHECKLIST.md` | The "is this Plano?" review gate |
| `plano-tokens.css` | Portable token mirror (values authoritative in `docs/DESIGN_TOKENS.md`) |
| `adherence.oxlintrc.json` | Lint rules (raw hex / px / non-system font warnings) |
| `fonts/`, `assets/` | Inter variable font · the wordmark (`currentColor`) |

> **Note:** the design-system authoring project also ships `preview/*.html` specimen cards and
> `ui_kits/web/` (a working recreation of the app). Those live in the repo's existing `design-system/`
> folder — keep them when you consolidate (see `INSTALL.md`).

## Source material

The user provided the following — reader may or may not have access:

- **Codebase:** `plano/` — a React 18 + Vite + React Router 7 SPA (SSR). TypeScript, Tailwind + shadcn/ui, Supabase backend, MapLibre GL JS for maps. Key directories: `plano/src/components/ui` (shadcn primitives), `plano/src/features/feed` (editorial feed), `plano/src/features/buildings` (building detail pages), `plano/src/components/layout` (`AppTopNav` + right rail on desktop, `MobileTopBar` / `BottomNav` / `AppSidebar` drawer on mobile, `SiteFooter`).
- **Design tokens doc:** `plano/docs/DESIGN_TOKENS.md` — the authoritative token spec (539 lines; heavily referenced here).
- **PRD:** `plano/docs/PRD.md` — full product requirements.
- **Logo:** `uploads/svgviewer-output (1).svg` — the Plano wordmark (copied to `assets/plano-logo.svg`).
- **GitHub repo:** `jaimenoain/plano` — same code as the local mount.
- **Design reference:** [a24films.com](https://a24films.com) — aesthetic north star.

---

## Content Fundamentals

Plano's voice is **confident, quiet, and editorial** — never salesy, never chirpy. The app feels like it was written by a thoughtful architecture magazine, not a consumer social app.

### Tone

- **Sentence case for everything except uppercase-tracked eyebrows and CTAs.** Titles are sentence case. Buttons are sentence case. Only the small all-caps tracked labels (`TRACK`, `COLLECT`, `EXPLORE NEARBY →`) use uppercase — that's a deliberate architectural convention, not shouting.
- **Second person ("you"), but sparingly.** Copy frequently drops the pronoun entirely and lets the verb carry the action. "Track visits, rate buildings, and follow friends." — not "You can track visits..."
- **Commands over promises.** "Log your journey." "Curate lists." "Follow architects." Imperative, direct, no hedging.
- **British or American spelling — the codebase uses both.** `catalogue` and `cataloged` both appear (PRD + UI). No need to unify.
- **No hype words.** Never "amazing," "incredible," "revolutionary," "delightful," "unleash." Trust the typography and photography to carry the drama.
- **Em dashes and typographic detail.** Use real em dashes (—), proper apostrophes (the world's), and `·` middots for inline separators (`user · 12 buildings`).
- **No emoji. Anywhere.** Not in copy, not in headings, not in empty states. Unicode is fine for typographic punctuation (— · →) but decorative emoji break the editorial register.

### Tagline & product copy

- Tagline: **"The world's architecture, cataloged."**
- Sub: **"Track visits, rate buildings, and follow friends."**
- Section headers in the editorial feed are tiny uppercase eyebrows (`FEATURED`, `NEARBY YOU`, `NEW IN LONDON`) that sit above massive bold building names.

### The rating language

Ratings are Michelin-style — 1 to 3 points:

- **1 — Impressive.**
- **2 — Essential.**
- **3 — Masterpiece.**

A rating ≥ 2 triggers a toast: *"You just boosted this building's rank!"* (The only place Plano's copy gets playful.)

### Example copy pairings

| Eyebrow | Headline |
|---|---|
| `VISITED` | Barbican Centre |
| `WANTS TO VISIT` | Unité d'Habitation |
| `COLLECTION · 12 BUILDINGS` | Brutalist Gems of London |
| `TOP 1% · BUILT 1931` | Villa Savoye |
| `ARCHITECT` | Le Corbusier |

---

## Visual Foundations

**One principle underlies everything:** let the architecture be the colour. Plano is a photography-first platform. Every building photo will be the most saturated thing on screen. The strictly grayscale chrome ensures photos sing. The neon lime (`#BEFF00`) is rationed to a handful of sanctioned uses — the primary button, focus rings, the hover `→` arrow, and one `.accent-tag` pill (plus the `::selection` highlight and the bell dot). The drama comes from type scale and whitespace, not from spreading colour around.

### Colour

**Palette is strictly monochrome + one accent.**

- Neutrals: `#FAFAFA` page → `#FFFFFF` cards → `#F5F5F5` muted surfaces → `#E5E5E5` borders → `#171717` primary text → `#525252` secondary → `#A3A3A3` disabled.
- Accent: `#BEFF00` (electric lime) — *rationed*. There are exactly **four** sanctioned uses: (1) primary-button fills, (2) focus rings, (3) the hover `→` arrow, and (4) a single small status pill (BETA / NEW / LIVE — the `.accent-tag` utility), at most one per view. The `::selection` highlight and the bell unread dot are also lime. **Never** as a section accent, a surface fill, a verified badge, a rating dot (those are black — lime has poor contrast on white), or decorative colour beyond those. Treat it like the fluorescent tube in a concrete gallery — one fixture, deliberately placed.
- A pitch-black surface (`#000000`) exists for the global menu, mobile sidebar, and site footer — the only places that invert.
- Feedback: true green `#16A34A` (success), amber `#F59E0B` (warning), red `#EF4444` (destructive). Success green is intentionally a different hue from the brand lime so "success" and "brand" never conflate. **Use these as 10px dots next to labels, not as surface fills** — see Feedback card. Saturated feedback fills are reserved for destructive-modal confirmation actions only.

Content pages (feed, building detail, profile) are **strictly monochromatic** apart from those rationed lime touches — the primary button, a focus ring, the hover `→`, one status pill. Rating dots are black. If the neon appears beyond its sanctioned uses, it's a bug.

### Typography

- **Inter** for everything — body, headings, display. Loaded from Google Fonts with weights 400–700. At UI sizes it's a neutral grotesk; at editorial display sizes with tight tracking it performs like a poster typeface. **Never go heavier than 700 (bold)** — 800/900 breaks the elegant register.
- **Space Mono** — use sparingly, and only at small sizes (11–13px) for content that is almost entirely numeric: coordinates (canonical), date ranges, counters. Avoid for letter-heavy labels or any display size — the letterforms are too expressive to sit comfortably alongside Inter at scale.
- **Type as structure — and push it.** The contrast between a tiny uppercase tracked label (10px) and a massive bold headline *is* the design. The headline scale is the single biggest lever you have, and the most common failure is hedging to a safe medium size. Don't. Heroes scale toward **96–128px** (`--fs-8xl` / `--fs-9xl`, `.display`/`.hero`); feed building-names run **48–60px** (`.headline`). At those sizes tracking goes to `--tracking-tighter` (−0.045em) and line-height to `--lh-display` (0.92) so the letters sit tight, almost touching. The drama comes entirely from this size jump and from whitespace — not from stacking heavier weights (Inter stays 400–700).
- Letter spacing: tight negative (`-0.03em`) on large display; wide (`0.08em` – `0.15em`) on uppercase labels. Body is flat.
- No text shadow, no text gradient, no drop cap ornamentation.

### Spacing & layout

- 4px base unit. Default generously — card padding 24–32px, section gaps 48–64px, page margins 32–48px.
- Single-column `max-w-4xl` for all editorial surfaces (building detail, profile, architect profile). Sidebars are restricted to admin and settings.
- The feed has **no card containers.** Content floats directly on the white canvas. Structure comes from typography scale and generous vertical spacing — not from boxes with borders.
- Fixed layout tokens: `collection-mosaic` = 168px, `mosaic-gap` = 1.5px (hairline between mosaic cells), `search-serp` = 400px (map results column).

### Backgrounds, imagery, and grain

- Backgrounds are flat colour — `#FAFAFA` primary, `#FFFFFF` cards, `#000000` inverted surfaces. **No gradients.** No textures. No noise.
- Imagery is presented **raw** — sharp edges, no rounded corners on photographs, no drop shadows, no overlays. Like photographs mounted in a gallery.
- **Photo-less surfaces must still look finished.** When real photography isn't available, use the `.photo-placeholder` utility — a faint neutral diagonal hatch on `--surface-muted` with a monospace caption (`data-label`) naming what belongs there. Sharp 0px corners, same aspect ratios as real imagery. A grey hatch with a label reads as *deliberate, awaiting art*; a blank box or a wall of text reads as *broken*. Never substitute a flat grey rectangle, a gradient, or invented vector art.
- No hand-drawn illustrations. No stock vector art. Every visual element is either a photo, the wordmark, or a Lucide icon.
- Photography direction tends cool and documentary — architectural photographers' work, often overcast or evenly lit. Black-and-white is welcome; warm-toned saturated lifestyle shots are not.

### Borders, radii, shadows

- Default radius: `2px` (`--radius-sm`) — almost flat, deliberately sharp. Modals get `6px`. Avatars are the only `9999px` element.
- In the editorial feed, images and content blocks use `0px` radius. True sharp edges — like printed photographs in a magazine.
- Borders carry the hierarchy: `#E5E5E5` default, `#A3A3A3` for active/focused state.
- Shadows are flat and mostly absent. `shadow-md` (`0 2px 8px rgba(0,0,0,0.06)`) on cards when explicit lift is needed. `shadow-lg` on modals/popovers. Everything else uses borders alone.
- **Never** use an inner shadow. Never use a colored glow.

### Buttons & interactive states

- **Primary button:** lime fill (`#BEFF00`), dark `#171717` text, 2px radius, 500 weight, sentence case. `h-10 px-4`. Hover darkens to `#9ACC00`. (This is the `accent`/primary variant; secondary/outline/ghost stay monochrome.)
- **Outline button:** white fill, grey border, same geometry.
- **Editorial CTA:** uppercase tracked text + `→` arrow. No button container. Used for all in-page actions on content pages (review, save, follow, directions). Format: `text-xs font-medium uppercase tracking-widest`.
- **Hover:** primary lime darkens (`#BEFF00` → `#9ACC00`); text links move to `text-secondary`, and the editorial `→` nudges right and colours lime. Outline buttons fill with `surface-muted`.
- **Pressed:** `active:scale-[0.98]` on Buttons. That's it — no colour flash.
- **Focus ring:** 2px lime (`ring-brand-accent`) with 2px white offset. Visible only on keyboard focus (`focus-visible`).
- **Disabled:** `opacity-50` + `pointer-events-none`. Labels use `text-disabled` (`#A3A3A3`).

### Motion

- **Minimal.** Framer Motion is used but restrained.
- Entry animations: fade + 12px y-translate, 600ms ease-out, optional 150ms stagger.
- Hover transitions: 150ms colour change. No scale, no lift.
- Rating input uses `whileTap: { scale: 0.9 }` — the only place things squish.
- No bounces, no spring overshoots, no parallax, no scroll-driven effects.

### Transparency, blur, glass

- Sparingly. A `glass` utility exists (`backdrop-blur-xl` + 70% white tint) for top navs over photography — but most surfaces are solid.
- No frosted glass cards. No colored glass.

### Cards

Cards are **almost never boxed.**

- **Content/feed cards:** no border, no background, no shadow. Pure typography + imagery on the canvas. Image uses 0px radius. Metadata uses a 10px uppercase tracked eyebrow above a 48px bold (700) building name at `-0.03em` tracking.
- **Admin / form cards:** 1px `border-default`, `surface-card` (white) fill, 2px radius, no shadow (shadow is optional and almost never used).
- **Modals:** white fill, 6px radius, `shadow-lg`, black 50% backdrop.

### Feed as a gallery

The editorial feed is Plano's most distinctive surface. It deliberately does not look like a social media app. It looks like an architecture magazine:

1. A tiny uppercase eyebrow (10px, tracked, grey) says *what kind of thing this is* — `VISITED`, `WANTS TO VISIT`, `COLLECTION`.
2. A large building name follows (48–60px, 700 bold, tight negative tracking).
3. A subtitle with architect and city in secondary grey.
4. Optional body copy at 16px/1.75 line-height, clamped to 3–4 lines with an uppercase `READ MORE →`.
5. A hairline footer with likes/comments at the far left and a bookmark at the far right — no heavy iconography.

No containing box. No shadow. 64–96px vertical gap between items.

---

## Iconography

Plano uses **[Lucide](https://lucide.dev)** (via `lucide-react`) for its entire icon set. This is the icon library that ships with shadcn/ui.

- **Stroke-based, 1.5px stroke weight.** Monoline, open style — matches the editorial grotesk typography better than a filled icon set would.
- Default size `16px` inline (`size-4`), `20–24px` for nav rails, `h-3.5 w-3.5` for inline meta (check marks, etc).
- **Colour:** always inherits from text colour (`currentColor`). On content pages icons are `text-primary` or `text-secondary` — **never lime**. Icons, map markers, and rating dots stay monochrome; the sanctioned lime touches live on buttons, focus rings, the hover `→`, the `.accent-tag` pill, `::selection`, and the bell dot.
- **Never decorative.** If an icon sits next to text, it carries information (status, action, category). Lucide has ~1,400 icons — pick the one that's semantically exact.

Icons frequently used in Plano (by code frequency):

| Icon | Usage |
|---|---|
| `Activity` | Feed tab |
| `Play` | Explore tab |
| `BookOpen` | Guides tab |
| `Search` | Search tab |
| `Users` | Connect tab, facepiles |
| `User` | Profile |
| `Settings` | Settings page |
| `Bell` | Notifications |
| `Bookmark` / `BookmarkCheck` | Save-to-list action |
| `MapPin` | Location, map markers |
| `Building2` | Company / building meta |
| `Briefcase` | Architect portfolio |
| `CalendarDays` | Events |
| `BadgeCheck` | Verified entity |
| `Heart` | Like |
| `MessageSquare` | Comments |
| `Check` | Visited status |
| `ChevronDown` / `→` (unicode) | Disclosure / CTA |
| `X` | Close |

### The rating "dot"

The Michelin-style rating uses a **filled circle** (not a star). See `plano/src/components/ui/michelin-rating-input.tsx`. Dots are a **reward, not a rating scale** — like Michelin stars. Show **only the earned dots** (1, 2, or 3 filled circles); zero dots is valid and complete, and the row is **never padded with empty/deactivated rings**. Dots are **black** (`fill-brand-primary`), never lime — poor contrast on white. This differentiates Plano from 5-star consumer review apps.

### Logo

The Plano wordmark is a custom geometric letterform — see `assets/plano-logo.svg`. It's `currentColor` so it inherits from the text colour of its container (white on the black mobile drawer/footer, `text-primary` on the landing page). Never recolour it to the lime accent.

### No emoji. No hand-drawn SVGs. No illustrated characters.

Plano trusts photography and typography. Anything else is noise.

---

## UI Kits

- **`ui_kits/web/`** — the Plano web application: editorial feed, building detail page, landing page, map view. Built from the source code, not screenshots.

(There is no separate mobile app — Plano is a PWA served from the same codebase, with `BottomNav` and `MobileTopBar` variants of the chrome.)

---

## Known gaps & caveats

- **Fonts:** **Inter is self-hosted** as a variable font (`fonts/Inter-VariableFont_opsz_wght.ttf`, declared via `@font-face`; in the repo it lives in `public/fonts/` and is declared in `src/root.tsx`). The full 100–900 range is technically available, but **design policy caps usage at 400–700** — never set 800/900. **Space Mono** loads from Google Fonts (`https://fonts.googleapis.com/css2?family=Space+Mono`).
- **No marketing illustrations:** the codebase has none. If you need decorative imagery for a new surface, use real architecture photography (licensed) rather than invented SVG art.
- **No dark mode:** design is light-only. A pitch-black inverted surface exists for the menu/footer, but it's not a full dark theme.
