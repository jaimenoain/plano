---
name: plano-design
description: Use this skill to generate well-branded interfaces and assets for Plano — an editorial, photography-first, monochrome social platform for the world's architecture. Contains essential design guidelines, colours, typography, fonts, assets, and UI kit components for prototyping or production work.
user-invocable: true
---

Read the README.md file within this skill first; it covers brand voice, the full token system, hover/press behaviour, layout rules, and iconography conventions. Then explore the other available files:

- `colors_and_type.css` — drop-in CSS variables for the full design system, plus semantic element styles (`h1`, `.eyebrow`, `.cta-link`, `.display-hero`, `.mono`, etc).
- `assets/` — production logo + favicon + PWA icons. The wordmark is `currentColor`; do not recolour.
- `ui_kits/website/` — recreations of the public Plano surfaces (landing, editorial feed, building detail) with shared primitives (`Button`, `Badge`, `Avatar`, `Icon`, `PlanoLogo`, `PhotoPlaceholder`). Copy or adapt these JSX components into new artefacts.
- `preview/` — design-system specimen cards (colour swatches, type scale, component states). Useful as visual reference when verifying that an artefact matches the system.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy the assets and CSS into the artefact's folder and produce static HTML files for the user to view. If working on production code, you can lift values directly from `colors_and_type.css` and read the rules in `README.md` to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask a handful of clarifying questions (audience, output format, density, whether real photography will be supplied), and then act as an expert designer who outputs HTML artefacts _or_ production code, depending on the need.

**Critical rules to honour at all times:**

1. **Monochrome.** Black, white, neutral greys. The brand lime `#BEFF00` appears in exactly two contexts — `::selection` and the bell notification dot. Anywhere else is a bug.
2. **No emoji.** Use Lucide stroke icons or unicode glyphs (`→` `·` `§`).
3. **No serif.** Inter + Space Mono.
4. **Sharp corners.** `border-radius: 0` on photography and editorial chrome. `2px` is the legacy primitive default; `radius-full` is for avatars and dot markers only.
5. **No gradients on UI** — only the cinematic black gradient at the bottom of full-bleed building heroes.
6. **Borders, not shadows.** `1px solid #E5E5E5` does the work; shadows are reserved for modals and dropdowns.
7. **Type contrast is the design.** 11px tracked uppercase eyebrows paired with 60–72px tight-tracked headlines. Never compress this gap.
8. **Photography is the colour.** When you don't have a building photo, draw a flat grey gradient stand-in (see `PhotoPlaceholder` in the UI kit) — never an SVG illustration of a building.
