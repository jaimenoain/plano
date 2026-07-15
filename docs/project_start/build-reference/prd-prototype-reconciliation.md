# PRD ↔ Prototype Reconciliation — Let the Prototype Correct the PRD, Once

> **Audience:** Claude Code, executing the roadmap's first build step.
> **When to use:** As the **opening step of the roadmap**, before the data
> contract is derived. It runs **once**, and only when a prototype exists at
> `reference/prototype/`. If the project was built without a prototype, this
> step is skipped entirely.

The prototype at `reference/prototype/` was generated _from_ `docs/PRD.md`, so
anything it shows that the PRD never stated is a sign the PRD was
underspecified — a real field, rule, state, or action the product needs but
nobody wrote down. This step harvests those signals from the prototype, decides
which are genuine PRD gaps versus prototype dressing, and folds the genuine ones
back into `docs/PRD.md` **first** — never straight into the contract.

The order is fixed:

```
prototype  →  docs/PRD.md (enriched here)  →  docs/DATA_CONTRACT.md  →  roadmap
```

Only after the PRD is prototype-enriched does the data contract get derived from
it (`docs/project_start/build-reference/data-contract.md`), and only after that
do the feature slices get planned. This ordering is what keeps trace-to-PRD
intact — see **The non-negotiable discipline** below.

> **This is a one-time bootstrap step, and it flows in one direction only.** The
> `prototype → PRD` correction happens once, here, while the design is fresh. It
> is **not** a standing rule to keep the product matching the prototype. After v1,
> product changes are driven by the owner and routed PRD → contract → roadmap →
> code via the **Product Change Protocol** (`.cursor/rules/06-agent-behaviour.mdc`
> §15) — the prototype and design docs are bootstrap artefacts and are **not**
> retro-reconciled. Never "reconcile backwards" from a shipped product to the old
> prototype.

---

## The non-negotiable discipline: never edit the contract directly

Every column in `docs/DATA_CONTRACT.md` must trace to a product rule in
`docs/PRD.md`. A field that exists only because a designer drew it — with no PRD
rule behind it — is exactly the kind of unjustified schema this pipeline is
built to prevent.

So a prototype-surfaced need is first made a **PRD** fact; only then does it
become a **contract** fact, when the contract is derived from the enriched PRD.
Reconciliation loops through the PRD precisely so that the contract stays a pure
projection of product requirements. **Trace-to-PRD is non-negotiable.**

Concretely, in this step Claude Code:

1. Reads the prototype as evidence about the product.
2. Harvests every product-relevant signal it shows.
3. Classifies each signal (defaulting to exclude).
4. Surfaces genuinely ambiguous signals to the human for a real/dressing call.
5. Writes the audit ledger `docs/PRD_RECONCILIATION.md`.
6. **Updates `docs/PRD.md` in place** with the confirmed additions, applying the
   PRD-authoring standards in `docs/project_start/01-writing-the-prd.md`
   (including the `⚑ DATA IMPLICATION` flag convention and the completeness
   checklist).
7. **Only then** derives the data contract
   (`docs/project_start/build-reference/data-contract.md`) and continues writing
   the roadmap (`docs/project_start/04-writing-the-roadmap.md`).

The change never jumps from prototype to contract. It goes prototype → PRD →
contract, in that order, every time.

> **The prototype is seductive; the default is "exclude."** A high-quality
> prototype is full of plausible-looking detail, and most of it is dressing —
> sample content, decorative badges, placeholder counts. **The burden of proof
> is on _adding_ to the PRD, not on excluding.** Nothing becomes a PRD fact
> unless it is a genuine product requirement.

---

## Preconditions

- **No prototype** — if `reference/prototype/` does not exist, this project was
  built without one. **Skip this step** and proceed directly to deriving the
  data contract (`docs/project_start/build-reference/data-contract.md`).
- **No PRD** — if `docs/PRD.md` does not exist, halt: the PRD must exist before
  it can be reconciled. Write it first per
  `docs/project_start/01-writing-the-prd.md`.
- **No screenshot index** — if `reference/prototype/SCREENSHOTS.md` does not
  exist, the design-insertion step
  (`docs/project_start/03-inserting-the-design.md`) has not finished indexing
  the prototype. Complete that first; the screenshot index and coverage list are
  this step's structured inventory.

