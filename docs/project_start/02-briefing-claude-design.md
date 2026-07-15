# Briefing Claude Design

> **Audience:** The human running the bootstrap, working in a Claude Design
> session and, at the end, a Claude Prototype session — plus the coding agent
> that will later consume what Design hands back.
>
> **When to use:** Steps 2–4 of the bootstrap (feed the PRD into Claude Design,
> refine the prototype, ask Design to prepare files for the repo). Use it before
> `docs/project_start/03-inserting-the-design.md`, which covers dropping the
> output into the repo. `docs/PRD.md` must already exist **and carry a
> Build-Ready Declaration block at its foot** (the §4 completeness gate has
> passed) — see `docs/project_start/01-writing-the-prd.md`. If that block is
> missing, the PRD is not build-ready; finish Step 1 before briefing Design.

---

This guide is the **handoff contract** between Claude Design and the repo. It
defines exactly what to feed Claude Design, what shape the two exported packages
must take, and the four design documents Claude Design must return so they drop
cleanly into the repo with no reshaping.

Claude Design produces everything visual: the design package, the product
prototype, and the three design documents that used to be generated repo-side
(`docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and the brand-voice rule
`.cursor/rules/07-brand-voice.mdc`). The coding agent no longer _generates_
these; it _implements_ from them. The only design artefact the agent still
authors from a token document is `apps/web/tailwind.config.ts` — built from
`docs/DESIGN_TOKENS.md` during the scaffold phase of the roadmap (see
`docs/project_start/build-reference/scaffold.md`).

The remaining sections cover, in order: (1) what to feed Claude Design and ask
it to produce; (2) the design **package** export format; (3) the product
**prototype** export format; (4) the exact shape of the four design documents
Claude Design must return; and (5) a deliverable checklist mapping every output
to its repo destination.

---

## 1. What to feed Claude Design and what to ask it to produce

**Feed it `docs/PRD.md`.** The PRD is the brief. It carries the product's
identity, audience, screens, flows, and full lifecycle. Claude Design derives
the brand direction, the screens to prototype, and the copy from it. Confirm the
PRD is build-ready first — it must end with a **Build-Ready Declaration** block
(`01-writing-the-prd.md` §4); if it does not, Step 1 is unfinished. Do not
interview the design session for product decisions that belong in the PRD —
resolve those in `docs/project_start/01-writing-the-prd.md` first.

**Ask it to produce, across two sessions:**

1. A **design package** — the brand system: tokens, assets, atom-level UI kits,
   and a brand brief. Built in the Claude Design session.
2. A **product prototype** — the PRD's main screens rendered in the brand,
   including their non-happy-path states. Built in a Claude Prototype session.
3. Three **design documents**, shaped for direct insertion into the repo:
   `docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and the brand-voice content
   destined for `.cursor/rules/07-brand-voice.mdc`. Their required structure is
   in Section 4. The brand-voice content is normally carried inside the
   package's `README.md`; the token and component documents are their own files.

The prototype is expected to cover the **happy path of the main product
screens** plus their key states. It is **not** expected to cover every screen in
`docs/PRD.md` — partial coverage is normal and fully supported downstream. An
absent screen is treated as a deliberate signal: the build falls back to the
package's atoms for it. So do not pad the prototype to look complete; ship the
screens the product actually has.

At the very end of each session, apply the export-format constraints below so
the files land where the repo expects and the two packages agree on token
vocabulary. These are **mechanical output constraints** — they change no colour,
type, spacing, layout, copy, or screen decision already made. They only fix the
_shape_ of the exported files.

---

## 2. Design package export format

These constrain the design **package** (the brand system built in the Claude
Design session).

### 2.1 The spacing scale must use Tailwind's default step numbering

This is the single most important constraint. The numeric spacing tokens in
`colors_and_type.css` must resolve to the same pixel values Tailwind's own
utilities of that number resolve to, so that a token name means exactly one thing
in the package, in the generated Tailwind config, and in any component code:

- `1` = 4px, `2` = 8px, `3` = 12px, `4` = 16px, `5` = 20px, `6` = 24px,
  `7` = 28px, `8` = 32px, `9` = 36px, `10` = 40px, `11` = 44px, `12` = 48px,
  `14` = 56px, `16` = 64px, `20` = 80px, `24` = 96px — Tailwind's default scale.
- Do **not** renumber the scale into a dense `1,2,3,4,5,6,7,8,9,10` run where the
  numbers stop matching Tailwind (e.g. a scale where `10` means 72px). That is
  the specific thing to avoid: it silently breaks every spacing utility
  downstream, because `mt-10` renders as Tailwind's 40px regardless of what the
  package intended, and nothing flags the mismatch because the class is
  syntactically valid.
- If the design genuinely needs a spacing value Tailwind's scale skips, give it a
  **named** token (`--space-section`, `--space-page-x`) rather than inventing a
  numbered slot that collides with Tailwind. Named tokens are unambiguous;
  renumbered numeric tokens are not.
- Express each token in both rem and a px comment, e.g.
  `--space-8: 2rem; /* 32px */`.

### 2.2 Folder and file structure

Keep the package's structure exactly as below — the intake step
(`docs/project_start/03-inserting-the-design.md`) and the downstream design
documents read files by these paths:

- `README.md` — the brand brief, including the **brand-voice content** (voice,
  words to avoid, do/don't copy table, casing rules, any legally-mandated
  disclaimer) stated explicitly. This is the authoritative source for the
  brand-voice rule file, so spell the voice rules out rather than only
  demonstrating them. The README's "Visual foundations" section is also read for
  interaction rules (hover deltas, focus ring offsets, transition durations,
  modal entry patterns) and layout maxima.
- `SKILL.md` — the user-invocable skill manifest, left as normally generated.
- `colors_and_type.css` — all design tokens (colour, type, the Tailwind-native
  spacing scale above, radius, shadow, motion/duration), as CSS custom
  properties.
- `assets/` — brand assets. Include the four logo roles as separate files where
  the brand has them: primary logo/wordmark, logomark/square variant,
  dark-background variant, and favicon.
- `preview/` — the preview cards, including a spacing-scale preview if generated.
- `ui_kits/app/` and `ui_kits/marketing/` — the two UI kits. Keep
  `ui_kits/app/Atoms.jsx` as the atom-level component reference; the component
  spec reads it by that path.

### 2.3 Colour, radius, and shadow tokens should be named, not just raw values

- Provide semantic aliases (e.g. `surface-default`, `surface-card`,
  `text-primary`, `border-default`, `accent`) alongside the raw palette, and have
  the aliases reference the raw tokens. If the brand uses its own vocabulary
  (`paper`, `ink-1`, `postage`), keep that vocabulary — do not rename to generic
  SaaS terms.
- For radius and shadow, ship only the steps the brand actually uses. If the
  brand deliberately uses few shadows or forbids pill radius, reflect that by
  omitting those tokens rather than padding the scale to look complete.

### 2.4 Don't pad scales to look complete

Ship the values the design actually uses. An honest short scale (three shadows,
six spacing steps) is better than a padded one — the downstream tooling treats
the absence of a token as a deliberate brand decision, so an invented "just in
case" token becomes a rule nobody intended.

---

## 3. Product prototype export format

These constrain the product **prototype** (the PRD's screens applied to the
brand, built in the Claude Prototype session). Downstream tooling reads the
prototype as a **reference, not as code to copy**, and can only do that reliably
if the files are where it expects them and the tokens agree with the design
package.

### 3.1 Token CSS must mirror the design package's token names and Tailwind-native scale

This is the single most important prototype constraint. The prototype ships its
own `*-tokens.css`, and it is later reconciled into `docs/DESIGN_TOKENS.md` as
the _refined_ brand source. Reconciliation is only safe if the prototype's tokens
are the **same vocabulary** as the package's `colors_and_type.css`, not a
parallel invention:

- Use the **same token names** the package uses (`surface-card`, `text-primary`,
  `accent`, the brand's own `paper`/`ink-1`/`postage` vocabulary — whatever the
  package shipped). Where the prototype legitimately _refines_ a value (e.g. the
  rendered body size ended up `font-size-base`, not `-sm`), express it as a new
  value for the **existing named token**, so the reconciliation sees an
  unambiguous override rather than a remapping.
- The spacing scale must use **Tailwind's default step numbering** — identical to
  the design package (Section 2.1): `1`=4px, `2`=8px, `4`=16px, `8`=32px …
  `24`=96px. Do **not** renumber into a dense `1..10` run where the numbers stop
  matching Tailwind. A renumbered scale here silently fights both the package and
  the generated Tailwind config, and the component spec will round the same
  spacing relationship inconsistently across components.
- If a screen genuinely needs a value the scale skips, give it a **named** token
  (`--space-section`) and list it (see 3.6) — never a numbered slot that collides
  with Tailwind.
- Express each token in both rem and a px comment, e.g.
  `--space-8: 2rem; /* 32px */`.

### 3.2 Folder and file structure

The prototype is placed at `reference/prototype/` on intake. Emit exactly this,
and nothing extra:

- One **HTML entry point** (`*.html`). It is the entry point only; downstream
  treats it as not useful as reference, so it needs no special content.
- One **`*-tokens.css`** — the refined token source from 3.1. Name it after the
  product (e.g. `postcards-tokens.css`).
- One **layout shell CSS** named `styles.css` — read downstream for visual intent
  only.
- **One `.jsx` file per screen**, named after the screen (see 3.3).
- A **`screenshots/`** directory (see 3.3).
- Do **not** emit an `uploads/` folder or other session/build cruft. The export
  sometimes includes one; if it's there, remove it before export so the repo
  never sees it.
- Keep prototype-only class names clearly prefixed (a `k-*` convention is fine) so
  they are never mistaken for shipping classes — they are reference-only and are
  never carried into production code.

### 3.3 One screen per file, named after the screen, with matching screenshots and a manifest

The intake step builds a screenshot index whose **Coverage-gaps** section is the
single most valuable signal a partial prototype gives downstream, and the
component spec maps each listed component to the screen it appears on. Both are
reliable only if screens are individually addressable:

- Each main screen is its own `.jsx` file with a descriptive name
  (`dashboard.jsx`, `send-postcard.jsx`), not one monolithic `app.jsx`.
- Each screen has a screenshot in `screenshots/` named to sort and to match its
  screen: `NN-screen-name.png` (`01-dashboard.png`, `02-send-postcard.png`).
- Include a short **`SCREEN_MANIFEST.md`** at the prototype root: one row per
  screen mapping `screen file → screenshot → the PRD screen/flow it represents →
the state it shows`. This lets the intake step diff against `docs/PRD.md` for
  true coverage instead of inferring it, and gives the component spec a stable
  screen-to-component map. Keep it factual; it is not a design artefact.

### 3.4 Render the states that matter, not only the happy path

Any state the prototype renders, the component spec specifies from observation;
any state it doesn't, the component spec _derives_ (i.e. guesses). The happy path
alone leaves exactly the hard states being guessed. For the main covered screens,
render the states the product actually has as their **own screen variants with
their own screenshots** and manifest rows:

- **Empty** (no data yet), **loading** (skeleton/spinner), and **error** states
  for any screen that loads data.
- Any **permission / over-limit / disabled** state the PRD describes for that
  screen (e.g. read-only viewer, quota reached).
- Name them so the state is explicit: `dashboard-empty.jsx` /
  `04-dashboard-empty.png`, etc.

This is the highest-leverage thing the prototype can do for the build: it
converts "derived" components and states into observed ones. Render the states
the product has — don't invent states it doesn't.

### 3.5 Use real, on-brand copy and real icon components

- **Real copy, not lorem ipsum.** The brand-voice augmentation reads the
  prototype's rendered strings to infer the project's copy patterns (casing,
  contractions, salutations, error wording). Placeholder text teaches it nothing;
  on-brand strings teach it the real conventions.
- **Named icon components** (lucide-react) rather than ad-hoc inline SVGs, so the
  component spec can name the product's actual icon choices for recurring actions
  (edit, delete, expand, external link) instead of deriving generic ones.

### 3.6 Don't pad to look complete — and list what you added

Ship the screens, states, and tokens the product actually uses. Partial coverage
is fully supported: downstream treats an absent screen as a deliberate signal and
falls back to the design package's atoms for it, so an invented "just in case"
screen becomes a component nobody asked for. Conversely, if you introduced any
**named** token the design package didn't ship (3.1), list those additions at the
top of `*-tokens.css` in a short comment block so the reconciliation handles them
deliberately rather than discovering them by surprise.

---

## 4. The design documentation Claude Design must return

Claude Design must return three design documents in the exact shapes below, ready
to commit without editing. The **hierarchy of authority** across all visual
sources — applied by the coding agent throughout the build and encoded in
`.cursor/rules/03-frontend.mdc` § "Visual reference hierarchy" — is:

1. `apps/web/tailwind.config.ts` — **implementation truth.** Does not exist until
   the scaffold phase builds it. On any disagreement with the documents below,
   the implementation wins.
2. `docs/DESIGN_TOKENS.md` — **documentation truth.**
3. `reference/prototype/[name]-tokens.css` — refined brand source (canonical
   token input).
4. `design-system/colors_and_type.css` — original brand source.
5. `reference/prototype/` JSX, CSS, and screenshots — how the brand applies to
   product screens.
6. `design-system/` atoms and previews — primitive components in isolation.

`docs/DESIGN_TOKENS.md` remains **documentation truth**: the coding agent reads
it during the scaffold phase and injects its values into
`apps/web/tailwind.config.ts`. Once that config exists, the implementation is the
truth on any disagreement — but the source of change is always this document, not
a hand edit to the config.

Where the prototype tokens and the package tokens disagree, the prototype wins,
and the disagreement is recorded in the token document's Designer Notes. Where the
prototype's typography or colour application differs from the package's atoms, the
prototype wins for _application rules_; the package's atoms still win for
_primitive-in-isolation_ visuals.

### 4.1 `docs/DESIGN_TOKENS.md`

The authoritative source for all project-specific visual tokens: the complete
token set a developer pastes directly into `tailwind.config.ts`. Every value must
be a real, usable CSS value — no vague descriptions, no mood-board language, no
ranges. This document contains no wireframes, layouts, or component designs.

**Translation rules that shape this document:**

- **Token names.** Prefer the brand's own naming where it carries meaning
  (`paper`, `ink-1`, `accent`). Do not rename to generic SaaS vocabulary
  (`gray-50`, `primary-500`). Where a brand name maps cleanly onto a semantic
  alias used in the rules layer (e.g. `surface-default`, `text-primary`), include
  both: a brand-named raw token plus a semantic alias resolving to it.
- **Raw palette derivation.** Ship only the _used_ values, not a full 50–900
  scale. Do not invent extra shades to fill out a palette. If the source gives
  `paper`, `paper-2`, `paper-3`, that _is_ the scale — represent it accurately
  rather than padding it.
- **Brand-driven omissions are honoured.** If the README explicitly forbids a
  category ("two shadows total", "no pill radius", "no gradients"), the
  corresponding tokens must reflect that. Do not add a `radius-full` token "just
  in case" — the point of a design system is to make off-brand values
  inexpressible.
- **Prototype-vs-package reconciliation.** Diff
  `reference/prototype/[name]-tokens.css` against
  `design-system/colors_and_type.css`. For every value that differs (hex codes,
  font sizes, radii, shadows, added/removed tokens), use the prototype value and
  list the diff in §11 Designer Notes so the reconciliation can be confirmed.
- **Status colours.** If the source uses status semantics other than the default
  `success / warning / destructive` (e.g. `Open / Approaching / Overdue / Done`),
  keep the brand semantics; map to `feedback-*` aliases only if the brand naming
  maps cleanly, otherwise create new semantic aliases in the brand vocabulary.
- **Keep the spacing scale's step numbering Tailwind-native.** This is a
  correctness rule, not a style preference — the same rule as Section 2.1. The
  numeric tokens (`spacing-1`, `spacing-8`, `spacing-10`, …) must resolve to the
  same pixels Tailwind's own utilities of that number resolve to, including
  Tailwind's gaps (`7`=28px, `14`=56px, `18`=72px all exist — check before
  assuming a value is absent). Never renumber into a dense `1,2,3,4,5,6,7,8,9,10`
  sequence where the numbers no longer match Tailwind — a scale where
  `spacing-10` means 72px is a latent defect that every consumer of `mt-10`,
  `p-10`, or `gap-10` will hit silently. For an off-scale value, use a
  **brand-named** token (`spacing-section`, `spacing-page-x`) and note it in §11.
