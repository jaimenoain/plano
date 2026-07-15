# Inserting the Design

> **Audience:** The human placing Claude Design's output into the repo, and
> Claude Code wiring it up afterwards.
> **When to use:** Step 5 of bootstrapping — after Claude Design has produced a
> design package, a product prototype, and the design documents
> (`docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and the brand-voice
> content), and before Claude Code writes the roadmap in
> `docs/project_start/04-writing-the-roadmap.md`.

This guide covers how Claude Design's output lands in the repo and gets wired
into the rule files. The work splits in two: the **human** dumps the whole
bundle into one `intake/` folder; **Claude Code** then sorts each artefact to
its canonical home and does the mechanical wiring — copying logo assets, tidying
stray files, registering the folders in the rules, generating the screenshot
index, and creating the brand-voice rule. The human does no identification work:
they never have to know which unzipped folder is the package versus the
prototype, or which path each file belongs at (ADR-0023).

The wiring proceeds in four phases, each ending with a self-run verify step.
Claude Code runs the verify checks itself and reports PASS/FAIL; it does not
ask the human to review code, schemas, or diffs.

---

## What Claude Design hands back

Claude Design produces five things for the repo:

- A **design package** — typically named after the brand, containing
  `README.md`, `SKILL.md`, `colors_and_type.css`, `assets/`, `preview/`, and
  `ui_kits/` (with `app/` and `marketing/` subfolders).
- A **product prototype** — typically named after the product, containing one
  or more `.jsx` files, a `*-tokens.css` file, a layout shell CSS file, an HTML
  entry point, a `SCREEN_MANIFEST.md` file, and a `screenshots/` directory.
- **`docs/DESIGN_TOKENS.md`** — the concrete colour, typography, spacing,
  radius, and shadow tokens (documentation truth; see the hierarchy below).
- **`docs/COMPONENT_SPEC.md`** — the per-component assemblies and interaction
  design principles.
- **The brand-voice content** — the casing, tone, do/don't copy patterns,
  number/date conventions, emoji rule, brand essence, and any legally-mandated
  disclaimer. This becomes `.cursor/rules/07-brand-voice.mdc`.

The prototype is expected to cover the happy path of the main product screens.
It is **not** expected to cover every screen described in `docs/PRD.md` —
partial coverage is normal and supported. The screenshot index generated in
Phase 2 records which PRD screens are absent so later work can fall back to the
design package's atoms-in-isolation for those.

---

## The human's step: dump the bundle into `intake/`

You do one thing. Unzip **everything** Claude Design gave you — the design
package, the prototype, and the two design docs (`DESIGN_TOKENS.md`,
`COMPONENT_SPEC.md`) — straight into the `intake/` folder at the repo root.
Don't rename anything, don't sort it, don't tidy it. A messy pile is fine; the
agent sorts it.

```
your-repo/
  apps/
  packages/
  docs/
  intake/           ← unzip the whole Claude Design bundle in here
    README.md         (committed; leave it)
    <package folder>  (however the zip extracted it)
    <prototype folder>
    DESIGN_TOKENS.md
    COMPONENT_SPEC.md
    ...anything else the export contained
```

Everything you drop into `intake/` is gitignored except its `README.md`; the
committed copies are the sorted artefacts at their canonical paths, produced by
Phase 0 below. You do **not** need to know which folder is the package versus the
prototype, or where any file belongs — Claude Code reads each artefact and files
it. The **brand-voice content** rides along inside the design package's
`README.md` (sections like "Content fundamentals" and "Brand essence"); Claude
Code reads it in Phase 1 to create `.cursor/rules/07-brand-voice.mdc`.

Once the bundle is in `intake/`, hand the repo to Claude Code and ask it to sort
the intake bundle and wire the design in. The rest of this guide is that work.

---

## Phase 0 — Sort the intake bundle and place logo assets

> Work Claude Code performs. The human has dumped the whole Claude Design bundle
> into `intake/` — nothing is sorted, no files are at their canonical paths, no
> logos copied. Phase 0 is the mechanical file movement: identify each artefact
> in `intake/` and move it to its home, copy the four logo assets into
> `apps/web/public/`, overwrite any the prototype refined, and remove stray
> artefacts.
>
> Do not write rule files or generate documentation in this phase. That starts
> in Phase 1.

### Task 0.1 — Sort the intake bundle to canonical paths

The bundle in `intake/` may have extracted into brand-named folders, nested zip
roots, or a flat pile — you cannot assume a fixed layout. Identify each artefact
by its **contents**, not its folder name, and move (not copy) it to its home.
Leave `intake/README.md` in place; it is committed.

1. **Design package → `design-system/`.** Find the folder in `intake/` that
   contains `SKILL.md` and `colors_and_type.css` (usually alongside `README.md`,
   `assets/`, `preview/`, and `ui_kits/app/` + `ui_kits/marketing/`). Move its
   contents to `design-system/`, replacing the landing-zone `README.md` that
   ships there. If the package is nested one level down (e.g.
   `intake/acme-design/<package>/`), move the inner package, not the wrapper.

2. **Prototype → `reference/prototype/`.** Find the folder containing one or more
   `*.jsx` files, a `*-tokens.css`, and a `screenshots/` directory (usually also
   an HTML entry point, a layout-shell CSS, and a `SCREEN_MANIFEST.md`). Move its
   contents to `reference/prototype/`, and delete the landing-zone `README.md`
   that ships there unless the prototype export brought its own. (The design
   package's own `README.md` is its brand brief, so for `design-system/` above
   the moved package README simply replaces the landing-zone one.)

3. **Design docs → `docs/`.** Find `DESIGN_TOKENS.md` and `COMPONENT_SPEC.md`
   anywhere in `intake/` and move them to `docs/DESIGN_TOKENS.md` and
   `docs/COMPONENT_SPEC.md`, replacing the placeholders. These are living
   artefacts: `docs/DESIGN_TOKENS.md` is the documentation truth Claude Code
   translates into `tailwind.config.ts` during the scaffold, and
   `docs/COMPONENT_SPEC.md` is the per-component reference read during feature
   work. The brand-voice content is **not** a separate file — it lives inside the
   package's `README.md` and becomes a rule in Phase 1; leave it where it is.

If you cannot confidently identify one of these three artefacts in `intake/` —
it is missing, or two candidates match — stop and tell the human which one is
unclear rather than guessing. A misfiled artefact fails silently downstream.

### Task 0.2 — Tidy stray files

After the sort, delete obvious extraction noise from the moved artefacts and from
`intake/`: `__MACOSX/` folders, `.DS_Store` files, and — if
`reference/prototype/uploads/` exists — that `uploads/` folder (the prototype zip
sometimes carries one; it is not part of the output).

If `reference/prototype/SCREEN_MANIFEST.md` exists, it is an **expected** file,
produced by the prototype's export. Leave it in place — Phase 2 consumes it as
the declared screen-to-PRD mapping. Do not treat it as a stray artefact. Its
absence is also fine: prototypes exported without the closing prompt will not
have one, and Phase 2 falls back to inference.

Do not delete anything else. If you encounter other unexpected files or folders
inside `design-system/`, `reference/prototype/`, or `intake/`, leave them alone
and note them in the Phase 0 verify report. `intake/` should end this phase
holding only its `README.md`.

### Task 0.3 — Copy logo assets from the design package

Inspect `design-system/assets/` and identify the four canonical logo files.
Filenames vary between packages, but the four roles are consistent:

| Role                      | Destination filename in `apps/web/public/` |
| ------------------------- | ------------------------------------------ |
| primary logo / wordmark   | `logo.svg`                                 |
| logomark / square variant | `logomark.svg`                             |
| dark-background variant   | `logo-on-dark.svg`                         |
| favicon                   | `favicon.svg`                              |

If the source filenames are not self-evident (e.g. you see `mark-a.svg`,
`mark-b.svg`, `mark-c.svg`), read `design-system/README.md` and
`design-system/SKILL.md` for naming conventions before guessing.

Copy each identified file to `apps/web/public/` under the destination filename
in the table. Keep the originals in `design-system/assets/` unchanged — this is
a copy, not a move.

If a role has no matching file in `design-system/assets/`, skip it. Do not
invent a file, do not duplicate another role into its slot. Record the skipped
role in the Phase 0 verify report so the user knows which assets are absent.

### Task 0.4 — Overwrite logo assets if the prototype refined them

Search `reference/prototype/` (recursively) for SVG files whose filenames
suggest they are logo variants — `logo*.svg`, `logomark*.svg`, `*wordmark*.svg`,
`favicon*.svg`, or any SVG in a subfolder named `public/`, `assets/`, or
`static/`.

For each such file found, map it to one of the four destination filenames in
Task 0.3 by name (e.g. `logo-on-dark.svg` in the prototype maps to
`logo-on-dark.svg` in `apps/web/public/`). Copy it over the existing file at the
destination, replacing whatever Task 0.3 put there. Keep the destination
filename — do not rename.

Do not attempt a visual-similarity judgement on whether the prototype's logo
"actually" differs from the package's. If the prototype shipped an SVG for that
role, treat it as the refined version and use it.

Most prototypes have no logo SVGs at all (the wordmark is usually rendered
inline as React markup). If you find none, that is the normal case — skip this
task silently and move on.

### Task 0.5 — Verify Phase 0

Run these checks and report PASS or FAIL with a one-line reason for each. Do not
fix any failure — report only.

1. `design-system/` exists at repo root and contains at least `README.md`,
   `SKILL.md`, and `colors_and_type.css`. If FAIL, the design package was not
   sorted out of `intake/` (Task 0.1) — or the human never dropped it there.
   Stop and tell them.
2. `reference/prototype/` exists at repo root and contains at least one `.jsx`
   file, at least one `*-tokens.css` file, and a `screenshots/` directory with
   at least one image. If FAIL, the prototype was not sorted out of `intake/`
   (Task 0.1) — or the human never dropped it there. Stop and tell them.
3. `docs/DESIGN_TOKENS.md` and `docs/COMPONENT_SPEC.md` are no longer the
   placeholders (they carry real design content). If FAIL, they were not sorted
   out of `intake/` (Task 0.1). Stop and tell them.
4. `intake/` holds only its `README.md` — the sort left nothing behind. List any
   leftover files; a leftover is a signal Task 0.1 missed an artefact.
5. `reference/prototype/uploads/` does not exist.
6. `apps/web/public/` contains the logo files copied in Task 0.3. List the files
   present and the roles that were skipped, if any.
7. If the prototype contained any logo SVGs, the corresponding files in
   `apps/web/public/` now match those (by file size or content hash). If the
   prototype contained none, state that explicitly.
8. Note whether `reference/prototype/SCREEN_MANIFEST.md` is present. Presence is
   **not** required — older or manually-exported prototypes will not have one —
   but if present, Phase 2 uses it as the declared screen-to-PRD mapping instead
   of inferring coverage from images alone. Report present or absent; do not
   FAIL on absence.

Do not run a build — none of these changes touch shipping code.

---

## Phase 0.5 — Design doctor

> Work Claude Code performs, immediately after Phase 0 and **before** any rule
> files are generated. This is a diagnostic gate: it validates the placed design
> artefacts against the export spec (`02-briefing-claude-design.md`) so a
> renumbered spacing scale, an off-vocabulary token, or a malformed design doc is
> caught **while the Claude Design / Prototype session is still open** — a
> warm-session, paste-back fix instead of a scaffold-time surprise.
>
> Do not fix any failure yourself, and do not hand-edit the placed files. Report
> only. Deviations are corrected in the design session and re-exported.

### Task 0.5.1 — Run the mechanical checks

Run `npm run design:doctor`. It performs the two deterministic, high-stakes
checks and prints PASS or a listed set of violations:

1. **Spacing-scale numbering.** Every numeric `--space-N` / `--spacing-N` token
   in `design-system/colors_and_type.css` and `reference/prototype/*-tokens.css`
   must resolve to Tailwind's default pixel value for N (`N × 4px`: `1`=4px,
   `7`=28px, `14`=56px, `18`=72px, `24`=96px; fractions too — `0.5`=2px). Named
   tokens (`--space-section`) are off-scale by design and exempt. This is the
   single most important constraint in the design system.
2. **Token vocabulary.** The prototype's tokens are the package's vocabulary
   under overrides (same names, possibly new values). Any token the prototype
   invents that the package never declared **and** the prototype's own header
   comment never announced is listed.

On a fresh template with empty landing zones the doctor prints "nothing to
validate" and exits 0 — that is expected before a real design package is placed.

### Task 0.5.2 — Check structure and design-doc shape

These need judgement, so verify them by reading. Report PASS or FAIL with
evidence for each:

1. **Package structure** — `design-system/` holds the files at the paths
   `02-briefing-claude-design.md` §2.2 lists (`README.md`, `SKILL.md`,
   `colors_and_type.css`, `assets/`, `preview/`, `ui_kits/app/` +
   `ui_kits/marketing/`, keeping `ui_kits/app/Atoms.jsx`).
2. **Prototype structure** — `reference/prototype/` holds one `.jsx` per screen,
   a `screenshots/` directory, one `*-tokens.css`, a `styles.css`, and an HTML
   entry point (§3.2); `uploads/` is absent. `SCREEN_MANIFEST.md` present is a
   **WARN, not a FAIL**, if absent (older exports omit it; Phase 2 falls back to
   inference).
3. **`docs/DESIGN_TOKENS.md` shape** — carries the §4.1 required sections with
   concrete values (no placeholders or ellipses); the dark-mode semantic-alias
   section is either fully populated or carries the explicit "Dark mode: not
   configured." line.
4. **`docs/COMPONENT_SPEC.md` shape** — covers all twelve components (Page
   Layout, Card, Button, Form Field, Form Structure, Badge, Table, Modal /
   Dialog, Sidebar Navigation, Empty State, Loading Skeleton, Toast / Alert).

### Task 0.5.3 — Report

If everything passed, record a one-line PASS in the intake notes and continue to
Phase 1.

If anything failed, do **not** proceed to Phase 1. Produce a **numbered fix-list
in the exact form to paste back into the Claude Design / Prototype session** —
each item names the file, the exact token or section, what was found, and what
the spec requires (e.g. "`postcards-tokens.css`: `--space-10` is 44px; renumber
to 40px or express it as a named token"). The design sessions are revisitable;
run this while the session is warm so the fix is one paste away.

---

## Phase 1 — Design package rule files

> Work Claude Code performs. The `design-system/` folder is at the repo root and
> contains the Claude Design package output (including `README.md`, `SKILL.md`,
> `colors_and_type.css`, `assets/`, `preview/`, `ui_kits/`). Phase 0 has copied
> the available logo SVGs into `apps/web/public/`; the Phase 0 verify report
> lists which of the four were found and which were skipped.
>
> This phase creates one new rule file and updates two existing ones so the
> agent knows the design system folder exists, what's in it, and that it's
> read-only reference.

### Task 1.1 — Create the brand-voice rule file

Read Claude Design's brand-voice output — usually `design-system/README.md`.
Create `.cursor/rules/07-brand-voice.mdc`.

Match the frontmatter format of the existing rule files (`00-architecture.mdc`
through `06-agent-behaviour.mdc`). Set `alwaysApply: true` because every feature
involves copy.

Source the rule content from Claude Design's brand-voice material. Capture:

- Casing and pronoun conventions (sentence case, second person, etc.).
- Tone characteristics.
- Do/don't copy patterns from any do/don't table in the source.
- Conventions for numbers and dates.
- The emoji rule.
- The brand-essence personality summary as one short paragraph (voice, words to
  avoid, what to never do).
- Any legally-mandated disclaimer. If the source mandates a legal disclaimer in
  authenticated layouts, lift it verbatim as a hard rule. If no such disclaimer
  is mandated, skip it.

This content typically lives under sections titled "Content fundamentals" and
"Brand essence" but headings may differ — read the source end-to-end to locate
the equivalent content.

Match the tone and structure of `.cursor/rules/00-architecture.mdc`: short,
declarative, hard rules first, examples only where they prevent ambiguity. Do
not copy the source's marketing-heavy sentences — this is a rule file, not brand
documentation.

At the top of the rule file, add one line noting that the canonical brand source
is `design-system/README.md`, and that visual decisions live in
`docs/DESIGN_TOKENS.md` and `docs/COMPONENT_SPEC.md` rather than this file.

In the new flow, Claude Design produces the brand-voice content directly, so
this task populates `.cursor/rules/07-brand-voice.mdc` from that output — there
is no separate repo-side generation step. If the prototype's rendered copy in
`reference/prototype/*.jsx` later reveals applied conventions the source did not
state explicitly (error phrasing, empty states, microcopy), those can be
appended to this same rule file additively; do not anticipate that here — create
the rule file from Claude Design's brand-voice output only.

### Task 1.2 — Register `design-system/` in `00-architecture.mdc`

Read `.cursor/rules/00-architecture.mdc` and `design-system/SKILL.md`.

Add a short section to `.cursor/rules/00-architecture.mdc` registering the
`design-system/` folder. Place it after the "Stack" section and before
"Forbidden Patterns". The section should:

- Name the folder and its purpose: the brand and visual reference for the
  project, generated from the brand brief via Claude Design.
- List the key files: `SKILL.md`, `README.md`, `colors_and_type.css`,
  `ui_kits/app/Atoms.jsx`, `ui_kits/marketing/`, `preview/`, `assets/`.
- State that the folder is **read-only reference material**: agents may read it
  for context, but no feature task ever edits files inside `design-system/`.
  Brand changes happen by regenerating the package, not by hand-editing.
- State that the canonical implementation truth remains `tailwind.config.ts`
  (tokens) and `apps/web/components/` (components). When `design-system/` and the
  implementation disagree, the implementation wins, and the disagreement is a bug
  to be reported, not silently reconciled.

Add one line to the "Forbidden Patterns" section:
`No edits to files under design-system/. The folder is read-only reference.`

### Task 1.3 — Add a "Design system reference" subsection to `03-frontend.mdc`

Read `.cursor/rules/03-frontend.mdc` and `design-system/SKILL.md`.

Add a short subsection titled "Design system reference" near the top of the
visual-tokens discussion in `.cursor/rules/03-frontend.mdc`. The subsection
states:

- The `design-system/` folder at the repo root is the visual source of truth for
  the brand. Read `design-system/SKILL.md` first for orientation.
- Hierarchy of authority for visual decisions: (1) `tailwind.config.ts` is the
  implementation truth; (2) `docs/DESIGN_TOKENS.md` is the documentation truth,
  which must match `tailwind.config.ts`; (3) `design-system/colors_and_type.css`
  and `design-system/ui_kits/` are the brand source — used to _generate_ the
  tokens and components, but no longer authoritative once translated. If they
  disagree with the implementation, the implementation wins.
- For unfamiliar component types, the agent may consult
  `design-system/preview/component-*.html` and
  `design-system/ui_kits/app/Atoms.jsx` for visual reference, but must translate
  any patterns into the project's actual stack (Tailwind utilities + Shadcn
  primitives, not inline styles, not raw CSS variables).

Do not duplicate or restate visual rules already in the file — this subsection
only registers the folder and the hierarchy. (Phase 3 replaces this subsection
with the full six-level hierarchy; it is written here first so the file is
coherent between phases.)

### Task 1.4 — Verify Phase 1

Run these checks and report PASS or FAIL with a one-line reason for each. Do not
fix any failure — report only.

1. `design-system/` exists at repo root and contains at least `README.md`,
   `SKILL.md`, and `colors_and_type.css`.
2. `apps/web/public/` contains at least one logo SVG and a favicon SVG. List the
   files found.
3. `.cursor/rules/07-brand-voice.mdc` exists and has `alwaysApply: true` in its
   frontmatter.
4. `.cursor/rules/00-architecture.mdc` mentions `design-system/` and contains a
   Forbidden Patterns entry forbidding edits to that folder.
5. `.cursor/rules/03-frontend.mdc` contains a "Design system reference"
   subsection.

Do not run a build — none of these changes touch shipping code.

---

## Phase 2 — Prototype screenshot index

> Work Claude Code performs. The `reference/prototype/` folder is at the repo
> root. It contains a Claude-generated prototype of the product applied to the
> brand: a tokens CSS file, JSX files implementing the main screens, a layout
> shell CSS file, an HTML entry point, and a `screenshots/` directory with PNGs/
> JPGs of the rendered screens.
>
> This phase generates an index of the screenshots so feature agents can find
> the right visual reference without opening every image.

### Task 2.1 — Generate `reference/prototype/SCREENSHOTS.md`

List every image file in `reference/prototype/screenshots/`. Open each one to see
its contents before writing the description — do not infer from filename alone.

**If `reference/prototype/SCREEN_MANIFEST.md` exists, read it first.** It
declares, per screen, the screen file, its screenshot, the `docs/PRD.md` screen
or flow it represents, and the state it shows (happy / empty / loading / error /
permission). Treat it as the _declared_ intent — it tells you what each
screenshot is meant to depict and which PRD screen it maps to. You must still
open each image to confirm the declaration matches what is actually rendered;
where an image and its manifest row disagree, describe what the image shows and
flag the discrepancy in that row. If no manifest exists, proceed by inference
from the images alone, exactly as described below.

Create `reference/prototype/SCREENSHOTS.md` with the following structure:

- A one-paragraph header explaining what these screenshots are: reference for the
  brand applied to product screens, generated by Claude Design's prototype
  output, useful for agents implementing the corresponding features in shipping
  code. Note that the prototype renders the states its author chose to include —
  this may be happy-path only, or may also include empty, loading, error, and
  permission/over-limit variants for some screens — and that any state the
  prototype does NOT render is defined in `docs/PRD.md` and designed at
  implementation time.
- A markdown table with columns `File` and `Depicts`. Order entries by filename.
- A Coverage gaps section (see below).

For each row, write a one- or two-sentence description of what the screenshot
depicts: the screen, the state, any notable UI elements visible (drawers open,
banners shown, empty states). If two filenames depict the same state, note that
in the description (e.g. "Identical to 02-04-send-step3.png.").

**Coverage gaps section.** After the screenshot table, generate a Coverage gaps
section that records which screens described in `docs/PRD.md` are **not**
represented by any screenshot in `reference/prototype/screenshots/`. This is the
most valuable signal a partial prototype gives downstream work — without it,
agents reading this index have to infer absence from a process of elimination.

Procedure:

1. Read `docs/PRD.md` if it exists. Extract every named user-facing screen (e.g.
   "dashboard home", "send postcard step 1", "address book", "settings —
   billing"). A screen is a distinct rendered view, identified in the PRD by a
   heading, a user flow step, or a feature description. If `docs/PRD.md` does not
   exist yet, write a single line in this section: "Coverage gaps not assessed:
   `docs/PRD.md` was not present when this index was generated. Re-run this step
   after the PRD is in place to populate this section." Stop here for the section.

2. For each PRD screen, determine whether any prototype screenshot depicts it. If
   a `SCREEN_MANIFEST.md` is present, take its declared screen-to-PRD mapping as
   the basis for this match — you have already verified each declaration against
   its image in Task 2.1. If no manifest is present, match on intent, not name —
   the prototype's `01-home.png` may be the PRD's "dashboard home"; the
   prototype's `04-send-step3.png` may be the PRD's "send postcard —
   confirmation". Either way, if you are uncertain about a match, treat the screen
   as absent and let the user clarify on review.

3. Output two lists:
   - **Covered.** PRD screens that map to at least one prototype screenshot, with
     the matching screenshot filename(s) in parentheses. Where the prototype
     renders more than the happy path for a screen, name the covered states.
     Example:
     `- Dashboard home — default, empty, loading (01-home.png, 03-home-empty.png, 04-home-loading.png)`.
   - **Absent.** PRD screens — or specific PRD states of an otherwise-covered
     screen — with no matching prototype screenshot. Track absence at the state
     level when the PRD defines distinct states for a screen the prototype only
     partly covers. Examples: `- Address book` (screen absent entirely);
     `- Dashboard home — error state` (screen covered, this state not rendered).

4. Below the lists, write one sentence describing what downstream work should do
   about the absent screens: "The design specs
   (`docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`) and the package atoms fall
   back to `design-system/ui_kits/app/Atoms.jsx` and
   `design-system/preview/component-*.html` for any component or screen-shaped
   pattern not visible in the screenshots above. The absent PRD screens are
   designed at implementation time during the feature slices, using
   `docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and the package atoms as
   reference."

Partial prototypes are normal and supported. A prototype that covers only 4 of
12 PRD screens is a valid input — the Coverage gaps section turns its partiality
into a useful signal rather than a hidden defect.

Format example:

```
## Screenshots

| File | Depicts |
|------|---------|
| screenshots/01-home.png | Dashboard home in the active-subscription state. Wordmark and nav top-left, balance pill and avatar top-right, hero greeting, single in-transit postcard preview, Send a postcard CTA. |

## Coverage gaps

**Covered.**
- Dashboard home (01-home.png)

**Absent.**
- Address book — empty state
```

### Task 2.2 — Verify Phase 2

Report PASS or FAIL with a one-line reason:

1. `reference/prototype/SCREENSHOTS.md` exists.
2. Every image file in `reference/prototype/screenshots/` has a corresponding row
   in the table.
3. The file has the one-paragraph header described above.
4. The file contains a `## Coverage gaps` section. If `docs/PRD.md` existed at
   generation time, the section lists both Covered and Absent PRD screens. If
   `docs/PRD.md` did not exist, the section explicitly states that coverage was
   not assessed.
5. If `reference/prototype/SCREEN_MANIFEST.md` was present: every screen it
   declares has a corresponding screenshot row, and any image-vs-manifest
   discrepancies found in Task 2.1 are noted in the relevant rows. If no manifest
   was present, state that coverage was derived by inference.

---

## Phase 3 — Prototype rule file updates

> Work Claude Code performs. Phase 1 added a "Design system reference" subsection
> to `.cursor/rules/03-frontend.mdc` and registered `design-system/` in
> `.cursor/rules/00-architecture.mdc`. Phase 2 generated
> `reference/prototype/SCREENSHOTS.md`. The prototype itself is at
> `reference/prototype/`.
>
> Now the agent also needs to know about `reference/prototype/`, and the
> visual-authority hierarchy in `03-frontend.mdc` needs to be expanded to include
> the prototype.

Background on the prototype, for the rules you write: it is reference material,
not a starting point for the codebase. It covers the main screens, in whichever
states its author chose to render — often the happy path, sometimes also empty,
loading, error, and permission/over-limit variants. Patterns inside it —
script-tag globals, `window.Foo = Foo` exposure, `useStateX` aliasing, hash-based
routing, raw CSS classes — are artefacts of single-file in-browser execution and
do not translate to the target stack. The agent reads the prototype for _intent_
(what screens and states exist, how they compose, what visual decisions were
made) and translates that intent into the actual stack. No file under
`reference/prototype/` is ever imported from, edited, or copied verbatim into
shipping code.

### Task 3.1 — Register `reference/prototype/` in `00-architecture.mdc`

Read `.cursor/rules/00-architecture.mdc`, `reference/prototype/`'s HTML entry
point, and one representative `.jsx` file under `reference/prototype/`.

Add a section to `.cursor/rules/00-architecture.mdc` registering the
`reference/prototype/` folder. Place it immediately after the `design-system/`
section added in Phase 1. The section should:

- Name the folder and its purpose: the design package applied to the product,
  generated by Claude Design after the package, covering the main screens in the
  states the prototype's author rendered.
- List the file types and their reference roles: `*.html` is the entry point and
  not useful as reference; `*-tokens.css` is the refined token source (consumed
  when the design tokens are implemented); `styles.css` is layout shell, read for
  visual intent only; `*.jsx` files are screen and atom implementations, read for
  _what screens exist and how they compose_, never for code patterns;
  `screenshots/` is visual reference indexed in
  `reference/prototype/SCREENSHOTS.md`; `SCREEN_MANIFEST.md`, if present, is the
  declared map from screen file and screenshot to the PRD screen/flow and state
  each depicts (the input to the Coverage gaps diff) — reference only, not
  consumed at feature-build time.
- State that the folder is **read-only reference material** for feature work. No
  file under `reference/prototype/` is imported from, edited during feature work,
  or copied verbatim into shipping code. Re-running the prototype-incorporation
  step is the only way the folder changes.
- State that the prototype shows only the screens and states its author rendered.
  Where the PRD describes a screen or state the prototype omits, the PRD is
  authoritative. Where the prototype and PRD conflict on something the PRD
  specifies, the PRD wins and the disagreement is flagged to the user, not
  silently reconciled.
- List the patterns the agent must NOT lift from the prototype:
  `const { useState: useStateX } = React` aliasing; `window.Foo = Foo` global
  exposure; `<script type="text/babel">` and Babel-in-the-browser loading;
  hash-based routing (`#/dashboard`); raw `.k-*` or other prototype-specific CSS
  class names; inline `<style>` blocks; single-file global scope patterns. These
  are artefacts of single-page in-browser execution and do not translate to the
  target stack.

Add to the "Forbidden Patterns" section:
`No edits to files under reference/prototype/. No imports from reference/prototype/. The folder is read-only reference.`

### Task 3.2 — Replace the "Design system reference" subsection in `03-frontend.mdc` with a full hierarchy

Read `.cursor/rules/03-frontend.mdc`.

Find the "Design system reference" subsection added in Phase 1. Replace it with
an expanded subsection titled "Visual reference hierarchy".

Replacement means the old "Design system reference" subsection is **removed**
from `03-frontend.mdc`. After this task completes, the file must contain exactly
one subsection in this region — "Visual reference hierarchy" — not both. If you
find yourself appending the new subsection alongside the old one, stop and re-do
the edit as an in-place replacement.

The new subsection states:

The full hierarchy of authority for visual decisions, in order, with later items
losing to earlier items on disagreement:

1. `tailwind.config.ts` — implementation truth. Wins all disagreements.
2. `docs/DESIGN_TOKENS.md` — documentation truth, must match `tailwind.config.ts`.
3. `reference/prototype/[name]-tokens.css` — refined brand source, canonical
   input for token generation.
4. `design-system/colors_and_type.css` — original brand source, reconciled with
   the prototype tokens for traceability.
5. `reference/prototype/` JSX, CSS, and screenshots — how the brand applies to
   product screens.
6. `design-system/` atoms and previews — primitive components in isolation.

For unfamiliar component types, the agent consults the prototype's screenshot
index (`reference/prototype/SCREENSHOTS.md`) first to find a visual reference,
then reads the relevant JSX in `reference/prototype/` for composition intent,
then implements in the project's actual stack (Tailwind utilities + Shadcn
primitives, never inline styles, never raw CSS variables in JSX, never the
prototype's `.k-*` class names).

Where the prototype shows a pattern the PRD does not specify (banner tone in a
particular state, ordering of fields, empty state copy), the prototype is a
useful default. Where the prototype and PRD disagree on something the PRD
specifies, the PRD wins.

Do not duplicate visual rules already in the file — this subsection only
registers the hierarchy and the reading order.

### Task 3.3 — Verify Phase 3

Run these checks and report PASS or FAIL with a one-line reason for each. Do not
fix any failure — report only.

1. `reference/prototype/` exists at repo root and contains at least one
   `*-tokens.css` file, at least one `.jsx` file, and a `screenshots/` directory
   with at least one image.
2. `reference/prototype/SCREENSHOTS.md` exists and contains a description for
   every image file in `reference/prototype/screenshots/`.
3. `.cursor/rules/00-architecture.mdc` mentions `reference/prototype/` and
   contains a Forbidden Patterns entry forbidding edits to and imports from that
   folder.
4. `.cursor/rules/03-frontend.mdc` contains a "Visual reference hierarchy"
   subsection listing all six levels.
5. `.cursor/rules/03-frontend.mdc` no longer contains a "Design system reference"
   subsection. Only "Visual reference hierarchy" exists in that region.

Do not run a build — none of these changes touch shipping code.

---

## What comes next

With the design inserted and wired, the repo now has: `design-system/` and
`reference/prototype/` at the root, the four logo roles in `apps/web/public/`,
`docs/DESIGN_TOKENS.md` and `docs/COMPONENT_SPEC.md` in place,
`.cursor/rules/07-brand-voice.mdc` created, and both folders registered in
`.cursor/rules/00-architecture.mdc` and `.cursor/rules/03-frontend.mdc` with the
full six-level visual reference hierarchy.

Next, Claude Code writes the build roadmap — see
`docs/project_start/04-writing-the-roadmap.md`. The roadmap opens with the
prototype↔PRD reconciliation
(`docs/project_start/build-reference/prd-prototype-reconciliation.md`), then the
data contract (`docs/project_start/build-reference/data-contract.md`), the
walking-skeleton scaffold (`docs/project_start/build-reference/scaffold.md`), and
the auth build (`docs/project_start/build-reference/auth.md`) as its opening
phases, before the feature slices.
