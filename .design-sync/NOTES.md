# design-sync NOTES — Plano

Repo-specific gotchas and decisions for syncing `src/components/ui/` (shadcn/ui) to Claude Design.

## ▶ STATUS FOR THE NEXT RUN (read this first)

The full sync is **already built, authored, verified, and committed** — only the **upload** is left (it was blocked by missing Claude Design auth in a headless session). When re-run from an authorized interactive terminal:

- `config.json` is complete but has **no `projectId`** → still a **first-time upload**: create a NEW Claude Design project and push into it.
- **Do NOT re-author or re-grade.** All 50 `previews/*.tsx` and all 50 `.cache/review/*.grade.json` are committed; `package-capture` carries every grade forward (sources unchanged). Just: re-stage scripts (`cp -r`) + `npm i` in `.ds-sync/`, run `cfg.buildCmd`, run the driver (`resync.mjs`, no `--remote`), confirm `ok:true`/`bad:0`, then create project + upload.
- Last local driver verdict: `ok:true`, 50/50 render clean, 0 floor cards, `upload.any:true`, `deletePaths:[]`.
- ⚠️ A concurrent **Tailwind v4 migration** exists on branch `chore/tailwind-v4`. This sync targets **Tailwind v3.4** (`tailwind.ds.config.ts` + v3 CLI). If v4 lands on main, `cfg.buildCmd` and the DS Tailwind config must be reworked for v4 before re-syncing.

## Setup / architecture

- **Not a published package.** The DS is the app's shadcn/ui library at `src/components/ui/*.tsx`, using `@/` path aliases. There is no dist library entry, so we bundle via a **barrel entry** at `.design-sync/entry.mjs` (`export *` from each ui file). Build with `--entry ./.design-sync/entry.mjs`; this also anchors `PKG_DIR` at the repo root (walk-up finds package.json name "plano"). Do NOT drop `--entry` (synth mode then resolves `PKG_DIR=node_modules/plano`, which doesn't exist).
- **Component list is a curated `componentSrcMap`** of ~50 primaries (one per file). Compound sub-parts (CardHeader, DialogContent, …) still ship in `window.Plano` via the barrel `export *`; they just don't get their own cards. 257 total exports.
- **`@/` alias resolution** via `cfg.tsconfig = tsconfig.json` (paths `@/* -> ./src/*`).
- **Excluded from the barrel:** `toaster.tsx` (its `Toaster` collides with sonner.tsx's — we keep sonner's), `LocationInput.tsx` (Google Maps + app hooks), `style-select.tsx` (app-specific data). `toast.tsx` primitives ship but get no card.

## CSS / tokens — IMPORTANT (re-sync must regenerate)

- shadcn styles entirely via Tailwind utility classes → we need a **compiled** stylesheet, not the raw `@tailwind` `src/index.css`.
- `cfg.buildCmd` compiles it: `node_modules/.bin/tailwindcss -i src/index.css -o .design-sync/ds-styles.css --config tailwind.config.ts --minify`. Run this BEFORE the converter each sync (`cfg.cssEntry` points at the output). The file is gitignored (derived).
- The repo's `dist/assets/*.css` is STALE (Mar 2026, references old "Space Grotesk"); never use it. Current tokens: sans=Inter, mono=Space Mono (tailwind.config.ts fontFamily).

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
