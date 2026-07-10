# Layout & app chrome

How Plano frames content across breakpoints. The product is a **PWA served from one codebase** — there is
no separate mobile app, just responsive chrome variants.

---

## The reading measure

- All editorial reading surfaces (building detail, profile, architect profile, article-like pages) are
  **single-column `max-w-4xl`**, hard-left or centred for reading.
- Sidebars are restricted to **admin and settings** — never on content pages.
- The feed sits in the centre column of the app shell (see below).
- Page margins: 32–48px. Section gaps: 48–64px. Editorial gaps between feed items: 64–96px.

## Desktop chrome — top nav + right rail

The desktop shell is a **horizontal sticky top navigation bar plus a two-column body** — **not** a left
sidebar.

- **`AppTopNav`** (`src/components/layout/AppTopNav.tsx`) — the sticky top bar: logo + nav links +
  search + primary action + `Bell` + avatar. The active link is **bold with a 1px underline**, inactive
  links are `text-secondary` → `text-primary` on hover. Icons are `currentColor`; in the top nav the lime
  is the small unread dot on the bell (and the primary-action button, where the nav shows one).
- **Body grid:** a fluid centre **feed column** and a **320px sticky right rail**. Right-rail section
  labels use `text-2xs`/`text-2xs-plus` uppercase at `tracking-widest`.
- **`SiteFooter`** — inverse surface (`#000000`), `text-inverse`. The wordmark sits here as
  `currentColor` (white).
- A **top bar over photography** may use the `glass` utility (`backdrop-blur-xl` + 70% white tint). Most
  other surfaces stay solid — frosted glass is the exception, not the rule. No coloured glass.

## Mobile chrome (PWA)

- **`MobileTopBar`** — compact top bar (logo + contextual actions).
- **`BottomNav`** — bottom tab bar. Same Lucide icon set as the top nav; hit targets ≥ 44px.
- **`AppSidebar`** (`src/components/layout/AppSidebar.tsx`) — the **mobile** navigation + account drawer.
  It inverts to the pitch-black surface. This is the *only* sidebar in the product chrome, and it is
  mobile-only — there is no desktop nav rail.

## The inverse surface — where black is allowed

`--surface-inverse` (`#000000`) is used **only** in three places:
1. The global menu / overlaid menus.
2. The mobile navigation drawer (`AppSidebar`).
3. The site footer.

It is not a dark theme. Plano is **light-only** — there is no full dark mode. Don't introduce one without
an explicit request.

## Responsive behaviour

- Tailwind's default breakpoints (`sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280). Confirm against the live
  config; extend, don't change.
- Chrome swaps at the `md`/`lg` boundary: **top nav + right rail** on desktop, `MobileTopBar` +
  `BottomNav` (+ the `AppSidebar` drawer) below.
- The map/search SERP column is fixed at **400px** (`--search-serp`) on desktop; it becomes a sheet/overlay
  on mobile.
- Headlines scale fluidly via `clamp()` — they don't need per-breakpoint overrides. Let the `vw` term do
  the work.
- Imagery keeps `radius-none` and its aspect ratio at every size; it never gains rounded corners on mobile.

## Grid & asymmetry

- Editorial layouts are rarely centred. Anchor a headline hard-left, let it run wide, set meta in a narrow
  column beside it.
- The collection mosaic uses 168px cells (`--collection-mosaic`) with a 1.5px hairline gap
  (`--mosaic-gap`) — a tight architectural grid, not a gallery with gutters.
