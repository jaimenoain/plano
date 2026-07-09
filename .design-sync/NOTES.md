# design-sync NOTES — Plano

Repo-specific gotchas and decisions for syncing `src/components/ui/` (shadcn/ui) to Claude Design.

## ▶ STATUS FOR THE NEXT RUN (read this first)

The full sync is **built, authored, verified, and committed**; the v4 rebuild is done. Only the **upload** may remain if a prior run hit missing Claude Design auth (`/design-login`). When re-run from an authorized interactive terminal:

- `config.json` may still have **no `projectId`** → then it's a **first-time upload**: create a NEW Claude Design project and push into it. Once uploaded, `projectId` is recorded and future runs are re-syncs.
- **Do NOT re-author or re-grade.** All 50 `previews/*.tsx` and all 50 `.cache/review/*.grade.json` are committed; grades key on the authored previews (unchanged), so `package-capture` carries every grade forward even though component `.tsx` classNames changed under v4. Just: re-stage scripts (`cp -r`) + `npm i` in `.ds-sync/` (**including `@tailwindcss/cli@4`, see below**), run `cfg.buildCmd`, run the driver, confirm `ok:true`/`bad:0`, then create project + upload.
- Last local driver verdict: `ok:true`, 50/50 render clean, 0 floor cards, `upload.any:true`, `deletePaths:[]`.

### ⚠️ Tailwind v4 migration — LANDED (2026-07-03, commit 39dcf043)

