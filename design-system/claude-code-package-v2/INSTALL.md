# Installing the Plano design system into your repo

You don't need to write any code for this. Hand this whole folder to Claude Code and tell it:

> **"Read INSTALL.md in this folder and install the Plano design system into the repo."**

Here is what it will do (and what you can verify):

## 1. Place `CLAUDE.md`

- Copy `CLAUDE.md` to the **root of your repo** (the same folder as `package.json`).
- If a `CLAUDE.md` already exists there, **merge** the Plano section into it instead of overwriting.
- This is the file Claude Code reads automatically on every session. It's the rules + a map of the
  other docs.

## 2. Place the `design-system/` folder — and consolidate the existing one

- This repo **already has a partial `design-system/` folder** (`README.md`, `SKILL.md`,
  `colors_and_type.css`, plus `preview/` and `ui_kits/`). **Replace** those docs with this package's
  fuller set rather than leaving two copies to drift. Keep the repo's `preview/` and `ui_kits/` if you
  want the visual specimens; overwrite the overlapping `README.md` / `SKILL.md` / token css.
- Recommended home: keep it at the repo's existing `design-system/` path (referenced by
  `docs/DESIGN_TOKENS.md`), or `docs/design-system/`. Wherever it lands, update the paths in
  `CLAUDE.md`'s document table so the links resolve.
- **`docs/DESIGN_TOKENS.md` stays authoritative for token values and visual-behaviour rules.** These
  docs are the narrative/rationale layer and defer to it — see `design-system/SOURCE-OF-TRUTH.md`.

## 3. Wire the lint rules (optional but recommended)

- The token-discipline rules live in `design-system/adherence.oxlintrc.json` (a copy of the design
  system's `_adherence.oxlintrc.json`). They warn on raw hex colours, raw `px` values, and non-system
  fonts.
- Claude Code can merge these into the repo's existing oxlint / eslint config so the rules run in CI.
  If your repo doesn't lint yet, this is safe to skip — the same rules are stated in plain English in
  `CLAUDE.md` and `TOKENS-AND-TAILWIND.md`.

## 4. Reconcile tokens with the live Tailwind config

- `design-system/TOKENS-AND-TAILWIND.md` tells Claude Code how to map every design token to your
  Tailwind setup. Ask it to **reconcile** the doc with your actual `tailwind.config.*` (or `@theme`
  block) — extend what's missing, never silently change values that already exist.

---

## What's in this folder

```
claude-code-package/
├── CLAUDE.md                 ← goes to repo root (the always-loaded rules + doc map)
├── INSTALL.md                ← this file
└── design-system/
    ├── README.md             ← the full narrative bible (visual + content + iconography)
    ├── SKILL.md              ← condensed working-set: recipes, key tokens, hard noes
    ├── SOURCE-OF-TRUTH.md    ← which file wins when docs disagree (repo config → DESIGN_TOKENS.md → this)
    ├── MIGRATION.md          ← the refresh playbook: order to work in + gates to pass
    ├── TOKENS-AND-TAILWIND.md← token table + Tailwind/shadcn mapping + reconcile steps
    ├── COMPONENTS.md         ← every component: props, variants, usage, file path
    ├── PATTERNS.md           ← page composition recipes (feed, detail, profile, map, modal, forms…)
    ├── LAYOUT-AND-CHROME.md  ← responsive: top nav + right rail / bottom nav / mobile drawer / glass
    ├── VOICE-AND-CONTENT.md  ← copy & voice guide (ratings language, microcopy, toasts)
    ├── ACCESSIBILITY.md      ← focus, contrast, hit targets, reduced motion
    ├── CHECKLIST.md          ← the "is this Plano?" review gate
    ├── plano-tokens.css      ← portable token mirror (values authoritative in docs/DESIGN_TOKENS.md)
    ├── adherence.oxlintrc.json ← lint rules (raw hex / px / non-system font warnings)
    ├── fonts/                ← Inter variable font (referenced by plano-tokens.css)
    └── assets/plano-logo.svg ← the wordmark (currentColor)
```

## A note on fidelity

These docs describe the **design intent** for Plano. Your codebase is the source of truth for *how*
things are built (which shadcn primitives, which utility classes, which file lives where). When the two
disagree on an implementation detail, follow the codebase's existing patterns and bring the result back
in line with the design intent — don't blindly copy the snippets here over working code.
