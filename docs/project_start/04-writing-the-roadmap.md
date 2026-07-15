# Writing the Roadmap

> **Audience:** Claude Code, the coding agent, whenever it produces a phased
> build plan — the initial product build **and** every later roadmap (a feature
> set, a fix round, an optimisation pass). **When to use:** at bootstrap this is
> Step 6, after the design has been inserted into the repo
> (`docs/project_start/03-inserting-the-design.md`) once the PRD and design
> package are in place; thereafter, every time a new body of work is large enough
> to need a roadmap. This guide is the source of truth for how any feature
> roadmap is structured, phased, and validated — see "bootstrap vs. subsequent
> mode" below for what changes after the first build.

This guide explains how to produce a phased feature roadmap in vertical
slices. The roadmap is written to `docs/ROADMAP.md` and executed one phase
at a time by the coding agent (see `docs/EXECUTOR_PROMPT.md`).

> **One sizing rule for every roadmap.** Whether this is a feature build, a fix
> round, an optimisation pass, or meta work (the template's own docs,
> `.cursor/rules/`, tooling, CI, a refactor), size each task as **the largest
> coherent chunk one agent run can build and verify green** — the fewest PRs that
> each stand on their own. There is no task-count band and no one-task-per-PRD-
> section rule. A coupled, single-concern change is **one PR**, however many tasks
> the plan lists it as. See "The Thick Slice Limit" and "Sizing is the same for
> every roadmap" in `.cursor/rules/05-vertical-slice.mdc` for the governing rule.

The roadmap is not a stack of feature ideas — it is a dependency-ordered
build plan whose opening phases construct the product's foundations
(prototype↔PRD reconciliation, the data contract, the walking-skeleton
scaffold, and the auth build) before any feature slice begins. Everything
in this guide exists to keep the plan buildable in one pass: correct
sequencing, tight scope boundaries, and traceability back to the PRD.

---

## One file, many roadmaps — bootstrap vs. subsequent mode

`docs/ROADMAP.md` holds exactly **one active roadmap**, but roadmaps recur across the
product's life: the initial build first, then later bodies of work — a feature set, a
fix round, an optimisation pass. When a roadmap's last task is checked, the executor
archives the finished file to `docs/roadmaps/NNNN-<slug>.md` and resets
`docs/ROADMAP.md` to a blank scaffold (`docs/EXECUTOR_PROMPT.md` step 8); this guide
then generates the next roadmap into the clean file.

