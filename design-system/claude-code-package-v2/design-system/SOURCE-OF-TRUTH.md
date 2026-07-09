# Source of truth — which file wins

This package is the **design system of record**. Your repository is the **implementation**. When they
disagree on a **design decision** (what a token means, where colour goes, how a surface should look),
**this system wins and the repo gets brought into line** — not the other way round. (For a value's
*current runtime* result you still read the config — see below.) This file names the order once so the
layered docs don't re-create the ambiguity they're meant to remove.

## The hierarchy (highest wins)

1. **This design system** — `README.md` (narrative), `SKILL.md` (working set), `plano-tokens.css` (portable
   tokens), and the layered docs here. The **design decision of record**: what the tokens mean, where the
   lime goes, corner geometry, the app shell, monochrome discipline. On any design disagreement, this wins.
2. **`docs/DESIGN_TOKENS.md`** — the repo's token spec. Bring it into line with this system where they differ.
3. **`docs/COMPONENT_SPEC.md`** — component contracts as the repo defines them; conform them to the
   components documented here.
4. **`tailwind.config.ts` + `src/index.css` (+ `src/root.tsx` for fonts)** — the runtime. Read it for what a
   token *currently resolves to* and how Inter/Space Mono actually load, then update it to match this system.
   It reflects current state, not intended design.

When any of these drift, fix them in the **same** change — don't defer the sync (this is the standing
rule already stated in `docs/DESIGN_TOKENS.md`).

## Rules that the whole package must not contradict

These are the load-bearing design decisions; keep every doc here consistent with them (and bring the repo
into line where it differs):

- **The lime accent (`brand-accent` / `#BEFF00`) is rationed to four UI uses:** primary-button fills,
  focus rings, the hover `→` arrow, and one `.accent-tag` status pill per view. The `::selection` highlight
  and the bell unread dot are also lime. Nothing else is.
- **Primary buttons are lime** (`brand-accent` fill, `#171717` text; hover `#9ACC00`). The button `accent`
  variant is the lime one. Secondary / outline / ghost stay monochrome.
- **Focus rings are lime** (`ring-brand-accent`), 2px with a 2px white offset, `focus-visible` only.
- **Rating dots are a reward, not a scale** (Michelin-style). Show **only the earned dots** (filled
  **black**, `fill-brand-primary`); **never pad with empty/deactivated rings** — no dots is valid and
  complete. Not lime — it has poor contrast on white.
- **The editorial CTA `→` colours lime on hover** (and nudges 3px right); the label dims to `text-secondary`.
  Icons, map markers, and the wordmark stay monochrome (`currentColor`).
- **The desktop shell is a horizontal sticky top nav (`AppTopNav`) + a 320px sticky right rail** — not a
  left sidebar. `AppSidebar` is the **mobile** navigation drawer.

If you find this package asserting otherwise anywhere, treat it as a bug in the doc and correct it
against this list.

## Token values: don't restate, reference

Where possible these docs describe *how to use* a token and point to `docs/DESIGN_TOKENS.md` /
`tailwind.config.ts` for the exact value. Restating hex and px in prose is how drift starts. If you must
quote a value inline for readability, keep it as an illustration and let the config be authoritative.
