# CLAUDE.md — Plano

> This file is loaded automatically by Claude Code. It is the contract for working on Plano's UI.
> If a root `CLAUDE.md` already exists, merge this section into it rather than overwriting.
>
> **Note on the existing root `CLAUDE.md`:** the repo's current `CLAUDE.md` describes a Turborepo with
> `apps/web` (Next.js), `apps/mobile` (Expo), and `packages/supabase`. That does **not** match the code
> on disk, which is a single **Vite + React Router 7 SPA** (`src/`, `vite.config.ts`,
> `react-router.config.ts` — no `apps/`). When merging, use the stack line below and correct the stale
> monorepo description rather than inheriting it.

Plano is **"Letterboxd for buildings"** — a social catalogue where people log buildings they visit,
rate them on a 1–3 Michelin scale, write reviews, follow friends and architects, and discover
architecture on a map.

**Stack:** React 18 + Vite + React Router 7 · TypeScript · Tailwind + shadcn/ui · Supabase · MapLibre GL.

---

## The aesthetic in one breath

A24 / OMA / Zaha. **An architecture magazine, not a social app.** Near-zero chrome. Whitespace *is* the
structure. The drama is the jump from a 10px tracked label to a 128px headline — and the restraint to
do nothing else. Strictly monochrome; the lime accent (`#BEFF00`) is held in near-total reserve.
Get the type scale and whitespace right and Plano looks expensive; get timid with either and it looks
like a wireframe.

## Three levers carry every surface (spend effort here)

1. **Type-scale contrast — push it.** Heroes are `clamp(3.5rem, 11vw, 8rem)` → 96–128px, *not* 48.
   A safe medium headline is the single most common reason a Plano screen looks flat.
2. **Whitespace as architecture.** 96px+ between feed items, 64px+ between sections. Air is composition.
3. **Asymmetry.** Editorial layouts are rarely centred. Anchor headlines hard-left, run them wide,
   set meta in a narrow column beside them. Single-column `max-w-4xl` for reading.

## The lime accent — four sanctioned uses

`#BEFF00` is rationed — one fixture per room. Use it **only** for:
1. Primary-button fills (lime fill, dark `#171717` text; hover → `#9ACC00`).
2. Focus rings — 2px lime with a 2px white offset, on `focus-visible` only.
3. The hover `→` arrow on editorial CTAs (nudges 3px right and colours lime).
4. One small status pill per view — the `.accent-tag` utility (BETA / NEW / LIVE).

Two system touches are also lime: the `::selection` highlight and the bell unread dot — both small,
deliberate, non-decorative. Everything else is monochrome **black** (`#171717`): secondary/outline/ghost
buttons, body actions, icons, map markers, and the Michelin rating dots. Anywhere lime appears beyond the
uses above — section accents, surface fills, verified badges, decoration — **it is a bug.** The wordmark is
always `currentColor`, never recoloured to lime.

## Hard noes (these break Plano instantly)

- Gradients, textures, noise, glows — flat colour only.
- New colours, or **any lime beyond its sanctioned uses** (primary button, focus ring, hover `→` arrow,
  one `.accent-tag` pill, `::selection`, bell dot). No lime section accents, surface fills, verified
  badges, lime icons/markers, or lime rating dots.
- Rating dots treated as a 0–3 scale, or padded with empty/deactivated rings — they're a reward
  (Michelin-style): show only the earned **black** dots, and none is valid and complete.
- Raw hex, raw px, or non-system fonts in code — use tokens. (Enforced by `_adherence.oxlintrc.json`.)
- Hedging the headline scale to a safe medium size.
- Boxed feed cards · drop shadows where a hairline would do · inner shadows.
- ⭐ star ratings · rounded/pill buttons · ALL-CAPS sentences.
- Emoji (anywhere) · illustrated/spot SVGs · invented vector art · a recoloured wordmark.
- A blank or flat-grey image area — use the photo placeholder instead.
- Fonts heavier than 700 (no 800/900). Inter for everything; Space Mono only for tiny numeric meta.

---

## How to work on Plano UI

1. **This design system is authoritative; the repo is the implementation to bring into line.** Where the
   codebase and this system disagree on a *design decision*, **this system wins — update the repo, not the
   system.** Still read the relevant component in `src/` and the live Tailwind config first, to match
   existing patterns/utilities/shadcn primitives and to see what needs changing. Reconcile, don't reinvent.
2. **Editing an existing page:** change only what's asked. Preserve layout, spacing, and tokens around it.
   Use existing components; don't fork new ones for a one-off.
3. **Building a new page:** start from a recipe in `design-system/PATTERNS.md`, compose from existing
   components in `design-system/COMPONENTS.md`, size with the tokens in `design-system/TOKENS-AND-TAILWIND.md`.
4. **Never introduce a raw value.** Map every colour/space/radius/font to a token. If a token is missing,
   propose adding it to the token source — don't hardcode.
5. **Before you finish,** run the `design-system/CHECKLIST.md` gate against your change.

## The documents (read the one you need)

| File | Read it when… |
|---|---|
| `design-system/MIGRATION.md` | You're **refreshing** an existing surface — the order to work in and the gates to pass. |
| `design-system/SOURCE-OF-TRUTH.md` | Two docs disagree — which wins (this design system first, then repo config for current runtime values). |
| `design-system/README.md` | You need the full narrative — visual, content, and iconography foundations. The bible. |
| `design-system/SKILL.md` | You want the condensed working-set: recipes, key tokens, hard noes. |
| `design-system/TOKENS-AND-TAILWIND.md` | You're writing code and need token → Tailwind/shadcn class mappings. |
| `design-system/COMPONENTS.md` | You need a component's props, variants, usage rules, and file path. |
| `design-system/PATTERNS.md` | You're composing a page (feed, building detail, profile, map, modal, form, empty state). |
| `design-system/LAYOUT-AND-CHROME.md` | You're dealing with responsive layout, the sidebar, bottom nav, or top bar. |
| `design-system/VOICE-AND-CONTENT.md` | You're writing any user-facing copy. |
| `design-system/ACCESSIBILITY.md` | You're handling focus, contrast, hit targets, or motion. |
| `design-system/CHECKLIST.md` | You're about to finish — the "is this Plano?" gate. |
| `design-system/plano-tokens.css` | You want a portable token mirror for standalone HTML (values are authoritative in `docs/DESIGN_TOKENS.md`). |
