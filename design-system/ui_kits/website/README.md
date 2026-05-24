# Plano · Website UI kit

A faithful recreation of the public-facing Plano product surfaces in raw HTML + JSX (React 18 via Babel standalone).

## Screens

The kit is a click-through prototype. Open `index.html` and use the in-page navigation to move between:

1. **Landing** — the marketing page shown to logged-out visitors. Hero with the Plano headline, marquee, three-column feature grid, footer.
2. **Feed** — the editorial review feed shown to logged-in users. Top app nav, posts with massive headlines and tracked-uppercase labels, sticky right rail.
3. **Building detail** — the canonical content-detail surface. Full-bleed hero with cinematic gradient, single-column max-w-4xl body, monochrome tier badge, three-point rating dots.

## Files

| File | Purpose |
|---|---|
| `index.html` | Mounts the React app + view router. Loads `colors_and_type.css` from the project root. |
| `components.jsx` | Shared primitives: `Button`, `Badge`, `Eyebrow`, `CtaLink`, `Avatar`, `PlanoLogo`, `PlanoSymbol`, `Icon` (Lucide-style SVG inline). Exported to `window`. |
| `LandingNav.jsx` | Logged-out top bar — logo + "Join the waiting list" CTA. |
| `LandingHero.jsx` | Hero block — eyebrow, massive headline, subhead, button, feature triptych. |
| `LandingMarquee.jsx` | Avatar marquee — infinite scroll, community proof strip. |
| `LandingFeatureGrid.jsx` | Three-column feature grid · Discover / Credit / Track. |
| `LandingFooter.jsx` | Footer · © · privacy · terms · social. |
| `AppTopNav.jsx` | Logged-in app shell · 64px sticky · logo + nav + actions + bell + avatar. |
| `FeedPage.jsx` | Editorial feed · scale-contrast typography · monochrome thumbnails. |
| `BuildingDetail.jsx` | Single-column content detail · hero photo · architect statement · attributes · rating. |
| `App.jsx` | Router + view registry. |

## Notes

- All "photography" in this kit is rendered as flat grey gradient blocks. Real Plano always presents real building photography full-bleed, sharp-cornered, with no border or shadow.
- Lucide-style stroke icons are inlined as raw SVG inside `<Icon name="..." />` for offline previewing.
- The kit is cosmetic — buttons that look interactive log to console; no Supabase or routing.