**Before generating, check the state of `docs/ROADMAP.md`.** If it is the blank
scaffold (or the template's illustrative sample, on a fresh project), proceed. If a
**finished** roadmap is still in it (every task `[x]`), run the close-out first. If an
**unfinished** roadmap is in it, stop and ask the owner — never overwrite live work;
a mid-roadmap change request does not spawn a new roadmap, it inserts a task or phase
into the active one per the Product Change Protocol
(`.cursor/rules/06-agent-behaviour.mdc` §15).

This guide runs in one of two modes:

- **Bootstrap mode** — the first roadmap of a new project. Everything in this guide
  applies as written, including the foundation phases below.
- **Subsequent mode** — every roadmap after that. The foundations exist; plan feature
  work only:
  - **No foundation phases.** Skip "The roadmap opens with the foundation phases"
    entirely — reconciliation, the data contract, the scaffold, and the auth build
    are done and recorded in `docs/AI_STATUS.md`. The contract is extended per entity
    as new feature slices need it (the §15 flow: PRD → contract → roadmap → code),
    never rebuilt.
  - **Start at Phase 1** with feature slices. Phase numbering restarts on every
    roadmap — the previous file is archived, so numbers cannot collide.
  - **Scope is the PRD delta, not the whole PRD.** The new work is routed through the
    Product Change Protocol (§15) into `docs/PRD.md` _before_ planning, so the PRD
    already records the new rules when you read it. The roadmap covers the sections
    this initiative adds or changes; Pass 2 checks headings against those sections.
  - **A subsequent roadmap is as large as its initiative and no larger** — a
    3-task roadmap is a fine roadmap. Size each task by the coherent-chunk rule
    (largest chunk one run can build and verify green; the same change across
    parallel surfaces is one task; no fragments). A refinement, fix, or refactor
    round is typically a handful of PRs, not a dozen.
  - **Task 0.0 appears only if the new work introduces new human-only prerequisites**
    (a new third-party account, a new secret). Everything set up during the initial
    build stays set up.
  - Every other rule in this guide — vertical slices, scope boundaries, RLS scope,
    batching into few phases, risk-based UAT (per-phase X.98 gate only when a later
    phase depends on it, plus one end-of-roadmap Final UAT), one task = one PR —
    applies unchanged. There is no per-phase summary task.

---

## Inputs — read these before writing anything

Read the following from the repo before doing anything else:

- `docs/PRD.md`
- `docs/DATA_CONTRACT.md`
- `docs/DESIGN_TOKENS.md`
- `docs/COMPONENT_SPEC.md`
- `docs/AI_STATUS.md` — read this in full; see the AI_STATUS rule below.
- `design-system/` — list the directory; specifically check whether
  `design-system/ui_kits/marketing/` and `design-system/ui_kits/app/`
  exist and what components they contain. See the design-package
  awareness rule below for what to do with that information.
- `reference/prototype/` — list the directory and read
  `reference/prototype/SCREENSHOTS.md` if present, to understand which
  PRD screens the prototype rendered and which it left as coverage gaps.

**What `docs/DATA_CONTRACT.md` contains, and when.** The contract has a
two-phase lifecycle (`build-reference/data-contract.md` § "Source-of-truth
lifecycle"). Permanently, it holds: a Domain Entity Inventory (entity names,
relationships, tenancy, key business constraints, state machines), User Types
and Routing, Provisioning rules, an API Route Registry, Environment Variable
Registry, RLS Architecture Notes, and — where applicable — Storage Contracts.

Before a given entity's migration is written, the contract **also** carries that
entity's full Schema Specification (every column, type, nullability, FK) and RLS
Policy Specification — the coding agent produces the migration from them. Once
the migration ships, the entry is marked `🔒 SCHEMA FROZEN`: from then on the
migration and `database.types.ts` are authoritative, the frozen columns and
policies are historical, and further changes are queued as
`**Pending migration:**` notes inside the entry rather than edited in place.

What never belongs in the contract, in either phase: DTO interfaces, Zod
schemas, and example payloads. Those live in code. When you need to confirm
whether an entity exists, read the Domain Entity Inventory; when you need to
confirm a route exists, read the API Route Registry.

---

## The roadmap opens with the foundation phases (bootstrap mode only)

> **Subsequent mode skips this section entirely** — the foundations are built and
> recorded in `docs/AI_STATUS.md`; a subsequent roadmap contains feature phases only.

In the current workflow the data contract, the walking-skeleton scaffold,
and the auth build are **not** pre-completed steps that happen before the
roadmap. They are the roadmap's **opening phases**. The roadmap therefore
begins at Phase 0/1 and covers, in this order:

1. **Prototype ↔ PRD reconciliation** — harvest every product-relevant
   signal the prototype shows that the PRD never stated, classify each
   (defaulting to exclude), and route confirmed gaps back into the PRD
   before they can reach the contract. See
   `docs/project_start/build-reference/prd-prototype-reconciliation.md`.
   Skip if the project has no prototype.
2. **The data contract** — build `docs/DATA_CONTRACT.md` once, from the
   prototype-enriched PRD: Domain Entity Inventory, User Types and Routing,
   Provisioning rules, API Route Registry, Environment Variable Registry,
   RLS Architecture Notes. See
   `docs/project_start/build-reference/data-contract.md`.
3. **The walking-skeleton scaffold** — Tailwind config injection from
   `docs/DESIGN_TOKENS.md`, layouts, auth UI shells, route stubs, marketing
   shell. See `docs/project_start/build-reference/scaffold.md`.
4. **The auth build** — auth schema, RLS, provisioning via the
   `on_auth_user_created` trigger plus a `SECURITY DEFINER` function, the
   limbo-gate middleware, onboarding, and (multi-membership) member
   management. See `docs/project_start/build-reference/auth.md`.

Only **after** these foundation phases do the vertical-slice feature phases
begin. Each foundation phase's tasks must point to its build-reference doc
in the task body so the executor has the detailed procedure to hand, and
each still obeys every rule in this guide (scope boundaries, RLS scope,
UAT).

Foundation-phase tasks follow the same **one task = one PR** rule, but their
unit is a coherent artifact or gate rather than a user-facing feature.
Consolidate sub-steps that are fragments of one artifact into a single task
(e.g. token injection + app shell + build check = one "walking-skeleton
scaffold" task; the auth spec and its preflight gate = one combined
spec-and-gate task), and keep a step as its own task only when it is a
genuinely distinct, separately-verifiable gate or artifact (e.g. the auth
build itself, which the combined spec-and-gate task protects).

**Do not re-plan work `docs/AI_STATUS.md` already records as built.** If a
foundation phase (or any earlier phase) has already shipped and
`docs/AI_STATUS.md` records its routes, files, components, or schema, do
not generate a duplicate task for it. `docs/AI_STATUS.md` is the
ground-truth record of what the codebase actually contains — read it in
full before generating any tasks and treat anything recorded there as
complete regardless of whether it also appears in the PRD or the contract.
This check is what prevents the roadmap from re-building work that already
exists. If a feature, route, component, or infrastructure item is recorded
as built, treat it as pre-complete.

---

## Planning rules

- **Read `docs/AI_STATUS.md` in full before generating any tasks.** It is
  the ground-truth record of what has actually been delivered — routes
  scaffolded, files created, components installed, schema applied, and any
  known deferred items. Do not generate tasks for anything listed there.
- **Design package awareness.** You should already have listed
  `design-system/` per the intake step above. If the folder exists, it is
  the brand source — its tokens were translated into `tailwind.config.ts`
  and its component patterns into `docs/COMPONENT_SPEC.md`. Two implications
  for planning:
  1. If `design-system/ui_kits/marketing/` exists (Hero, Pricing, Footer,
     Nav, etc.), the walking-skeleton scaffold intentionally leaves the
     marketing site minimal. Plan a dedicated "Marketing site polish" slice
     early — as the first task of the first feature phase, before any
     application feature work — that translates these components into the
     real `app/(marketing)/` routes. It is one slice inside that phase, not
     a phase of its own. The brand chose those patterns; shipping a stock
     SaaS marketing template instead is a divergence.
  2. If `design-system/ui_kits/app/` contains application-specific patterns
     that match a feature (e.g. an `ObligationsTable.jsx` for a contracts
     product, a `ContractPanel.jsx` for the same), the corresponding
     feature task's UI work is a translation, not an invention. Reference
     the package file in the task's `Scope boundary` so the coding agent
     knows where to look.
- **Feature phases are vertical slices, and each slice is one task = one
  PR.** A slice = migration + server action + UI, delivered together and
  sized to ship as a single PR that deploys on its own. Full entity CRUD
  (list, create, edit, delete) is **one** slice — do not split it into
  separate list/create and edit/delete tasks.
- **Size a task as the largest coherent chunk one agent run can build and
  verify green.** PRs auto-merge on green with no human code review, so PR
  size is bounded by what one run can build _and prove correct_, not by a
  reviewer's capacity. Bias markedly larger than standard practice; a
  fragmented roadmap costs far more than a large PR. When unsure whether
  something is its own task, it isn't — merge it. One task therefore covers:
  a feature and every small capability sharing its screen/flow/entity (the
  list's search, sort, empty state ship inside the list task; a settings page
  is one task, not one per field group); **the same logical change rolled out
  across parallel surfaces, modules, or call sites** (the identical fix or
  pattern for POA + corporate + contract, every locale, every consumer of a
  renamed helper — one task, never one-per-surface); **a batch of related
  fixes in one subsystem**; and **a refactor's coupled steps across many
  files**.
- **No task-count band, no per-PRD-section anchor.** Do not size the roadmap
  toward a target number of tasks, and do not map one task to one PRD
  sub-section. Count coherent chunks, not sections. The only roadmap that
  naturally runs long is a first greenfield build (many genuinely distinct
  features) — and even there each task is one coherent chunk. A refinement,
  fix, or refactor initiative is typically a handful of PRs.
- **Split a slice into separate tasks only when** (a) it genuinely cannot be
  built **and** verified green in one run; (b) the parts are **unrelated**
  concerns that share no screen, flow, entity, or subsystem and each stands
  alone; (c) a manual checkpoint falls between them (which already forces a
  phase boundary — see the next rule); or (d) **revert isolation** — you
  _choose_ to give a schema migration or a genuinely independent/reversible
  piece its own PR so a bad one reverts alone (optional, never required). Do
  **not** split into non-shippable fragments: a migration-only task, a UI-only
  task, or one CRUD half. Do **not** split the same change across surfaces. A
  bigger slice is still one task and one PR; the executor may take several
  commits to complete it.
- **Phase boundaries are set by manual checkpoints, not feature themes.** A
  feature that requires a mid-build human action (e.g. configuring a
  Supabase vault secret, enabling a database extension, verifying a
  third-party domain) must be split across two phases at that action point.
- **Batch feature tasks into few phases — never one phase per feature.**
  A feature phase groups **as many feature tasks as dependency order allows**
  (typically 3–7 coding tasks); a new phase exists only where a manual
  checkpoint (X.0) forces one, or where downstream work genuinely depends on a
  human sign-off of what came before. Fewer phases means fewer setup gates and
  fewer places a critical-gate UAT (X.98) can fall — most roadmaps need only a
  few phases. (UAT is risk-based, not per-phase: see the UAT task rule — most
  phases have no X.98 at all, and all polish defers to one end-of-roadmap Final
  UAT.)
- **Every phase must be internally batch-compatible.** Tasks within a phase
  run sequentially in one batch with no human intervention between them. A
  task that requires a human action before the coding agent can proceed
  must either open the phase as a `[HARD MANUAL CHECKPOINT]` (Task X.0) or
  terminate the previous phase.
- **Task ordering within a phase is expressed by the `Dependencies:` field
  only.** Do not use batch group headers or sub-group annotations.
- Collect ALL manual prerequisites for a phase into a single Task X.0
  (Phase Setup). Do not flag prerequisites on individual tasks — the
  `Manual prerequisites:` field must not appear on any task other than X.0.
  If a phase has no manual prerequisites, omit X.0 entirely. Before writing
  any X.0, check whether its items can move into the one Pre-flight Setup
  task instead — an X.0 exists only for items that depend on something the
  build produces mid-way (see "Agent tasks vs. human tasks" below).
- **Sequence by dependency:** if Feature B reads data created by Feature A,
  A comes first.
- **RLS Scope Rule:** Every task that introduces a new migration MUST
  explicitly state in its `Scope boundary` field whether RLS policies for
  the new table(s) are included in this task or deferred to a named separate
  task. Leaving RLS unmentioned in scope is a planning error — it will be
  omitted from the execution prompt, causing silent permission denials at
  runtime. Acceptable forms: _"RLS policies for the `orders` table are
  added here."_ or _"RLS policies for `orders` are deferred to Task X.X."_
  No other wording is acceptable.
- **RLS Anti-Recursion Rule:** When a task's RLS policy will use a helper
  function (e.g. `is_org_member`, `can_access_X`) that queries another
  table, the `Scope boundary` must name every table that function reads. If
  any of those tables will also carry RLS policies that call the same or a
  sibling helper function, note the recursion risk explicitly in the
  `Scope boundary`. The migration must either use
  `SECURITY DEFINER` on the helper function to bypass RLS on the inner
  query, or rewrite the policy to avoid cross-table RLS chains. Silence on
  recursion risk is a planning error — it produces policies that pass code
  review but fail at runtime with infinite recursion errors.
- **Mutation Feedback Rule:** Every task that includes a create, update, or
  delete action MUST specify in its `Goal` field what the UI does after a
  successful mutation: redirect target, list revalidation method (e.g.
  `revalidatePath`, `router.refresh`), confirmation message, and
  modal/drawer close behaviour. A task that says "user can create X"
  without specifying post-mutation UX will produce forms that submit
  successfully but leave the user staring at stale data.
- **Output format:** flat numbered list. Each task line MUST begin with a
  `[ ]` checkbox. Format: `[ ] Task X.X — [name]`. Then on subsequent
  indented lines: the fields defined in the Task Body Template below.
- **One checkbox per task — and no other checkbox anywhere in the file.**
  The task-heading `[ ]` is the only checkbox syntax the roadmap may
  contain. Steps inside a manual task, UAT checks, pre-flight items, and
  every other sub-list are plain `-` bullets or numbered lines — never
  `- [ ]`. The executor finds its next unit of work by scanning for the
  first unchecked `[ ]`; a nested checkbox corrupts that scan and stalls
  the loop. The agent is the only party that ever flips a `[ ]` to `[x]`,
  including on manual tasks (after the human reports the steps done).
- The `[ ]` checkbox is the executor's completion tracker **and the PR
  boundary**: one coding task = one branch = one PR = one executor run (which
  may be several commits). It is changed to `[x]` once the task's
  Definition-of-Done checks pass and its PR is ready to merge. Never omit it.
- For each task, write a goal description that is unambiguous. If the task
  maps directly to a named PRD section, reference it. If the task is
  infrastructure, derived, or has non-obvious scope boundaries, describe
  exactly what is and isn't included.

### Agent tasks vs. human tasks — the human does only what the agent cannot

Every task in the roadmap is an **agent task by default**. The project owner
is non-technical, busy, and more error-prone than the agent — every human
interruption is expensive and every human step is a defect risk. A step is
assigned to the human **only** when the agent is physically or policy-wise
unable to perform it. There is no third category.

**The human-only test.** A step belongs in a `[MANUAL TASK]` only if it is
one of:

- Creating or logging into an account at a third-party service (Resend,
  Stripe, a domain registrar…).
- Entering payment or billing details, or accepting legal terms.
- Pasting a secret into a dashboard (Vercel env vars, Supabase Vault).
  Secrets never transit the chat and are never typed by the agent.
- Changing DNS records at a registrar.
- Receiving something on a personal channel — an email inbox, an SMS —
  and confirming it arrived.
- Subjective sign-off: browser UAT, visual approval of a design.

Everything else is agent work, even when it lives inside external services:
migrations and SQL via the Supabase MCP, env-var _verification_ and syncing
via the Vercel CLI (`vercel env ls`, `vercel env pull`), GitHub via `gh`,
sending test data, running checks. **A verification step must never appear
inside a manual task** — "confirm the env var exists" is the agent's job,
not the human's. If a candidate manual item fails the human-only test, it
is a planning error: fold it into an agent task.

**Consolidate the interruptions.** Group human-only steps into the fewest
possible sittings:

- Everything the human can do before the build starts goes into the single
  **Pre-flight Setup** task — one sitting, at the very beginning, covering
  all phases (account creation, domain verification, every secret that
  already exists).
- A per-phase **Task X.0** exists only for a human step that _cannot_ be
  done earlier because it depends on an artifact the build produces mid-way
  (e.g. a webhook signing secret that only exists after the endpoint is
  deployed). Its body states, in one line, why it could not live in
  Pre-flight Setup.
- A phase has an X.98 UAT **only** when it carries a critical human-only gate
  (see the UAT task rule); most feature phases have none. All polish and
  subjective sign-off defers to the single end-of-roadmap Final UAT.

The target experience: the human is interrupted once at project start (Task
0.0), then only for the occasional critical-gate X.98, the rare mid-build X.0,
and a single Final UAT at the end of the roadmap.

**Write manual tasks for a non-technical reader.** Numbered steps in plain
language: name the website, the menu, and the button; say what the user
should see when it worked; give any value to copy-paste verbatim; end with
what to reply in chat (e.g. "reply **done**"). No jargon, no code, no file
paths, no acronyms the PRD doesn't use. Secrets are pasted into the Vercel
dashboard (or Supabase Vault) — never sent in chat, never put in a local
file by the human; the agent afterwards syncs its local environment itself
(`vercel env pull`).

**Completion flow.** The executor — not the human — owns the checkbox. It
presents the steps, stops with the 🔴 Action-required marker, and when the
human reports back it verifies whatever is agent-verifiable (the env var
now exists, the domain shows as verified, the test email was received as
reported), then marks the task `[x]` itself. Every manual task ends with a
"the agent then verifies:" line listing those checks so the executor knows
what to test before flipping the checkbox.

### Migrations are applied by the agent

Every migration in the roadmap is applied by the coding agent itself via
the Supabase MCP `apply_migration` tool at execution time. The roadmap
never hands a SQL file to the user to paste into the Supabase SQL Editor,
and never instructs `supabase db push`. The project owner is non-technical
and should never have to apply a migration by hand. This affects planning
only in that no task's `Manual prerequisites:` should ever ask the user to
run SQL.

### Phase batch submission — how a phase is queued

A phase's coding tasks are submitted for execution in dependency order and run
with no human intervention between them — but each task ships its **own** PR
(one branch, one merge, one deploy per task) rather than accumulating into a
single phase PR. After the phase heading, add the appropriate batch note (see
the "Phase-level batch note" section below for exact formats):

- **Single-batch phase** — submit the phase's coding tasks (X.1, X.2, …) in
  order; the executor completes and merges each task's PR before starting the
  next.
- **Phase with hard manual checkpoint** — Task X.0 must be fully signed off
  before any coding-agent tasks are submitted.

When a phase has an X.98 critical-gate UAT, it terminates the phase and is never
a coding task. There is no per-phase summary task after it — spec-sync rides each
task's Active Memory Update, and the delivery record is written once at close-out.

### Branch & PR flow

The executor (`docs/EXECUTOR_PROMPT.md`) maps one **coding task → one feature
branch → one PR**. When it starts a task it creates the branch, completes the
whole task (one or more commits), then opens the PR; the PR merges once the
blocking checks are green — never on a red check, never a direct push to `main`.
Each merge deploys that slice to production on its own. A **phase** is no longer a
PR boundary: it groups tasks for the manual setup gate (`X.0`) and, when present,
the critical-gate UAT (`X.98`), so a phase with several coding tasks produces
several feature PRs, each deploying independently. When a phase has an `X.98`, it
is the human verifying that critical gate against the accumulated production
deploys (fix-forward on failure, via a new branch + PR); polish and subjective
sign-off wait for the end-of-roadmap Final UAT.
This does not change how a phase is queued or what a task contains; it only tells
the roadmap author to size each task as a single coherent, reviewable, shippable
slice — because the task, not the phase, is now the PR.

---

## Pre-flight Setup block

Before Phase 0, output a `## Pre-flight Setup` section containing exactly
one task — `[ ] Task 0.0 — Pre-flight Setup` — that consolidates **every**
human-only prerequisite that can be done before the build starts, across
all phases (account creation, domain verification, billing configuration,
every secret that already exists). Apply the human-only test from "Agent
tasks vs. human tasks" to each item; anything the agent can do itself must
not appear here.

These items must NOT be repeated in individual Phase X.0 tasks. If there
are no such prerequisites, omit this section.

```
## Pre-flight Setup

[ ] Task 0.0 — Pre-flight Setup

  [MANUAL TASK — the agent walks the human through these steps, then marks
  this task complete when the human reports back]
  Estimated time: [N] minutes

  Steps for the human, in order (plain language — no jargon):

  1. [E.g. Go to resend.com and create a free account with your normal
     email address.]
  2. [E.g. In Resend, click "Domains", then "Add Domain", and type
     yourdomain.com. Resend shows you two or three rows of "DNS records" —
     keep that page open.]
  3. [E.g. Copy each of those rows into your domain provider (where you
     bought yourdomain.com) under DNS settings. Back in Resend, wait until
     the domain shows a green "Verified" badge.]
  4. [E.g. In Resend, click "API Keys", then "Create API Key", and copy the
     key it shows you. In the Vercel dashboard, open your project →
     Settings → Environment Variables, add a variable named RESEND_API_KEY,
     paste the key as its value, tick all three environments, and save.
     Never paste the key into this chat.]

  When you have finished, reply "done".

  The agent then verifies: `RESEND_API_KEY` is present in all three Vercel
  environments (`vercel env ls`), and pulls it locally (`vercel env pull`).
```

---

## Phase-level batch note

Immediately after every phase heading, add a blockquote batch note in the
appropriate format below. This note is not a task — it is metadata for the
executor.

**Single-batch phase:**

```
> **Batch submission:** Submit Tasks X.1 → X.2 → X.3 as a single sequential batch.
```

**Phase with a hard manual checkpoint (Task X.0 present):**

```
> **Batch submission:** Task X.0 is a hard manual checkpoint — complete it fully before submitting any coding-agent tasks. After Task X.0 is signed off, submit the remaining tasks as a single batch.
```

---

## Task Body Template

Every task MUST use the following structure. Fill every field; omit only
fields marked "(omit if not applicable)".

> **Important:** This template omits `Accepts`, `Emits`, and `DATA_CONTRACT`
> fields intentionally. Restating schema in a task body duplicates a source
> that moves underneath it: the contract's own schema entries freeze once
> their migration ships, after which `database.types.ts` and the migrations
> are authoritative. The coding agent therefore reads the contract and the
> live codebase at execution time — and derives DTOs, types, and validation
> rules, which the contract never holds in either phase. The Pre-Task
> Self-Check in
> `.cursor/rules/06-agent-behaviour.mdc` § 10 enriches each task with the
> specific PRD rules and entity inventory entries it needs as a per-task
> pre-flight step. Adding schema-level fields here would produce
> planning-time guesses that drift from reality and must be re-verified
> anyway. The fields in this template are the ones that only the roadmap
> author can determine: sequencing, scope boundaries, and PRD traceability.

```
[ ] Task X.X — [name]

  Goal:            [1–2 sentences. State what exists after this task that
                   didn't before. Reference the PRD section by heading.
                   If the task includes a create/update/delete action,
                   state what the UI does after a successful mutation:
                   redirect target, list refresh method, confirmation
                   message, and modal/drawer close behaviour.]
  Scope boundary:  [What is explicitly NOT included in this task — prevents
                   the coding agent from over-building into adjacent tasks.
                   Name the separate shippable feature that covers any
                   excluded work. E.g.: "Does not include CSV export or bulk
                   actions — separate features in later tasks. RLS policies
                   for the new table are added here."]
  Dependencies:    [Task numbers that must be [x] before this runs.
                   Write "None" if truly standalone.]
  Partial-until:   [Omit if not applicable. Use only when this task
                   intentionally leaves something partially implemented
                   because a later task will complete it. Format:
                   "Task M.X — [one sentence describing what remains]"]
  Completes:       [Omit if not applicable. Use only when this task
                   completes a partial implementation from an earlier phase.
                   Format: "Task N.X (partial) — [one sentence describing
                   what this task adds to finish it]"]
  PRD ref:         [PRD section heading(s) that govern this task's scope.
                   E.g.: "§4.2 Customer Management". Heading only — rule
                   summaries are extracted by the Pre-Task Self-Check
                   (`.cursor/rules/06-agent-behaviour.mdc` § 10) at execution time.]
```

> **Note on Scope boundary:** this is the most important field for
> preventing the coding agent from under- or over-building. Be specific.
> Name the separate task that will cover the excluded work — do not leave
> gaps.
>
> **RLS is always in scope — never silent, effectively never deferred.** If a
> task creates a new table, the `Scope boundary` field MUST include one of:
>
> - _"RLS policies for `<table>` are added here."_ — the norm: a table and its
>   RLS ship together in the same slice
> - _"RLS policies for `<table>` are deferred to Task X.X."_ — avoid this; a
>   migration without its RLS is a non-shippable fragment, so use it only in the
>   rare case a named later task adds the policies before the table is read
>
> **RLS recursion must be addressed.** If the RLS policy uses a helper
> function that queries another RLS-protected table, the `Scope boundary`
> must name the tables involved and state the recursion-avoidance strategy
> (`SECURITY DEFINER` on the helper, or a policy rewrite). Omitting this
> produces policies that pass code review but fail at runtime with infinite
> recursion.
>
> A `Scope boundary` field that does not mention RLS for a migration task
> will be flagged as an Entity Inventory Gap at execution time. See the
> concrete example below for correct usage.

---

## Concrete Example — a single vertical slice task

The following is a correctly formed feature-phase task. Use it as a
reference when generating all feature-phase tasks.

```
[ ] Task 2.1 — Customer Management

  Goal:            Delivers the full Customers slice (§4.2 Customer Management).
                   After this task: /customers renders a paginated table of
                   customers from the database, and a user with the Admin role
                   can create, edit, and delete a customer via a modal form. On
                   a successful create or edit the modal closes, a success toast
                   appears, and the list revalidates
                   (`revalidatePath('/customers')`) to show the change without a
                   manual page refresh; delete asks for confirmation, then
                   removes the row and revalidates.
  Scope boundary:  Does not include CSV export or bulk actions (separate
                   shippable features — later tasks). RLS policies for the
                   customers table are added here; the policy uses a
                   SECURITY DEFINER helper to check org membership,
                   avoiding recursion with the org_members table.
  Dependencies:    None
  PRD ref:         §4.2 Customer Management
```

---

## When to split a slice — and when not to

A slice is one shippable task by default, and the bias is always toward
keeping it whole — a large PR is cheaper than a fragmented roadmap, and with
auto-merge there is no review checkpoint to gain by splitting. If you are
weighing whether a split is justified, it isn't. The whole-slice bias also
means the _same_ change across parallel surfaces, and a batch of related fixes
in one subsystem, are each **one** task — never split per-surface or per-fix
(see "Size a task as the largest coherent chunk" above). Divide a slice into
separate tasks **only** in these cases:

| Situation                                   | How to divide                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Won't verify in one run**                 | If the chunk is genuinely too large for a single agent run to build **and** prove green, split it into `Part 1 of 2` / `Part 2 of 2`, each independently shippable. Size, alone, is never the reason — a refactor or cross-surface rollout may touch many files in one task.                                  |
| **Unrelated concerns bundled**              | If a task bundles changes that share no screen, flow, entity, or subsystem and each stands alone (e.g. "Customer Management" and, separately, an unrelated billing webhook), make each its own task/PR, sequenced by dependency. The _same_ change across surfaces is **not** this case.                      |
| **Manual checkpoint falls mid-feature**     | If a human action (vault secret, extension enable, domain verification) must happen partway through, split at that action point — it terminates the earlier phase and its work resumes in the next (see the phase-boundary rule above).                                                                       |
| **Revert isolation (optional)**             | You _may_ give a schema migration or a genuinely independent/reversible piece its own PR so a bad one reverts alone. Optional, never required — use judgement; when in doubt, keep it in the slice.                                                                                                           |
| **3rd-party integration** (Stripe, Resend…) | The integration and the UI it powers are **one** slice/PR; do not split the backend from its UI. Collect the integration's manual prerequisites (API keys, webhook secrets) in Task X.0, not on the task itself. A pure backend integration with no UI (e.g. a webhook handler) is itself one shippable task. |

Never split a slice into non-shippable fragments — a migration-only task, a
UI-only task, or one half of an entity's CRUD. A larger slice remains one task
and one PR; the executor completes it across as many commits as it needs.

**Cross-phase partial implementations:** If a task intentionally leaves
something incomplete because a later phase will finish it, annotate both
ends explicitly using the `Partial-until:` and `Completes:` fields defined
in the Task Body Template. Do not leave cross-phase partial implementations
implicit.

---

## Phase Setup Task Template — `[ ] Task X.0 — Phase X Setup`

Generate this task as the **first task of a phase** only if a task in that
phase requires a human-only prerequisite (per the human-only test in "Agent
tasks vs. human tasks") that **cannot** be done at Pre-flight Setup because
it depends on something the build produces mid-way. Anything that can be
done up front belongs in Task 0.0 instead; anything the agent can do itself
belongs in an agent task. If neither applies, omit X.0 entirely.

X.0 is always a `[MANUAL TASK]`. The executor does not code it — it
presents the steps to the human, waits, verifies what it can, and marks it
`[x]` before any Phase X coding task runs.

X.0 is the only task numbered X.0 in a phase. The tech debt and stability
review that formerly occupied this number is now part of the coding agent's
session pre-flight routine (see `.cursor/rules/06-agent-behaviour.mdc` §0)
and does not appear in the roadmap.

```
[ ] Task X.0 — Phase X Setup

  [MANUAL TASK — the agent walks the human through these steps, then marks
  this task complete when the human reports back]
  Estimated time: [N] minutes
  Why not in Pre-flight Setup: [one line — which mid-build artifact this
  depends on. E.g.: "the webhook endpoint URL only exists after Task
  (X-1).2 deploys."]

  Steps for the human, in order (plain language — no jargon):

  1. [E.g. In the Stripe website, click "Developers", then "Webhooks",
     then "Add endpoint". In the URL box, paste exactly:
     https://yourdomain.com/api/webhooks/stripe]
  2. [E.g. Stripe now shows a "Signing secret" — click "Reveal" and copy
     it. In the Supabase dashboard, open Vault, click "New secret", name
     it STRIPE_WEBHOOK_SECRET, paste the value, and save. Never paste the
     secret into this chat.]

  When you have finished, reply "done".

  The agent then verifies: [only agent-verifiable checks — e.g. "the
  Vault secret exists (via the Supabase MCP)", "a Stripe test event
  reaches the endpoint"] — and marks this task complete.
```

---

## UAT task rule — risk-based, two surfaces

UAT is split by **risk**, not by phase. There are two surfaces, and each
surviving human check belongs to exactly one:

1. **Per-phase Critical Gate (`X.98`)** — a human-only check that a _later
   phase depends on_. It gates the phase: the next phase cannot safely build
   until it passes. Generate an X.98 for a phase **only** when at least one
   such gate exists. A phase with no critical human-only gate has **no X.98** —
   its last coding task ends the phase, and the owner is not interrupted.
2. **End-of-roadmap Final UAT** — every non-gating human check (subjective
   visual/brand quality, "does this feel right", polish sign-off, and any
   real-inbox or human-dashboard check nothing downstream depends on)
   accumulates here and is done in a **single sitting** at the end of the
   roadmap. See "Final UAT" below.

Both surfaces are `[MANUAL TASK]`s — never coding-agent prompts — written so a
non-technical owner can complete them with the running app open and no other
documentation. They have no complexity flag, no dependencies field, and no
batch group field. The owner reports each result in chat; the executor owns the
checkbox (see the completion flow in "Agent tasks vs. human tasks").

**Automation-first, before either surface: a UAT check exists only where
automation cannot reach.** Before writing any check, ask whether a Playwright
E2E test (or the agent via MCP/CLI) could verify it. If yes, it is not a UAT
check — it is an E2E test the feature task itself must ship (extending
`apps/web/e2e/smoke.spec.ts`, per the Definition of Done). What survives is
human-only: subjective visual and brand quality, a real email or SMS arriving
in a personal inbox, third-party dashboard states behind human-only logins, and
the overall "does this feel right" sign-off. Data creation, persistence, RLS
isolation, navigation, and validation flows are all Playwright territory.

**Is this a critical gate?** A surviving human-only check is an X.98 gate only
if a _later phase's tasks depend on it_ — they read the data, table, RLS
policy, route, or externally-delivered artifact it verifies. If nothing
downstream depends on it, it is not a gate: it goes to the Final UAT. When in
doubt, it is **not** a gate — over-gating reintroduces the per-phase
interruptions this model exists to remove.

At the end of a phase's task list, append the X.98 gate task only if the phase
has one; a phase with no gate simply ends after its last coding task. After the
last phase, append the single Final UAT. Both are defined below.

---

## Per-phase Gate Template — `[ ] Task X.98 — Critical Gate: [Phase name]`

Generate this task **only when the phase has a critical human-only gate** (per
the UAT task rule). Fill it with the gate checks derived from the PRD sections
cited in this phase's tasks. Every check here is critical by definition — there
is no Standard tier on this surface; polish goes to the Final UAT. Apply the UAT
generation rules that follow.

```
[ ] Task X.98 — Critical Gate: [Phase name]

  [MANUAL TASK — the agent presents these checks to the human, collects the
  results in chat, and marks this task complete]
  Estimated time: [N] minutes ([N gate checks] × ~60s, rounded up to nearest 5)

  Sign in before starting. Use a test account with the [role] role unless
  a check specifies a different role.

  These are gate checks: the next phase does not begin until every one passes.

  ── If a check fails ──────────────────────────────────────────────────
  Report the failure in chat in plain language:
    "Task [X.X] gate failure: [describe what you saw vs. what was expected]"
  The agent fixes it (new branch + PR), then asks you to re-check. The
  agent will not mark this task complete, and will not begin the next phase,
  until every check is reported passing.
  ──────────────────────────────────────────────────────────────────────

  - 🚫 [Real-inbox gate a later phase depends on — e.g.:
    Sign up with a real email address you can receive mail at. Confirm the
    confirmation email arrives in your inbox (not spam), and that clicking
    its button signs you in. (Phase [X+1]'s invite flow depends on this.)]
  - 🚫 [Human-only dashboard gate — e.g.:
    In the Stripe dashboard, open Payments and confirm the £1,250.00 test
    payment from the previous step is listed as "Succeeded".]

  When you have been through every check, reply with the results.

  The agent then marks this task complete — only once every check is
  reported passing.
```

---

## Final UAT — end-of-roadmap polish review

After the last phase, append **one** roadmap-level task that
collects every deferred non-gating human check into a single sitting. It is the
mirror image of Pre-flight Setup (Task 0.0): Pre-flight opens the roadmap with
the one setup sitting; the Final UAT closes it with the one polish sitting. It
runs against the fully-assembled production site and is the **last `[ ]` task in
the roadmap** — once it is `[x]`, the executor runs roadmap close-out
(`docs/EXECUTOR_PROMPT.md` step 8).

Build its checks by walking every phase's cited PRD sections and pulling the
human-only checks that were _not_ gates: subjective visual/brand quality,
end-to-end "does this feel right" journeys, and any real-inbox or human-only
dashboard confirmation nothing downstream depended on. Apply the automation-first
filter first (anything a test could do is already a test), then keep only the
checks most likely to reveal product flaws — aim for 6–12 across the whole
roadmap, not one per feature.

```
[ ] Final UAT — [Roadmap name]

  [MANUAL TASK — the agent presents these checks to the human, collects the
  results in chat, and marks this task complete. This is the roadmap's last
  task; when it is [x], the roadmap is complete.]
  Estimated time: [N] minutes ([N checks] × ~45s, rounded up to nearest 5)

  Sign in before starting. Test on the live production site.

  ── If a check fails ──────────────────────────────────────────────────
  Report it in chat in plain language:
    "Final UAT: [describe what you saw vs. what you expected]"
  The agent fixes it (new branch + PR) and asks you to re-check. The agent
  marks this task complete only when every check is passing or explicitly
  deferred with a reason noted.
  ──────────────────────────────────────────────────────────────────────

  ### Look & feel
  - [Visual/brand check — e.g.:
    Open /customers and judge the page against the brand: spacing, colours,
    and typography look right, nothing feels misaligned or off-brand.]

  ### Key journeys
  - [End-to-end feel check — e.g.:
    Click through creating, editing, and deleting a customer as a new user
    would. Report anything confusing, slow, or broken-feeling.]

  ### Delivered artifacts (only if not already a gate)
  - [Real-inbox / dashboard check nothing downstream depended on — e.g.:
    Confirm the welcome email renders correctly in your inbox.]

  When you have been through every check, reply with the results.
```

---

## UAT generation rules

These apply when generating a per-phase X.98 gate **or** the Final UAT:

0. **Automation-first filter (apply before all other rules).** Drop every
   candidate check that a Playwright E2E test or the agent (MCP, CLI) could
   perform — those ship as tests inside the feature tasks, not as UAT
   checks. What survives is human-only: real-inbox delivery, human-only
   dashboards, subjective visual/brand quality, and key-journey sign-off
   on the live site.

1. **Route each surviving check by risk.** A check is a per-phase X.98 gate
   only if a _later phase depends on it_ (it reads the data, table, RLS
   policy, route, or delivered artifact the check verifies); otherwise it
   goes to the Final UAT. When in doubt, send it to the Final UAT — a phase
   with no downstream-blocking check gets no X.98 at all.

2. **Every check is derived from PRD sections already cited in the roadmap.**
   For an X.98, use the sections cited in that phase's tasks; for the Final
   UAT, walk every phase. Do not use placeholder text — every field name,
   button label, route, role name, and test value must come from the actual
   PRD.

3. **Write labels as the user sees them in the UI,** not as DTO keys or
   database column names. Use "Company Name", not `companyName` or
   `company_name`.

4. **Use realistic test values** in create/edit flows. Invent
   domain-appropriate data (e.g. "Waverly & Sons", "£1,250.00", "14 March
   2026"). Never use "test", "foo", "string", or "123".

5. **Omit any section that has no applicable checks.** An empty section is
   worse than no section — it signals there's something to check when there
   isn't.

6. **Estimate time:** X.98 gate checks at ~60s each; Final UAT checks at
   ~45s each. Round up to the nearest 5 minutes.

7. **Keep each surface short.** An X.98 gate is usually 1–3 checks (only the
   genuine downstream dependencies). The Final UAT aims for 6–12 checks
   across the whole roadmap — pick the checks most likely to reveal product
   flaws, not one per feature. A long list signals automatable checks leaked
   in. Combine related observations into single checks where possible.

8. **When a mutation check does appear, it must include "without a manual
   page refresh"** when verifying the record appears in a list after
   mutation. This is the single most common post-mutation bug.

---

## No per-phase summary task

Do **not** generate a `Task X.99` or any per-phase "Phase Complete" / summary
task. Phases end after their last coding task (or their X.98 gate, if they have
one). The bookkeeping the old sentinel did is covered continuously and needs no
PR of its own:

- **Spec sync** (PRD, DATA_CONTRACT, DESIGN_TOKENS) rides **every task's** Active
  Memory Update — the contract never lags the code by even one task.
- **`docs/AI_STATUS.md`** is updated by each task as it completes.
- **The delivery record** — what shipped, what was descoped, which specs moved —
  is written **once at close-out**, when the finished roadmap is archived to
  `docs/roadmaps/` (`docs/EXECUTOR_PROMPT.md` close-out step). Not per phase.

This removes one product-less PR per phase — the single largest source of roadmap
overhead.

---

## Finishing the roadmap

Do not generate execution prompts for individual tasks — the executor
reads each phase from `docs/ROADMAP.md` and runs it (see
`docs/EXECUTOR_PROMPT.md`). Do not add padding. Write the roadmap to
`docs/ROADMAP.md`. After writing, run the Pass 2 validation below against
the file you just wrote. If Pass 2 surfaces any misses, fix them in place
and re-run Pass 2 until it passes clean. Then stop.

---

## Pass 2 — Coverage Validation

Once the roadmap is complete, perform the following validation pass against
the PRD and `docs/DATA_CONTRACT.md` you read at intake. This is a structural
check only — do not derive schemas, extract rule summaries, or invent field
lists. The coding agent derives all of that at execution time from the PRD
and the live codebase.

For every `[ ]` task in the roadmap you just produced:

1. **PRD heading check:** Confirm that the section heading in the task's
   `PRD ref` field exists verbatim in the PRD. A heading that was
   paraphrased, abbreviated, or invented counts as a miss.

2. **Entity inventory check:** Confirm that every entity this task creates
   or modifies is listed in the Domain Entity Inventory section of
   `docs/DATA_CONTRACT.md`. An entity is covered if it appears by name in
   any domain's inventory with its relationships and tenancy ownership
   stated. A domain heading that merely _sounds related_ is not sufficient
   — the specific entity name must be present. Also confirm that any
   business constraints or state machines relevant to this task are
   captured in the inventory.

3. **Route registry check:** If the task introduces a new UI route or a
   mutation that requires `revalidatePath()`, confirm that the route
   appears in the API Route Registry section of `docs/DATA_CONTRACT.md`.

Then run three structural audits over the whole file:

4. **Checkbox audit:** Exactly one `[ ]` per task, on the task heading, and
   no checkbox syntax anywhere else in the file. Any `- [ ]` inside a task
   body (manual steps, UAT checks, pre-flight items) is a miss — convert it
   to a plain bullet.

5. **Manual-task audit:** Every step inside every `[MANUAL TASK]` passes
   the human-only test ("Agent tasks vs. human tasks"). A step the agent
   could perform or verify itself (env-var checks, dashboard state the MCP
   or a CLI can read, sending test data) is a miss — move it into an agent
   task or the manual task's "the agent then verifies" line. Also confirm
   each X.0 states why its items could not live in Pre-flight Setup. UAT
   checks must survive the automation-first filter — a check a Playwright
   test could perform is a miss: move it into the feature task's E2E tests.
   Confirm UAT routing: each per-phase X.98 holds only gate checks a _later
   phase depends on_ (a phase with none has no X.98), and every non-gating
   human check lives in the single end-of-roadmap Final UAT.

6. **Fragmentation calibration:** Over-splitting is the primary failure mode —
   there is **no** target task count and no per-PRD-section anchor to hit. For
   each coding task (every `[ ]` task except 0.0, X.0, X.98, and the Final UAT),
   ask: with auto-merge and no human review, does this being its own PR buy any
   isolation the reader would gain, or is it a fragment of one coherent concern?
   Flag as a fragment miss — and merge — any of:
   - Two tasks that apply the **same logical change to different surfaces,
     modules, or call sites** (e.g. one fix to POA then the same fix to
     corporate) — merge into one task.
   - Tasks that split a **batch of related fixes in one subsystem**, or a
     **refactor's coupled steps**, across multiple PRs — merge.
   - A task matching the "too small" tests in `05-vertical-slice.mdc` (no full
     slice, a lone field or config change, a Goal statable in under 10 words) —
     merge into its feature's task.
     Flag as a split miss only a task that bundles genuinely **unrelated** concerns
     (no shared screen, flow, entity, or subsystem) or that one run cannot build
     and verify green. Also confirm feature tasks are batched into few phases, and
     that no per-phase summary/`X.99` task exists.

Output the validation results using this exact format. Do not output the
full roadmap again — output the gap report only.

```
## Coverage Validation

**PRD heading misses:**
- Task [X.X] — `PRD ref` heading "[heading as written]" not found in PRD.
  Nearest match: "[closest actual heading]" — update the PRD ref to match, or
  add the missing section to the PRD before execution begins.
- [or "None"]

**Entity inventory gaps:**
- Task [X.X] — Entity `[entity_name]` is not listed in any Domain Entity
  Inventory section. Add it to the appropriate domain in DATA_CONTRACT before
  execution begins.
- Task [X.X] — Entity `[entity_name]` is listed but its [relationship to X |
  tenancy ownership | state machine] is not captured. Extend the inventory entry.
- [or "None"]

**Route registry gaps:**
- Task [X.X] — Route `[/path]` is not listed in the API Route Registry.
  Add it to DATA_CONTRACT before execution begins.
- [or "None"]

**Checkbox violations:**
- Task [X.X] — nested checkbox found in the task body; converted to a plain bullet.
- [or "None"]

**Manual-task violations:**
- Task [X.X] — step "[step]" is agent-performable; moved to [agent task / the
  "agent then verifies" line].
- [or "None"]

**Fragmentation misses:**
- [N] coding tasks total.
- Task [X.X] & [X.Y] — same change across surfaces/modules ([what]); merged into one task.
- Task [X.X] — fragment ([too-small test it matches]); merged into Task [X.Y].
- Task [X.X] — bundles unrelated concerns "[A]" and "[B]"; split into one per concern.
- [or "None"]

**Summary:** [N] PRD heading misses, [N] entity inventory gaps, [N] route registry gaps, [N] checkbox violations, [N] manual-task violations, [N] fragmentation misses.
[If all are zero: "Roadmap is fully covered. Safe to execute."]
[If any gaps exist: "Resolve the gaps above before execution begins. Entity inventory and route registry gaps must be added to DATA_CONTRACT.md."]
```

Since the data contract is itself built as a foundation phase of this
roadmap, run Pass 2 after that phase's contract exists — either against the
committed `docs/DATA_CONTRACT.md` if it is already in place, or as the
final step once the contract phase has produced it. Any gap Pass 2 surfaces
is resolved by amending `docs/DATA_CONTRACT.md` (for entity/route gaps) or
`docs/PRD.md` (for heading misses), not by loosening the roadmap.