Read `docs/PRD.md`, `reference/prototype/SCREENSHOTS.md`, and (if present)
`reference/prototype/SCREEN_MANIFEST.md` from disk, plus the prototype's `.jsx`
screen files for detail.

---

## Step 1 — Build the signal inventory from the prototype

Read `reference/prototype/SCREEN_MANIFEST.md` (if present) and
`reference/prototype/SCREENSHOTS.md` as the inventory of which screens and states
the prototype renders. Then read the `.jsx` screens for detail. Harvest every
**product-relevant** signal — not styling, not layout, not copy tone (those are
handled by the design docs Claude Design produced:
`docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and
`.cursor/rules/07-brand-voice.mdc`). Look specifically for:

- **Displayed values** — badges, status pills, timestamps, counters, totals,
  labels (e.g. "last synced 3m ago", a "Pro" tag, an item count). Each may imply
  a stored column or a derived value the PRD never named.
- **Rendered states** — empty, loading, error, over-limit, permission-denied,
  read-only. Each may imply a business rule, a state field, or an edge case the
  PRD did not specify. (If the prototype was exported with its closing prompt,
  `SCREEN_MANIFEST.md` labels these directly.)
- **Actions and affordances** — buttons and menu items (archive, share, invite,
  export, duplicate). Each may imply an operation, a route, or a permission the
  PRD's flows and permission matrices do not mention.
- **Entities and relationships** — sub-lists, nested records, linked items
  visible in composition. Each may imply a table or foreign key.
- **Enumerations** — fixed sets of options shown in the UI (statuses,
  categories, roles). Each may imply an enum or check constraint.

Quote at most a short identifying phrase from any file — never a long passage.

---

## Step 2 — Classify each signal against the PRD

For **each** harvested signal, assign exactly one class:

- **Already covered** — the PRD already accounts for it. Drop it; count it only.
- **Genuine PRD gap** — the product clearly needs this, the prototype shows it,
  and the PRD never states it. Becomes a finding. Classify what **kind** of
  addition it is, because that determines how it reaches the contract:
  - **Storage need** (a displayed value, timestamp, counter, status that must
    be stored): the finding adds a product rule **and** a `⚑ DATA IMPLICATION`
    flag that names the need in plain terms — never a column type, index, or
    table name (those are decided when the contract is derived, which picks the
    need up natively). Tag `[must fix]`: storage-implying language without a
    flag is a top-priority defect.
  - **Permission / operation** (an action or affordance implying
    who-can-do-what): the finding adds a permission rule with a **named actor**
    and a **named scope** (`own` / `all in tenant` / `all`). Tag `[must fix]`
    if it introduces an operation with no actor and scope.
  - **Rule / wording / state** (an edge case, enumeration, or clarification
    with no storage or permission consequence): a plain finding, untagged —
    unless it introduces a stored state, which makes it a storage need.
- **Prototype liberty** — sample/placeholder content, decoration, or a designer
  flourish with no product rule behind it. **EXCLUDE.** Record it so it is not
  re-litigated the next time the prototype is reviewed.
- **Ambiguous** — you cannot tell whether it is a real requirement or dressing
  from the PRD alone. Carry it into Step 3 for a human call.

Bias conservative: when a signal would ADD a column, entity, enum, or rule and
the PRD gives no basis for it, prefer "Prototype liberty" or "Ambiguous" over
"Genuine PRD gap." **The PRD, not the prototype, is the source of truth for what
the product requires.**

---

## Step 3 — Surface the ambiguous signals to the human

Genuinely ambiguous signals — where you cannot tell from the PRD alone whether a
detail is a real requirement or dressing — are a **product decision**, not a
technical one. Surface them to the human for a real/dressing call. For each, ask
a single direct question in plain English with a suggested default that leans
toward the most likely-correct call given the PRD context — and that leans
EXCLUDE whenever adding it would introduce schema with no PRD basis. Example:

> The dashboard shows a "Pro" badge next to the user's name. Is a subscription
> tier a real product requirement (→ add to the PRD; this will add a column the
> contract must then cover), or prototype dressing (→ exclude)? The PRD's
> monetization section doesn't mention tiers, so my suggestion is EXCLUDE unless
> you tell me tiers are real. (real / dressing)

Do not proceed until every ambiguous signal is resolved into "Genuine PRD gap"
or "Prototype liberty." Everything else in this step is automatic — only the
ambiguous signals need a human.

---

## Step 4 — Write `docs/PRD_RECONCILIATION.md`

Produce the ledger below. It is the audit trail; the "Confirmed PRD additions"
section is the set of findings that get folded into `docs/PRD.md` in Step 5.

```markdown
# PRD ↔ Prototype Reconciliation

> Generated from docs/PRD.md and reference/prototype/. Records every
> product-relevant signal the prototype surfaced and how it was resolved. The
> "Confirmed PRD additions" below are the findings folded into docs/PRD.md in
> place — each adds a product rule, and where needed a `⚑ DATA IMPLICATION` flag
> that names the need. The data contract is then derived from the enriched PRD
> and picks these up natively via its PRD-to-Schema Trace.

## Summary

- Signals harvested: <N>
- Already covered (no action): <N>
- Confirmed PRD gaps → folded into PRD: <N>
- Excluded as prototype liberty: <N>

## Confirmed PRD additions — findings

<Each addition written as a finding. Tag `[must fix]` when it is a
storage-implying need, or a permission rule without actor/scope. Storage needs
carry a `⚑ DATA IMPLICATION` flag that names the need, never a column type.
Example shapes:>

### F1 — [must fix] — <short title>

**Where:** <PRD section the rule belongs in>
**Problem:** The prototype's <screen> shows <short phrase>, but the PRD states
no rule for it, so the build will omit it.
**Fix:** <the product rule to add, in plain language>.
`⚑ DATA IMPLICATION: requires <need named plainly; no column type>`.

### F2 — [must fix] — <short title>

**Where:** Permission Matrix: <X>
**Problem:** The prototype exposes a <action> control with no matching
permission rule.
**Fix:** Add: <actor> can <action> <scope>. <one-line justification grounded in
existing PRD logic>.

### F3 — <short title>

**Where:** <section>
**Problem:** <one sentence>.
**Fix:** <rule or wording to add; no flag>.

## Excluded — prototype liberties (deliberately NOT added)

| Prototype element (screen + short phrase) | Why excluded                                  |
| ----------------------------------------- | --------------------------------------------- |
| ...                                       | sample content / decoration / no product rule |

## Already covered (no action)

- <brief one-line list; no detail needed>
```

---

## Step 5 — Fold the confirmed additions into `docs/PRD.md`

Update `docs/PRD.md` **in place** with the "Confirmed PRD additions" from the
ledger, applying the PRD-authoring standards in
`docs/project_start/01-writing-the-prd.md`. For each finding:

- Add the product rule to the section named in **Where:**, in plain product
  language.
- For a storage need, write the `⚑ DATA IMPLICATION` flag as part of the rule —
  naming the **need**, never a column type, index, or table name.
- For a permission need, write the rule with a named actor and a named scope
  (`own` / `all in tenant` / `all`).
- Update the PRD's completeness / full-lifecycle coverage record so the new
  rules are reflected there.

If there are **zero** confirmed gaps, the prototype revealed nothing the PRD was
missing: leave `docs/PRD.md` unchanged, note this in the ledger, and continue.

Once the PRD is enriched, derive the data contract from it per
`docs/project_start/build-reference/data-contract.md` — it picks up every new
fact natively via its PRD-to-Schema Trace — and continue writing the roadmap per
`docs/project_start/04-writing-the-roadmap.md`.

---

## Hard rules for this step

- **Never edit the contract directly.** A prototype-surfaced need becomes a PRD
  fact first; the contract is derived afterwards from the enriched PRD.
  Trace-to-PRD is non-negotiable.
- **Never propagate a prototype detail without a confirmed product rule behind
  it.** Default to exclude; the burden of proof is on adding.
- **Express a storage need as a `⚑ DATA IMPLICATION` flag that names the NEED**,
  never a column type, index, or table name — that is decided when the contract
  is derived. A permission need names an actor and a scope.
- **Surface only genuinely ambiguous signals to the human**, as a plain-English
  real/dressing question with an EXCLUDE-leaning default. Everything else is
  automatic.
- **Never quote more than a short identifying phrase** from the PRD or prototype.
- **This step runs once.** It is skipped entirely when there is no prototype.