- **Other values.** Every value must be concrete: "warm blue" becomes `#3B6FD4`,
  "rounded" becomes `8px`. No ranges. Spacing/sizing scales sit on a consistent
  4px or 8px base. Honour all typefaces the source specifies (a serif for
  marketing display plus a sans for UI plus a mono for numerals stay as three
  families — do not collapse them). Dark mode tokens, if defined, are a separate
  set — do not simply invert light mode values.

The rules governing how the coding agent _consumes_ these tokens (forbidden raw
palette colours, mandatory token aliases, structural vs visual utility
distinction) live in `.cursor/rules/03-frontend.mdc` and are universal across
projects. This document produces the project-specific values those rules consume;
it does not restate them.

**Required structure** (the output must be the exact content of
`docs/DESIGN_TOKENS.md`):

````markdown
# {Project Name}: Design Tokens

> **Authoritative source for all visual design decisions.**
> The coding agent reads this file during the scaffold phase and injects
> these values into `apps/web/tailwind.config.ts`. Do not edit `tailwind.config.ts`
> token values manually — edit this file and re-run the injection task.

---

## 1. Design Intent

**Personality:** [3–5 keywords]
**Reference products:** [named products from the README, or "Derived from brief — no external references."]
**Mode:** [Light only / Dark only / Both — default: Light]
**Source:** Translated from `reference/prototype/[name]-tokens.css`, reconciled with `design-system/colors_and_type.css`, calibrated against prototype screens.