The v4 migration is now on main. The old v3 approach (`tailwind.ds.config.ts` JS config + repo's `node_modules/.bin/tailwindcss` v3 CLI) is **dead** — the repo no longer ships a standalone tailwind CLI (only `@tailwindcss/postcss`), and there is no `tailwind.config.ts`. Handled as follows:

- **`cfg.buildCmd` reworked for v4**: `.ds-sync/node_modules/.bin/tailwindcss -i .design-sync/ds-entry.v4.css -o .design-sync/ds-styles.css --minify`.
- **`.design-sync/ds-entry.v4.css`** (committed) is the new build entry: `@import "../src/index.css"` (the app's CSS-first config with `@theme` tokens), `@source "../.design-sync/previews"`, and a big `@source inline(...)` that re-creates the old safelist — forcing the full `{bg,text,border,ring,…}-{token}` palette (+ hover/focus/active/disabled) into the compiled CSS so Claude Design can use the whole palette. **If tokens are added/renamed in `src/index.css` `@theme`, mirror them in that inline list.** `tailwind.ds.config.ts` is retained only as dead reference — v4 ignores it.
- **The v4 standalone CLI is NOT a repo dep.** It's installed into the isolated staging dir: `cd .ds-sync && npm i @tailwindcss/cli@4`. On a fresh clone, install it alongside esbuild/ts-morph. Version must be ≥ the repo's `tailwindcss` (currently 4.3.2).
- **Design tokens & fonts survived the migration unchanged** — same names (`--brand-primary` #171717, `--surface-card`, `--text-primary` …, `--brand-accent` #beff00), Inter + Space Mono. So conventions.md is still accurate; only build tooling changed.
- Compiled CSS is now **~513 KB** (was ~258 KB under v3) — v4 emits the full theme as custom properties + preflight. Not a defect.

### ⚠️ The driver does NOT run `cfg.buildCmd`

`resync.mjs` chains build→diff→validate→capture but does **not** invoke `cfg.buildCmd` — despite older notes implying "automatic prerequisite". **You must run `cfg.buildCmd` manually before the driver** (regenerate `.design-sync/ds-styles.css`), or the build copies a stale `ds-styles.css` and components render against outdated CSS (silently — the render check still passes because most classes overlap). Symptom of the miss: `_ds_bundle.css` stays at the old byte size. Always: `run buildCmd → run driver`.

## Setup / architecture

- **Not a published package.** The DS is the app's shadcn/ui library at `src/components/ui/*.tsx`, using `@/` path aliases. There is no dist library entry, so we bundle via a **barrel entry** at `.design-sync/entry.mjs` (`export *` from each ui file). Build with `--entry ./.design-sync/entry.mjs`; this also anchors `PKG_DIR` at the repo root (walk-up finds package.json name "plano"). Do NOT drop `--entry` (synth mode then resolves `PKG_DIR=node_modules/plano`, which doesn't exist).
- **Component list is a curated `componentSrcMap`** of ~50 primaries (one per file). Compound sub-parts (CardHeader, DialogContent, …) still ship in `window.Plano` via the barrel `export *`; they just don't get their own cards. 257 total exports.
- **`@/` alias resolution** via `cfg.tsconfig = tsconfig.json` (paths `@/* -> ./src/*`).
- **Excluded from the barrel:** `toaster.tsx` (its `Toaster` collides with sonner.tsx's — we keep sonner's), `LocationInput.tsx` (Google Maps + app hooks), `style-select.tsx` (app-specific data). `toast.tsx` primitives ship but get no card.

## CSS / tokens — IMPORTANT (re-sync must regenerate)

- shadcn styles entirely via Tailwind utility classes → we need a **compiled** stylesheet, not the raw `@import "tailwindcss"` `src/index.css`.
- **v4 build** (see the Tailwind v4 section above): `cfg.buildCmd` compiles it via the v4 CLI + `.design-sync/ds-entry.v4.css`. Run this BEFORE the driver each sync (`cfg.cssEntry` points at the output `.design-sync/ds-styles.css`). The output is gitignored (derived).
- The repo's `dist/assets/*.css` is STALE; never use it. Current tokens are defined CSS-first in `src/index.css` `@theme`: sans=Inter, mono=Space Mono.

## Fonts (self-hosted)

- Brand fonts (Inter, Space Mono) are loaded at runtime by the app via Google Fonts in `src/root.tsx`. For a self-contained DS we self-host the **latin** subsets in `.design-sync/fonts/` (14 woff2 + `fonts.css`), wired via `cfg.extraFonts`. Regenerate with `node .design-sync/fonts/fetch.mjs` only if the font set changes (needs `_gf.css` from the Google Fonts CSS API — see the script header).
- `cfg.runtimeFontPrefixes: ["Cambria"]` suppresses a FONT_MISSING for Tailwind's default `.font-serif` system-serif fallback (unused; brand is no-serif).

## Preview authoring conventions (calibrated on Button/Badge/Alert/Card — all graded good)

- Import from `'plano'` (→ window.Plano). Non-pkg imports (e.g. `lucide-react`) bundle normally.
- **Use inline styles + `var(--token)` for preview layout/color**, NOT extra Tailwind utility classes — the compiled CSS is purged to classes used in `src/`, so a novel utility in a preview renders unstyled. Component-provided classes are always safe. Confirmed-present tokens: `--text-primary`, `--text-secondary`, `--border-default`, `--surface-card`, `--surface-muted`, `--brand-primary`.
- Card is intentionally **borderless** by default (editorial); add a hairline via inline `border: 1px solid var(--border-default)` for the "chrome" story.
- Realistic Plano-domain content (buildings, architects, archival) — never foo/bar.

## Known render warns (triaged legitimate)

- **Progress** hardcodes `rounded-full` on track + indicator → rounded bar ends despite the sharp-corners brand rule. Component's own style, not author-controllable via a preview. Graded good as-is.
- **Avatar** preview uses an external `https://i.pravatar.cc` image. It loaded in the local capture (network not fully blocked), but in the actual Claude Design runtime external images are CSP-blocked — Avatar will then show its **initials fallback** (present in every cell, on-brand). Expected, not a defect.
- **NavigationMenu** renders the **closed** nav bar (all triggers + link visible). Radix viewport height computes to 0 when forced open statically, so the open panel can't be captured from the `.tsx` alone. Closed bar is a valid styled story.
- Interactive-only states (hover thumbs on ScrollArea/Slider, live drag on Resizable, MichelinRatingInput hover) are intentionally not shown — static states only.
- `GRID_OVERFLOW` is resolved via `cardMode: column` overrides (Table, Form, TagInput, AspectRatio, ResizablePanelGroup, Pagination, Tabs) — presentation-only, grades carry.

## Authoring patterns (calibrated across all 50 — reuse on re-sync)

- **Radix static states via uncontrolled `defaultX`:** Checkbox/Switch `defaultChecked`; RadioGroup/Tabs/ToggleGroup(single) `defaultValue`; Slider `defaultValue={[n]}` (two-element for a range); Toggle `defaultPressed`; Accordion `defaultValue`; Collapsible `defaultOpen`.
- **Overlays authored OPEN** (cardMode:single in config): Dialog/AlertDialog/Sheet/Drawer/Popover/HoverCard/DropdownMenu/Select via `defaultOpen`; Tooltip via `<TooltipProvider>` + `<Tooltip defaultOpen>`; Menubar/Select open via `defaultValue`; **Drawer** needs `shouldScaleBackground={false}`; **ContextMenu** (no open prop) opened by dispatching a native `contextmenu` MouseEvent on the trigger in `useEffect` — renders the REAL menu, not a lookalike.
- **Controlled customs need live state inside the story:** TagInput (`{tags,setTags}` — `useState`), MichelinRatingInput (`onChange` noop), SegmentedControl (`value`+noop, and a **unique `name`** per instance or framer-motion `layoutId` collides across cells).
- **Form** (react-hook-form): set up `useForm()` in the story; to show a validation error, call `form.setError()` inside `useEffect(...,[])` — calling it during render is lost before capture.
- **Separator vertical / ResizablePanelGroup / ScrollArea**: need an explicit parent height (component is `h-full`), else they collapse.
- **Sidebar**: the fixed panel occludes a `SidebarInset` sibling in the static card — offset the main content with `marginLeft: 18rem` on a plain `<main>` instead.

## CSS safelist (why styles.css is ~258KB not ~130KB)

- `cfg.buildCmd` uses **`.design-sync/tailwind.ds.config.ts`** (not the app's config). It extends the app config but adds a `safelist` forcing every token utility class (`bg-`/`text-`/`border-`/`ring-` × every semantic token, + hover/focus/active/disabled variants) into the compiled CSS, and scans `.design-sync/previews/`. Rationale: the app-purged CSS omits token classes the app happens not to use, but designs built in Claude Design must be able to use the WHOLE palette. If you add/rename tokens in `tailwind.config.ts`, update the `TOKENS` list in the DS config too.

## Re-sync risks

- `cfg.cssEntry` (ds-styles.css) is derived; re-run buildCmd (automatic via driver prerequisite) after any token change. Fonts are committed-static — regenerate only if families change.
- Overlay previews (Dialog/Sheet/etc.) authored in open state depend on radix `defaultOpen`; ContextMenu depends on the dispatched-`contextmenu`-event trick still opening the real content.
- **Capture artifact (not a real defect):** headless Chrome shows autofill-yellow on a couple of text inputs (Dialog title, Popover name) in the local capture. It does NOT appear in the live Claude Design product (no saved autofill data there). Ignore unless it shows up for the user in the DS pane.
- Avatar preview uses an external image that the live CSP will block → initials fallback renders (fine).