---

## 2. Colour Palette

### Raw Palette (never use these directly in components — use semantic aliases below)

| Token                     | Hex     | Usage                |
| ------------------------- | ------- | -------------------- |
| `palette-brand-500`       | #3B6FD4 | Primary brand colour |
| `palette-neutral-900`     | #111827 | ...                  |
| `palette-success-500`     | #16A34A | ...                  |
| `palette-warning-500`     | #D97706 | ...                  |
| `palette-destructive-500` | #DC2626 | ...                  |

_(Include only the values the prototype tokens actually define — do not pad the scale with invented intermediate shades. Brand-named tokens like `paper`, `ink-1`, `accent` may replace the generic palette names where the source uses them.)_

### Semantic Aliases — Light Mode

These are the only colour tokens the coding agent and components are permitted to use.

| Alias                             | Resolves to               | Purpose                                |
| --------------------------------- | ------------------------- | -------------------------------------- |
| `brand-primary`                   | `palette-brand-500`       | Primary actions, links, focus rings    |
| `brand-primary-hover`             | `palette-brand-600`       | Hover state for primary actions        |
| `brand-primary-foreground`        | `#FFFFFF`                 | Text/icons on brand-primary background |
| `surface-default`                 | `palette-neutral-50`      | Page background                        |
| `surface-card`                    | `#FFFFFF`                 | Card and panel background              |
| `surface-overlay`                 | `#FFFFFF`                 | Modal and popover background           |
| `surface-muted`                   | `palette-neutral-100`     | Muted/subdued surface                  |
| `border-default`                  | `palette-neutral-200`     | Default border                         |
| `border-strong`                   | `palette-neutral-400`     | Emphasis border                        |
| `text-primary`                    | `palette-neutral-900`     | Primary body text                      |
| `text-secondary`                  | `palette-neutral-600`     | Secondary/supporting text              |
| `text-disabled`                   | `palette-neutral-400`     | Disabled text                          |
| `text-inverse`                    | `#FFFFFF`                 | Text on dark backgrounds               |
| `feedback-success`                | `palette-success-500`     | Success states                         |
| `feedback-warning`                | `palette-warning-500`     | Warning states                         |
| `feedback-destructive`            | `palette-destructive-500` | Error and destructive actions          |
| `feedback-destructive-foreground` | `#FFFFFF`                 | Text on destructive background         |

_(If the source uses domain-specific status names like `status-open`, `status-approaching`, `status-overdue`, `status-done`, keep those names — do not remap them to generic `feedback-success/warning/destructive`. The brand vocabulary matters at the call site.)_

### Semantic Aliases — Dark Mode

**Required if dark mode was requested. It must be fully populated — no placeholder comments or incomplete entries. If dark mode was not requested, replace this section with the single line: "Dark mode: not configured."**

Dark mode tokens must not simply invert light mode values. Use palette-neutral-900 to palette-neutral-800 for backgrounds, with text on the lighter end of the scale. Every alias from the Light Mode table must have a corresponding Dark Mode alias.

---

## 3. Typography

| Token                   | Value                         | Notes                              |
| ----------------------- | ----------------------------- | ---------------------------------- |
| `font-sans`             | `'Inter', sans-serif`         | Primary UI typeface                |
| `font-mono`             | `'JetBrains Mono', monospace` | Code blocks, identifiers           |
| `font-size-xs`          | `0.75rem`                     | 12px — labels, captions            |
| `font-size-sm`          | `0.875rem`                    | 14px — secondary text, table cells |
| `font-size-base`        | `1rem`                        | 16px — body copy                   |
| `font-size-lg`          | `1.125rem`                    | 18px — lead text                   |
| `font-size-xl`          | `1.25rem`                     | 20px — card titles                 |
| `font-size-2xl`         | `1.5rem`                      | 24px — section headings            |
| `font-size-3xl`         | `1.875rem`                    | 30px — page headings               |
| `font-size-4xl`         | `2.25rem`                     | 36px — hero headings               |
| `font-weight-normal`    | `400`                         | Body text                          |
| `font-weight-medium`    | `500`                         | Labels, nav items                  |
| `font-weight-semibold`  | `600`                         | Headings, emphasis                 |
| `font-weight-bold`      | `700`                         | Hero text, strong emphasis         |
| `line-height-tight`     | `1.25`                        | Headings                           |
| `line-height-normal`    | `1.5`                         | Body copy                          |
| `line-height-relaxed`   | `1.75`                        | Long-form text                     |
| `letter-spacing-tight`  | `-0.02em`                     | Large headings                     |
| `letter-spacing-normal` | `0em`                         | Body                               |
| `letter-spacing-wide`   | `0.05em`                      | All-caps labels, badges            |

**Note:** A source may specify multiple display families (e.g. a serif for marketing display, a sans for UI, a mono for tabular numerals). Add `font-serif` or `font-display` tokens as needed and do not collapse them.

**Font loading — two options (Option A is the default):**

**Option A — `next/font/google` (recommended):** Add to `apps/web/app/layout.tsx`. The Next.js 13+ preferred approach — handles subsetting, FOIT/FOUT prevention, and performance without a `<link>` tag.

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

// Apply to <html> element: className={`${inter.variable} ${jetbrainsMono.variable}`}
```
````

**Option B — `<link>` tag (fallback only):** Use only if `next/font` is unavailable or explicitly disabled.

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap
```

---

## 4. Spacing Scale

Base unit: 4px (`0.25rem`). All spacing tokens are multiples of this base and use Tailwind's default step numbering.

| Token        | Value     | Pixels |
| ------------ | --------- | ------ |
| `spacing-0`  | `0`       | 0px    |
| `spacing-1`  | `0.25rem` | 4px    |
| `spacing-2`  | `0.5rem`  | 8px    |
| `spacing-3`  | `0.75rem` | 12px   |
| `spacing-4`  | `1rem`    | 16px   |
| `spacing-5`  | `1.25rem` | 20px   |
| `spacing-6`  | `1.5rem`  | 24px   |
| `spacing-8`  | `2rem`    | 32px   |
| `spacing-10` | `2.5rem`  | 40px   |
| `spacing-12` | `3rem`    | 48px   |
| `spacing-16` | `4rem`    | 64px   |
| `spacing-20` | `5rem`    | 80px   |
| `spacing-24` | `6rem`    | 96px   |

---

## 5. Border Radius

| Token         | Value    | Usage                            |
| ------------- | -------- | -------------------------------- |
| `radius-none` | `0px`    | Sharp elements                   |
| `radius-sm`   | `4px`    | Subtle rounding — inputs, badges |
| `radius-md`   | `8px`    | Default — cards, buttons         |
| `radius-lg`   | `12px`   | Panels, modals                   |
| `radius-xl`   | `16px`   | Large cards, sheets              |
| `radius-full` | `9999px` | Pills, avatars, toggles          |

**Default component radius:** `radius-md` _(adjust to match the source's border radius choice)_

**Note:** If the README explicitly forbids pill radius ("never pill", "restrained radii"), omit `radius-full` from this table and from the Tailwind config block. Off-brand values should not be expressible in code.

---

## 6. Shadows

| Token         | Value                                                                | Usage                         |
| ------------- | -------------------------------------------------------------------- | ----------------------------- |
| `shadow-sm`   | `0 1px 2px 0 rgb(0 0 0 / 0.05)`                                      | Subtle lift — inputs on hover |
| `shadow-md`   | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`   | Cards                         |
| `shadow-lg`   | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Modals, dropdowns             |
| `shadow-none` | `none`                                                               | Flat elements                 |

**Note:** If the source specifies a fixed number of shadows (e.g. "two shadows total"), use exactly those. Keep `shadow-none` regardless — Tailwind needs it for the `shadow-none` utility class. Do not invent additional shadow steps.

---

## 7. Tailwind Config Block

The exact object to merge into `apps/web/tailwind.config.ts`. The coding agent reads this block verbatim during the scaffold phase.

```typescript
// Paste into the `theme.extend` section of tailwind.config.ts
theme: {
  extend: {
    colors: {
      palette: {
        brand: { 50:'#F0F4FF', 500:'#3B6FD4', 900:'#0F1E4A' /* … */ },
        neutral: { 50:'#F9FAFB', 500:'#6B7280', 900:'#111827' /* … */ },
      },
      'brand-primary':             '#3B6FD4',
      'brand-primary-hover':       '#2A56B0',
      'brand-primary-foreground':  '#FFFFFF',
      'surface-default':           '#F9FAFB',
      'surface-card':              '#FFFFFF',
      'surface-overlay':           '#FFFFFF',
      'surface-muted':             '#F3F4F6',
      'border-default':            '#E5E7EB',
      'border-strong':             '#9CA3AF',
      'text-primary':              '#111827',
      'text-secondary':            '#4B5563',
      'text-disabled':             '#9CA3AF',
      'text-inverse':              '#FFFFFF',
      'feedback-success':          '#16A34A',
      'feedback-warning':          '#D97706',
      'feedback-destructive':      '#DC2626',
      'feedback-destructive-foreground': '#FFFFFF',
    },
    fontFamily: {
      sans: ['var(--font-sans)', 'sans-serif'],
      mono: ['var(--font-mono)', 'monospace'],
    },
    fontSize: {
      'xs':   ['0.75rem',  { lineHeight: '1rem' }],
      'sm':   ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem',     { lineHeight: '1.5rem' }],
      'lg':   ['1.125rem', { lineHeight: '1.75rem' }],
      'xl':   ['1.25rem',  { lineHeight: '1.75rem' }],
      '2xl':  ['1.5rem',   { lineHeight: '2rem' }],
      '3xl':  ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl':  ['2.25rem',  { lineHeight: '2.5rem' }],
    },
    borderRadius: {
      'none': '0px', 'sm': '4px', 'md': '8px', 'lg': '12px', 'xl': '16px',
      'full': '9999px', DEFAULT: '8px',
    },
    boxShadow: {
      'sm':   '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      'md':   '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      'lg':   '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      'none': 'none',
    },
  },
},
```

> ⚠️ The values above are examples. The actual values in sections 2–6 of this document govern — the Tailwind Config Block must be generated to match sections 2–6 exactly.
>
> Note: `fontFamily` uses CSS variable references (`var(--font-sans)`) to consume the variables injected by `next/font/google` in `layout.tsx`. If using the `<link>` fallback, replace with literal font names: `sans: ['Inter', 'sans-serif']`.

---

## 8. Shadcn/UI Theme Variables

Shadcn/UI uses CSS custom properties mapped to HSL values, set in `apps/web/app/globals.css` to align Shadcn primitives with the project's tokens.

**Generate the full HSL values for every variable below, derived from the actual hex values in Section 2. Every variable must have a concrete HSL value — no placeholder, comment, or ellipsis in the final output.**

```css
@layer base {
  :root {
    --background: 0 0% 98%; /* surface-default */
    --foreground: 220 13% 7%; /* text-primary */
    --card: 0 0% 100%; /* surface-card */
    --card-foreground: 220 13% 7%;
    --popover: 0 0% 100%; /* surface-overlay */
    --popover-foreground: 220 13% 7%;
    --primary: 221 63% 53%; /* brand-primary */
    --primary-foreground: 0 0% 100%; /* brand-primary-foreground */
    --secondary: 221 100% 93%; /* brand-secondary */
    --secondary-foreground: 221 63% 33%; /* brand-secondary-foreground */
    --muted: 220 9% 95%; /* surface-muted */
    --muted-foreground: 220 9% 35%; /* text-secondary */
    --accent: 221 100% 93%;
    --accent-foreground: 221 63% 33%;
    --destructive: 0 72% 51%; /* feedback-destructive */
    --destructive-foreground: 0 0% 100%;
    --border: 220 13% 91%; /* border-default */
    --input: 220 13% 91%;
    --ring: 221 63% 53%; /* brand-primary — focus ring */
    --radius: 0.5rem; /* radius-md */
  }

  .dark {
    /* REQUIRED if dark mode was requested — populate every variable above with
       dark mode HSL values derived from the dark mode semantic aliases in
       Section 2. Do not omit any variable. Do not use placeholder comments.
       If dark mode was not requested, remove this block entirely. */
  }
}
```

---

## 9. Typography Application Matrix

**The authoritative guide for how typography tokens are applied to UI contexts. Do not invent type pairings that are not listed here.** Every row references token names, not raw values.

**Calibration source:** Cross-reference the prototype's JSX screens first — they show the type system applied to real product contexts. Use the screenshot index to pick the most informative screens (typically a dashboard, a form, a list view, a modal). Cross-reference `design-system/ui_kits/app/Atoms.jsx` for atom-level type styles. Where the prototype's screens differ from the package's atoms, the prototype wins. Every row must be filled in — a partial prototype produces a matrix with rows whose source is the package, not a partial matrix.

| UI context                   | Font size        | Font weight            | Letter spacing          | Line height          | Colour alias         |
| ---------------------------- | ---------------- | ---------------------- | ----------------------- | -------------------- | -------------------- |
| Page title (h1)              | `font-size-3xl`  | `font-weight-semibold` | `letter-spacing-tight`  | `line-height-tight`  | `text-primary`       |
| Section heading (h2)         | `font-size-2xl`  | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight`  | `text-primary`       |
| Card title (h3)              | `font-size-xl`   | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight`  | `text-primary`       |
| Subsection heading (h4)      | `font-size-base` | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight`  | `text-primary`       |
| Body copy                    | `font-size-base` | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-primary`       |
| Supporting / secondary text  | `font-size-sm`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-secondary`     |
| Table header                 | `font-size-xs`   | `font-weight-medium`   | `letter-spacing-wide`   | `line-height-normal` | `text-secondary`     |
| Table cell                   | `font-size-sm`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-primary`       |
| Form label                   | `font-size-sm`   | `font-weight-medium`   | `letter-spacing-normal` | `line-height-normal` | `text-primary`       |
| Input placeholder            | `font-size-sm`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-disabled`      |
| Helper / hint text           | `font-size-xs`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-secondary`     |
| Button (primary / secondary) | `font-size-sm`   | `font-weight-medium`   | `letter-spacing-normal` | `line-height-tight`  | _(foreground alias)_ |
| Badge / tag                  | `font-size-xs`   | `font-weight-medium`   | `letter-spacing-wide`   | `line-height-tight`  | _(foreground alias)_ |
| Navigation item              | `font-size-sm`   | `font-weight-medium`   | `letter-spacing-normal` | `line-height-normal` | `text-primary`       |
| Caption / timestamp          | `font-size-xs`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-secondary`     |
| Code / monospace             | `font-size-sm`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-primary`       |
| Empty state heading          | `font-size-lg`   | `font-weight-semibold` | `letter-spacing-normal` | `line-height-tight`  | `text-primary`       |
| Empty state body             | `font-size-sm`   | `font-weight-normal`   | `letter-spacing-normal` | `line-height-normal` | `text-secondary`     |

**Generation rules:**

- Adjust heading sizes for a compact or spacious density. A compact brief typically drops h1 to `font-size-2xl` and h2 to `font-size-xl`. A spacious brief typically raises h1 to `font-size-4xl`.
- Letter spacing on badges and table headers must be `letter-spacing-wide` for capitalised or all-caps text; `letter-spacing-normal` if mixed-case.
- The "foreground alias" in Button and Badge rows must resolve to the appropriate `*-foreground` alias from Section 2 (e.g. `brand-primary-foreground`). Never use `text-primary` on a coloured background.
- Do not add rows beyond those listed. A novel UI context inherits from the nearest matching row.

---

## 10. Semantic Colour Usage Guide

**Defines exactly when each surface, border, and text alias from Section 2 is applied. If a component does not map cleanly to a rule below, it uses the nearest named ancestor context — never a raw palette value.** Generate as prose paragraphs, one per alias group, using the actual alias names from Section 2. Lift rules verbatim from the README's "Visual foundations" where they fit; augment from prototype screens where a pattern is consistent (the minimum-three-examples discipline applies here too). Do not invent rules neither source supports.

### Surface aliases

**`surface-default`** is the page background only, applied once to the root layout. Never on cards, panels, sidebar sections, or any component that sits on top of the page — that makes the component invisible against the page.

**`surface-card`** is applied to any contained element that sits directly on `surface-default`: cards, data panels, stat blocks, content sections, table containers. Always paired with `border-default` and `shadow-md`. Without a border or shadow it will be invisible in light mode.

**`surface-muted`** is applied to secondary or structural areas that must read as visually quieter than the main content: the sidebar background, secondary navigation panels, input field backgrounds, code blocks, empty-state containers. Never on action-bearing components.

**`surface-overlay`** is applied exclusively to modals and popovers, always with a backdrop overlay (typically `bg-black/50`) and `shadow-lg`. Never for inline components.

### Border aliases

**`border-default`** is the standard border for all components: cards, inputs, table cells, dividers, section separators. Intentionally low-contrast.

**`border-strong`** communicates active or focused state: the focused border on an active input, the selected state of a sidebar item, or a highlighted table row — those three contexts and no others. Not for decorative emphasis.

### Text aliases

**`text-primary`** for all content the user must read to complete a task: body copy, form labels, table cell values, modal headings, navigation items. When in doubt, default to `text-primary`.

**`text-secondary`** for supporting information: timestamps, record counts, helper text, table column headers, empty-state descriptions. Never for interactive labels or required form labels.

**`text-disabled`** exclusively for placeholder text in inputs and for labels or values on disabled interactive elements. Not for de-emphasising merely-less-important content — use `text-secondary` for that.

**`text-inverse`** for text on a dark or brand-coloured background: text inside `brand-primary` buttons, text on `feedback-destructive` banners, text in dark-mode surfaces. Never `text-primary` on a dark background.

### Feedback aliases

**`feedback-success`**, **`feedback-warning`**, and **`feedback-destructive`** exclusively for system-generated status communication: toasts, inline validation, status badges, alert banners. Not for decorative colour. Always pair with the corresponding `*-foreground` alias.

### Dark mode note

**If dark mode is configured:** every rule above applies equally to dark mode aliases. Maintain the surface hierarchy (`surface-default` < `surface-card` < `surface-overlay`) using the dark palette — do not collapse it by reusing the same dark value for multiple surface levels.

---

## 11. Designer Notes

_Brief explanation (3–5 sentences) of the key decisions and why — written for the product owner, not the developer. Explain how the palette, typeface, and radius reflect the personality keywords from the brief._

**Prototype-vs-package reconciliation.** List every token where the prototype refined a package value:

| Token               | Package value | Prototype value | Note                                             |
| ------------------- | ------------- | --------------- | ------------------------------------------------ |
| `palette-brand-500` | `#3B6FD4`     | `#3268C9`       | Prototype tightened the primary brand hue.       |
| `font-size-base`    | `1rem`        | `0.9375rem`     | Prototype reduced body size to 15px for density. |

If prototype and package agree on every token: "No reconciliation needed — prototype tokens match the design package."

**Ambiguity and judgment calls.** Note any decisions made where the sources were ambiguous or silent (e.g. "added `shadow-none` because Tailwind requires it for `shadow-none` utility classes", "brand forbids pill radius — `radius-full` excluded", any brand-named spacing token introduced for an off-scale value). State each so the owner can confirm or redirect.

## 12. Token Amendments (populated by downstream steps only)

Initially empty. If the component spec identifies tokens that are needed but missing from this file, it lists them here with proposed values. Review and accept or adjust each amendment before running the scaffold phase.

```

### 4.2 `docs/COMPONENT_SPEC.md`

The component specification gives the coding agent two things: exact
specifications for listed components, and a reasoning foundation rich enough that
it can derive any *unlisted* component correctly by analogy rather than defaulting
to a wireframe-quality placeholder. The second job matters as much as the first —
the Interaction Design Principles and the Semantic Colour Guide exist primarily to
serve it.

The frontend rule file `.cursor/rules/03-frontend.mdc` governs universal frontend
discipline (token-only colours, structural vs visual utilities, real-or-skeleton
mandate, finite state machines, server vs client components, the visual
consistency checklist). This document produces the project-specific component-token
assembly the rule file expects at `docs/COMPONENT_SPEC.md`; it does not restate the
rule file's content — component specs reference tokens, not principles.

**Key generation rules:**

- **Tokens only for visual properties.** Every colour, spacing, radius, and shadow
  value uses the semantic alias name from `docs/DESIGN_TOKENS.md` — never a hex
  code, raw `px`, or `palette-*` token. The Tailwind class column carries the
  literal class string (`p-6`, `rounded-lg`, `shadow-md`).
- **Structural utilities are unrestricted.** `flex`, `grid`, `items-center`,
  `w-full`, `max-w-lg`, responsive prefixes — engineering decisions, used freely
  in Layout Composition without a token reference.
- **Interaction Design Principles come first**, before any component entry — they
  are the reasoning lens the agent applies to anything unlisted.
- **Cover all twelve components.** If one does not apply, include it with a
  one-line note so the agent knows it was intentionally excluded, not missed.
- **Trim token tables to the non-obvious** — shadow level, internal padding and
  gap, border variant, radius, surface background. Typography and directly
  derivable text colours live in the appendices, not per-component tables.
- **Focus ring** is `brand-primary` at 2px via the `focus-visible:` variant; every
  interactive component implements `hover:`, `focus-visible:`, and `disabled:`.
- **Always vs Default.** Mark every Constraints rule as **Always:** (any deviation
  breaks the system — WCAG, token integrity, elevation hierarchy) or **Default:**
  (right in the common case; deviate only with an articulable reason, and describe
  what a legitimate exception looks like). This distinction is critical — without
  it the agent cannot tell which rules require compliance and which require
  judgment.
- **Token amendment protocol.** If a needed token (alias, spacing step, shadow
  level, colour state) is missing from `docs/DESIGN_TOKENS.md`, do not invent it
  silently or round to a neighbour. Add a `## Token Amendments` section stating
  the token name, proposed value, and requiring component(s); note it must be
  backported to `docs/DESIGN_TOKENS.md` and `tailwind.config.ts` before the
  scaffold runs (the scaffold reads `docs/DESIGN_TOKENS.md`, not this file, for
  config injection).
- **Source selection per component.** Decide each component's primary source from
  the screenshot index *before* reading either source file, and record it in a
  `Source:` line. Three valid paths — all equally routine:
  - **Prototype-primary** — visible in a covered prototype screen; the prototype
    JSX is primary for layout, spacing rhythm, and interaction in context, with
    the package atom as supporting reference for the resting state.
  - **Package-primary** — not in any covered screen but implemented in
    `Atoms.jsx` or `preview/component-*.html`; the package is primary and the
    prototype is not consulted. Common with a partial prototype — not a gap.
  - **Derived** — neither source implements it (often Loading Skeleton, sometimes
    Toast/Alert); derive from `docs/DESIGN_TOKENS.md` and the Interaction Design
    Principles, cross-referencing a similar primitive for consistency.
- **Lift the brand's stated interaction rules verbatim.** Where the README's
  "Visual foundations" states exact hover deltas ("darken 6%, no transform"),
  focus ring offsets, transition durations ("160ms for state changes"), or
  disabled patterns, those rules *are* the spec — transcribe them into the
  Interactive States tables and principles; do not soften or substitute a Tailwind
  convention.
- **Honour brand-driven omissions and overrides** as **Always:** rules with the
  brand reasoning ("no gradients", "modal entry uses fade, not slide, because
  slides feel app-y"). If `docs/DESIGN_TOKENS.md` omits `radius-full`, Badge and
  Avatar use the next-smallest permitted radius — do not reinvent the pill. If it
  defines fewer shadow tokens, use exactly those — a two-shadow brand expresses
  elevation through borders and surface hierarchy, not graduated shadows.

**The twelve components:** Page Layout, Card, Button, Form Field, Form Structure,
Badge, Table, Modal / Dialog, Sidebar Navigation, Empty State, Loading Skeleton,
Toast / Alert.

**Component-to-source map** (the prototype column applies only when that component
is visible in a covered screen):

| Listed component | Prototype source (primary if available) | Package source |
|---|---|---|
| Page Layout | The shell wrapping every prototype screen (sidebar/topbar/content area) | `ui_kits/app/index.html`, `Sidebar.jsx`, `Topbar.jsx` |
| Card | Cards as rendered on prototype dashboard/list screens | `Atoms.jsx` and `preview/_card.css` |
| Button | Buttons as rendered on prototype screens, in their actual contexts | `Atoms.jsx` (Button), `preview/component-button-primary.html`, `preview/component-button-secondary.html` |
| Form Field | Form fields as rendered on prototype form screens | `Atoms.jsx` (Field/Input), `preview/component-input.html` |
| Form Structure | Form layouts as rendered on prototype screens (label position, helper text placement, error state) | derived from form usage in package atoms |
| Badge | Badges as rendered in prototype lists and statuses | `Atoms.jsx` (StatusPill/Tag), `preview/component-badges.html` |
| Table | Tables as rendered on prototype screens | package table reference (e.g. `ObligationsTable.jsx`, `preview/component-table.html`) |
| Modal / Dialog | Modals as shown in prototype screenshots (open states) | package modal reference (e.g. `AddContractModal.jsx`, `preview/component-modal.html`) |
| Sidebar Navigation | The prototype's actual rendered sidebar | `Sidebar.jsx`, `preview/component-sidebar.html` |
| Empty State | Empty states as shown in prototype screenshots — typically richer than package's atom-in-isolation | `preview/component-empty.html` |
| Loading Skeleton | If prototype renders loading states, use those; otherwise derive | rarely in packages — derive from Card and Table tokens |
| Toast / Alert | If prototype renders toasts/alerts, use those; otherwise derive | rarely in packages — derive from Badge feedback variants |

**Component entry template** — every entry contains these subsections (omit one
only when genuinely inapplicable; remove its heading rather than writing "N/A"):

```

## [N]. [Component Name]

### Purpose

One sentence: when and why this component appears — what it does and what triggers it, not what it looks like.

### Source

Translated from [source file path(s)] | Derived from tokens and principles

### Layout Composition

Prose specifying structural Tailwind classes: display mode (flex/grid/inline-flex), alignment, sizing and max-width constraints (including the appropriate `max-w-*` for any input, derived from expected content length not available space), responsive behaviour, overflow handling. Page Layout and Form Structure are the most important entries here — mis-specifying either produces broken pages regardless of correct individual tokens.

### Token Assembly

The non-obvious token-to-Tailwind mapping — shadow level, internal padding and gap, border variant, radius, surface background. Omit typography rows (Appendix A) and directly derivable text colours (Appendix B).

| Part      | Property       | Token          | Tailwind class               |
| --------- | -------------- | -------------- | ---------------------------- |
| Container | background     | surface-card   | bg-surface-card              |
| Container | border         | border-default | border border-border-default |
| Container | border-radius  | radius-lg      | rounded-lg                   |
| Container | shadow         | shadow-md      | shadow-md                    |
| Container | padding        | spacing-6      | p-6                          |
| Container | gap (children) | spacing-4      | gap-4                        |

### Variants / Sizes

Only when the component has named variants or sizes; list only what differs from the base. For Button, include the icon-only size.

### Interactive States

| State         | Part      | Property         | Tailwind class                                                                    |
| ------------- | --------- | ---------------- | --------------------------------------------------------------------------------- |
| hover         | Container | background       | hover:[token-class]                                                               |
| focus-visible | Container | ring             | focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 |
| active        | Container | background       | active:[token-class]                                                              |
| disabled      | Container | opacity + cursor | disabled:opacity-50 disabled:cursor-not-allowed                                   |

### Interaction Design Notes

Required for Button, Form Field, Form Structure, Table, Modal/Dialog, Sidebar Navigation, Toast/Alert, and any component with repeated rows, a destructive affordance, or competing actions. Address each that applies: Action representation (text vs icon, the specific lucide-react icon and aria-label, grounded reason); Progressive disclosure (visible at rest vs hover-revealed, with exact `group` + `opacity-0 group-hover:opacity-100 transition-opacity` implementation); Width constraints (the `max-w-*` class and content-based reason); Edit model (inline for a single scalar, modal for multi-field or high-consequence).

### Constraints

Short. Only rules where deviation causes visible inconsistency or WCAG failure; reference the appendices for anything derivable there.
**Always:** [rule] — [why any deviation breaks the system]
**Default:** [rule] — [why, and what a legitimate exception looks like]

````

**The five Interaction Design Principles** (generated first, before component
entries; each a concrete, falsifiable rule followed by its reasoning, calibrated
to this product's personality/density and the patterns visible in the prototype):

1. **Progressive Disclosure** — which action categories are always visible
   (primary actions; safe secondary actions) vs hover-revealed (destructive
   actions in lists; rarely-needed secondary actions), the exact Tailwind pattern
   with the actual transition duration (use README durations verbatim if stated;
   otherwise fast for professional/compact, slower for spacious/consumer;
   cross-check the prototype), and the narrow exception where a destructive action
   may be persistent.
2. **Action Representation** — text buttons when an action appears once; icons when
   it repeats in every row. Lean to icons earlier for compact/data-dense products,
   to text more broadly for spacious/consumer. The prototype's actual choices win.
   Name the specific lucide-react icons for the product's recurring actions (edit,
   delete, reorder, expand/detail, external link) and the aria-label convention
   ("Delete {item name}"); use the README's icon table verbatim if it has one.
3. **Input and Content Width** — width constraints (`max-w-*`) for the common input
   types inferred from the data model; page-level content width (full-width for
   data tables/dashboards, constrained max-width for settings/forms). A full-width
   input on a wide viewport is a layout decision that was never made — as much a
   defect as a wrong colour token. Use the README's layout maxima verbatim if
   stated (`--layout-app-max`, `--layout-prose-max`); the prototype's rendered
   widths win on conflict.
4. **Action Hierarchy** — at most one filled primary action per surface; ghost/
   outline for secondary; icon-only ghost for repeated row actions, hover-revealed
   if destructive; a specific maximum number of visible actions before overflow,
   calibrated to density and the prototype. Specify the destructive-action
   confirmation pattern (inline "Confirm?", dialog, or toast-with-undo) by severity
   level, and reference `.cursor/rules/07-brand-voice.mdc` for the canonical copy
   rules that govern the button words.
5. **Spacing Rhythm** — the specific token values for grouping: gap between tightly
   related elements (label + input), gap between sibling components (card to card,
   field to field), separation between logical sections. Inconsistent gap values
   between siblings of the same type are a visual defect. **The prototype is the
   primary source here** — atoms in isolation cannot show the rhythm between
   sibling cards on a real dashboard; measure the gap tokens actually used in the
   prototype's form and dashboard screens and state those.

**Appendix A — Typography Application Matrix** and **Appendix B — Semantic Colour
Usage Guide** close the document. Appendix A is the authoritative reference for
text size/weight/colour/spacing across every UI context (mirroring §9 of
`docs/DESIGN_TOKENS.md`, adjusted to the project's actual values); Appendix B is a
reasoning guide, not a prohibition list, for choosing surface/border/text/feedback
tokens in any context not explicitly covered by a component entry.

### 4.3 Brand-voice content for `.cursor/rules/07-brand-voice.mdc`

The brand-voice rule is created on intake from the design package's `README.md`
and then augmented from the prototype's rendered copy. So Claude Design supplies
brand-voice in two forms, both handled during intake
(`docs/project_start/03-inserting-the-design.md`):

1. **As defined — inside the package `README.md`.** State the voice explicitly:
   content fundamentals, do/don't copy tables, tone characteristics, capitalisation
   rules, and any legal disclaimer. This becomes the initial
   `.cursor/rules/07-brand-voice.mdc`. Spell the rules out — do not only
   demonstrate them.
2. **As applied — inside the prototype's rendered strings.** Use real, on-brand
   copy (3.5). The augmentation step reads these strings and adds patterns the
   README did not capture: consistent contractions, avoidance of exclamation marks,
   the salutation format (`Hello, [first name].` rather than `Hi [first name]!`),
   the convention that error messages name a corrective action rather than just
   stating the problem.

The augmentation reads every user-visible string in `reference/prototype/`
(headings, body copy, button/link labels, placeholders, banners, empty states,
errors, toasts, salutations, signatures — excluding code identifiers, comments,
console logs, and obvious placeholders like `"lorem ipsum"`) and analyses it
across these dimensions: **casing** (title vs sentence case; capitalisation of
product nouns), **punctuation** (full stops on headings/labels, exclamation
frequency, dash and quote style), **contractions**, **person and voice**,
**sentence length and structure**, **tone signals** (humour, warmth, formality;
absence of celebration/urgency/apology padding), **salutation conventions**,
**button labels** (verb-first, casing, action-intent vs action-completion),
**error messages** (problem-only vs cause vs corrective guidance; tone), **numbers,
dates, currency** (`€9` vs `EUR 9`; `13 May` vs `May 13`), and **brand-specific
nouns** (e.g. "postcard" vs "card", "recipient" vs "addressee").

Each observed pattern is classified as one of four:

1. **Already covered** — README and prototype agree and the rule already exists.
   Do nothing.
2. **More specific** — the prototype shows a more specific case of an existing
   rule. Add a sub-bullet with the concrete example.
3. **New pattern** — a consistent pattern the README does not address. Add a new
   rule *only if the pattern holds across at least three examples* — single
   instances are noise, not signal.
4. **Apparent conflict** — the prototype contradicts an existing rule. Do **not**
   modify the existing rule. Append a "Conflicts observed" section listing the
   conflict, the existing rule, the prototype evidence, and the line "Resolve by
   editing this file." Surface the disagreement; do not pick a winner.

Never weaken or remove an existing rule based on prototype copy — the package
README is authoritative, the prototype only adds detail or surfaces conflicts. A
very partial prototype (fewer than three or four screens) may legitimately produce
zero augmentations; that is a valid outcome, not a failure. The rule file stays
`alwaysApply: true`, and its structure (headings, hard-rules-first ordering)
matches the other files in `.cursor/rules/`. It closes with a Sources section:

```
## Sources

- Initial rules from `design-system/README.md` (package intake).
- Augmented from prototype copy patterns observed in `reference/prototype/` on YYYY-MM-DD.
```

The augmentation is safe to re-run if the prototype changes: each run is
additive — existing rules are not modified, new patterns are added, conflicts are
surfaced.

---

## 5. Deliverable checklist

Everything Claude Design hands back, and where it lands in the repo. The mechanics
of insertion — dropping folders, copying logo assets, generating the screenshot
index and rule files — are in `docs/project_start/03-inserting-the-design.md`.

| Deliverable | Source of the deliverable | Repo destination |
|---|---|---|
| Design package folder (`README.md`, `SKILL.md`, `colors_and_type.css`, `assets/`, `preview/`, `ui_kits/app` + `ui_kits/marketing`) | Claude Design session (Section 2) | `design-system/` (folder placed at repo root, nothing renamed inside) |
| Product prototype (`*.html`, `*-tokens.css`, `styles.css`, one `.jsx` per screen, `screenshots/`, `SCREEN_MANIFEST.md`) | Claude Prototype session (Section 3) | `reference/prototype/` (folder placed at repo root, nothing renamed inside) |
| `docs/DESIGN_TOKENS.md` — documentation truth for all visual tokens | Section 4.1 (reconciled from prototype tokens + package `colors_and_type.css`) | `docs/DESIGN_TOKENS.md` |
| `docs/COMPONENT_SPEC.md` — twelve components + Interaction Design Principles + appendices | Section 4.2 | `docs/COMPONENT_SPEC.md` |
| Brand-voice rule content | Section 4.3 — package `README.md` (as defined) + prototype copy (augmented on intake) | `.cursor/rules/07-brand-voice.mdc` |
| The four logo roles (primary/wordmark, logomark, dark-background variant, favicon) | `design-system/assets/` (and the prototype if it refined them) | `apps/web/public/` |
| Tailwind config token values | Built by the coding agent from `docs/DESIGN_TOKENS.md` during the scaffold phase — **not** delivered by Claude Design | `apps/web/tailwind.config.ts` |

Two things to keep straight in this handoff:

- `docs/DESIGN_TOKENS.md` is **documentation truth**, not implementation truth.
  The coding agent implements `apps/web/tailwind.config.ts` from it later, and on
  any disagreement the implementation wins — but the source of any change is always
  this document, edited then re-injected, never a hand edit to the config. The full
  authority hierarchy is in Section 4 and `.cursor/rules/03-frontend.mdc`.
- **Partial coverage is the expected case, not a defect.** The prototype covers the
  happy path of the main screens plus their key states; an absent screen is a
  deliberate signal that the build falls back to the package's atoms for that
  screen. Do not pad the package's scales, the prototype's screens, or the design
  documents to look complete — an invented "just in case" token, screen, or rule
  becomes something nobody asked for.

Intake runs a **design doctor** the moment these land in the repo (Phase 0.5 of
`docs/project_start/03-inserting-the-design.md`): it checks the spacing scale is
Tailwind-native and the prototype reuses the package vocabulary, and hands back a
paste-back fix-list if the export deviates. Expect that fix-list to send you back
into this session — the sooner it runs, the warmer the session.

Once these deliverables are in the repo, continue with
`docs/project_start/04-writing-the-roadmap.md`, which opens the build with
prototype↔PRD reconciliation, the data contract, the walking-skeleton scaffold,
and the auth build before the feature slices.
````
