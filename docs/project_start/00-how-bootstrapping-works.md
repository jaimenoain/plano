# How This Project's Bootstrapping System Works

> **Audience:** Anyone — human, Claude Design, or Claude Code — being asked to
> improve, extend, or modify the planning documents in this project. Also
> future-me, six months from now, wondering why I made these choices.
> **When to use:** Read this first, at project start, before you touch any of
> the guides in `docs/project_start/`. Apply the decision rules at the bottom
> before you add to any of them. Most "improvements" to this system make it
> worse.

This project's planning knowledge is split across three places — the
**reference guides** in `docs/project_start/` that walk you through starting a
new project, the long-lived **artefacts** in `docs/` that hold the actual
specification, and the always-on **rules** in `.cursor/rules/` that govern
every task forever. Before you add to any of them, read this doc.

---

## The shape of the system

There are three categories of artefact in this project, and they do different
jobs.

### 1. Reference guides (`docs/project_start/`) — read at project start

The guides walk you through setting up a new project from a rough idea. They
are read **once per project, in order**, at the start. After the walking
skeleton ships and the first feature slice begins, they are largely done: the
artefacts and the always-on rules carry all ongoing feature work. The guides
are not consulted while building features in month four.

> **Note for readers with old muscle memory:** this folder used to be a
> paste-once "gem" pipeline — ~21 numbered prompts (tagged `-CHAT-`, `-CODE-`,
> `-MANUAL-`) that you pasted, in order, into a chat or code editor to
> bootstrap a project. That pipeline has been converted into the reference
> documentation you're reading now, regrouped by audience. If you're looking
> for a gem by its old number, the map below tells you where its content went.

The guide set:

| Guide                                                                | Who reads it                 | What it covers                                                                                                                                                                            |
| -------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/project_start/00-how-bootstrapping-works.md`                   | everyone                     | This meta-README: the mental model and the decision rules.                                                                                                                                |
| `docs/project_start/01-writing-the-prd.md`                           | Claude Code (human optional) | How to produce `docs/PRD.md` — business rules, user flows, edge cases, the full-lifecycle completeness checklist, and the agent-led interview that drafts it and declares it build-ready. |
| `docs/project_start/02-briefing-claude-design.md`                    | human → Claude Design        | How to brief Claude Design and the exact **output spec** it must hand back (the package, the prototype, and the design docs).                                                             |
| `docs/project_start/03-inserting-the-design.md`                      | human + Claude Code          | How to place Claude Design's output into the repo and wire it into the rules.                                                                                                             |
| `docs/project_start/04-writing-the-roadmap.md`                       | Claude Code                  | How to produce `docs/ROADMAP.md` and build the product from it.                                                                                                                           |
| `docs/project_start/build-reference/prd-prototype-reconciliation.md` | Claude Code                  | How to reconcile the prototype against the PRD (the roadmap's first build phase).                                                                                                         |
| `docs/project_start/build-reference/data-contract.md`                | Claude Code                  | How to produce `docs/DATA_CONTRACT.md` (the roadmap's data-contract phase).                                                                                                               |
| `docs/project_start/build-reference/scaffold.md`                     | Claude Code                  | How to build the walking-skeleton scaffold (the roadmap's scaffold phase).                                                                                                                |
| `docs/project_start/build-reference/auth.md`                         | Claude Code                  | How to build auth: spec, preflight, build, and doctor (the roadmap's auth phase).                                                                                                         |

The guides are documentation, not codebase specifications. They describe
procedures for producing specifications. The specifications themselves — the
PRD, the contract, the tokens — are the artefacts.

### 2. Rules (`.cursor/rules/*.mdc`) — project-lifetime

The rules govern every coding-agent task **for as long as the project exists**.
They are the universal constraints that any feature must respect, regardless of
which feature it is or when it's built.

The rule files are organised by domain:

- `.cursor/rules/00-architecture.mdc` — stack, monorepo structure, forbidden patterns
- `.cursor/rules/01-database.mdc` — schema, RLS discipline, naming, route collision
- `.cursor/rules/02-api.mdc` — Server Actions, DTOs, runtime, service-role discipline
- `.cursor/rules/03-frontend.mdc` — components, tokens, state machines, layout
- `.cursor/rules/04-auth.mdc` — `getUser()` mandate, exclusion zone, provisioning
- `.cursor/rules/05-vertical-slice.mdc` — slice methodology, granularity, sequencing
- `.cursor/rules/06-agent-behaviour.mdc` — pre-flight checks, challenge protocol, spec-vs-reality, AI_STATUS discipline
- `.cursor/rules/07-brand-voice.mdc` — brand copy conventions (created from the design package, augmented from the prototype)

Some rules use `alwaysApply: true`; others auto-attach via glob patterns.
Either way, the coding agent reads them automatically — they are not pasted
into prompts. The rules are present and enforced from day one, including during
bootstrap.

### 3. Artefacts — the project's actual specification

The bootstrapping work _produces_ artefacts. The artefacts are what the coding
agent reads during ongoing development:

- `docs/PRD.md` — business rules and user flows
- `docs/DATA_CONTRACT.md` — entity inventory, RLS notes, route registry
- `docs/DESIGN_TOKENS.md` — concrete token values (produced by Claude Design; see below)
- `docs/COMPONENT_SPEC.md` — component-token assemblies (produced by Claude Design)
- `docs/ROADMAP.md` — the phased feature roadmap, read by the executor one phase at a time
- `docs/AUTH_SPEC.md` — the bound, fully-sourced auth values; the auth build and the auth doctor read it in place of an interview
- `docs/AI_STATUS.md` — running record of what's been built; updated every task; the agent reads this at the start of every session
- `docs/PRD_RECONCILIATION.md` — the audit trail of how each prototype-surfaced signal was resolved. An audit/handoff record rather than a spec the agent reads during feature work, but it lives alongside the others.
- `design-system/` — the Claude Design package. Contains a brand brief (`README.md`), an agent skill manifest (`SKILL.md`, user-invocable for prototype/mock work), the source-of-truth token CSS (`colors_and_type.css`), brand assets (`assets/`), preview cards (`preview/`), and two UI kits (`ui_kits/app/` and `ui_kits/marketing/`). Read-only reference. The canonical token implementation lives in `tailwind.config.ts`; the canonical components live in the web app's component library. When `design-system/` and the implementation disagree, the implementation wins — the disagreement is a bug, not a reconciliation question.
- `reference/prototype/` — the Claude-generated prototype of the product applied to the brand (one `.jsx` per screen, a refined `*-tokens.css`, a layout shell CSS, an HTML entry point, a `screenshots/` directory, a `SCREENSHOTS.md` index, and a `SCREEN_MANIFEST.md` mapping each screen file and screenshot to the PRD screen/flow and state it depicts). Registered in the frontend rules' visual reference hierarchy and read by feature agents for visual reference; read-only, and never copied into shipping code.

These are the documents the agent consults during feature work. The guides that
walked you through producing them are not consulted at that stage.

---

## The workflow, in six steps

The tested workflow moves from a written idea to a built product in six steps.
Each step points to the guide that covers it.

> **This list is the rationale.** The instructions the human actually follows are
> the **Start here** section of the root `README.md`, which covers the same
> artefact-producing steps in the same order, plus two that produce no artefact
> (wiring up Vercel/Supabase/GitHub, and naming the app). Those two are mostly
> agent work now: the human creates accounts and pastes secrets, and the coding
> agent applies the GitHub settings and the app name/description on request (see
> `build-reference/repo-settings.md`). If you reorder the steps here, reorder
> them there too.

1. **Write the PRD.** From the owner's rough brief, the coding agent runs a
   plain-English interview and drafts `docs/PRD.md` — the pure product spec:
   business rules, user flows, edge cases, no technical decisions — then declares
   it build-ready against the §4 completeness gate (recorded in a Build-Ready
   Declaration block at the foot of the file, which Step 2 checks for). The owner
   can hand-write it instead. See `docs/project_start/01-writing-the-prd.md`.
2. **Brief Claude Design.** Feed the PRD into Claude Design to create a
   prototype. The brief and the exact output spec Claude Design must return —
   the package, the prototype, and the design docs (`docs/DESIGN_TOKENS.md`,
   `.cursor/rules/07-brand-voice.mdc`, `docs/COMPONENT_SPEC.md`) — live in
   `docs/project_start/02-briefing-claude-design.md`.
3. **Refine the prototype.** Iterate on the prototype inside Claude Design
   until it represents the product you want to build.
4. **Ask Claude Design to prepare files + docs.** Have Claude Design export the
   package, the prototype, and the design docs in the shapes the repo expects.
   The output spec in `docs/project_start/02-briefing-claude-design.md` is what
   makes these files drop in cleanly.
5. **Insert Claude Design's output into the repo.** Dump the whole bundle into
   the `intake/` folder; Claude Code sorts each artefact to its canonical home
   (`design-system/`, `reference/prototype/`, the design docs) and wires
   everything into the rules — you never have to know which folder goes where
   (ADR-0023). A design doctor (`npm run design:doctor`) then validates the
   sorted artefacts — spacing scale and token vocabulary — before any rule files
   are generated, so deviations get a paste-back fix while the design session is
   still warm. See `docs/project_start/03-inserting-the-design.md`.
6. **Ask Claude Code to write the ROADMAP, then build.** Claude Code writes
   `docs/ROADMAP.md` from the PRD, the design docs, and the prototype, then
   builds the product following it. See
   `docs/project_start/04-writing-the-roadmap.md`.

**Claude Design now produces the design docs.** In the retired flow, repo-side
gems generated `docs/DESIGN_TOKENS.md`, the brand-voice rule, and
`docs/COMPONENT_SPEC.md`. In the new flow Claude Design produces all three
(alongside the package and the prototype) for direct insertion. Note the
source-of-truth hierarchy this preserves: `docs/DESIGN_TOKENS.md` remains
**documentation truth**, but Claude Code implements `tailwind.config.ts` from
it during the scaffold, and the implementation is **implementation truth** —
on any disagreement between the two, the implementation wins.

### The build phases live inside the roadmap

Contract, scaffold, and auth are no longer separate pre-steps. They are the
roadmap's **opening build phases**, in this order:

```
prototype ↔ PRD reconciliation   → build-reference/prd-prototype-reconciliation.md
  → data contract                → build-reference/data-contract.md
  → walking-skeleton scaffold    → build-reference/scaffold.md
  → auth build                   → build-reference/auth.md
  → then the feature slices
```

Each opening phase points to its own `build-reference/*.md` doc so the detailed
knowledge — formats, RLS rules, the auth doctor sequence — survives folding
into the roadmap. `docs/project_start/04-writing-the-roadmap.md` states this
ordering explicitly; the `build-reference/` docs carry the detail.

**Reconcile before the contract.** Reconciliation runs first, before the
contract, because the prototype is generated _from_ the PRD — so anything it
shows that the PRD never stated is a sign the PRD was underspecified. The
reconciliation pass reads the prototype as evidence, harvests every
product-relevant signal it shows that the PRD never stated, classifies each
(defaulting to exclude), and **routes** confirmed gaps back through the PRD
before the contract is built. This keeps the trace-to-PRD discipline intact:
a prototype-surfaced need becomes a PRD fact before it can become a contract
fact — prototype → PRD → contract, never prototype → contract. See
`docs/project_start/build-reference/prd-prototype-reconciliation.md`.

---

## How the three categories relate

Picture three layers, arranged from short-lived to long-lived:

```
    REFERENCE GUIDES (project start)   →   ARTEFACTS (project-lifetime)
    01-writing-the-prd.md              →   docs/PRD.md
    02-briefing-claude-design.md       →   design-system/  +  reference/prototype/
                                       →   docs/DESIGN_TOKENS.md  +  docs/COMPONENT_SPEC.md
    03-inserting-the-design.md         →   rule registrations  +  .cursor/rules/07-brand-voice.mdc
    04-writing-the-roadmap.md          →   docs/ROADMAP.md
    build-reference/data-contract.md   →   docs/DATA_CONTRACT.md
    build-reference/auth.md            →   docs/AUTH_SPEC.md
                                                      ↓
                                            read at every task by:
                                                      ↓
                                          RULES (project-lifetime)
                                          .cursor/rules/*.mdc
```

The reference guides are read at project start and then set aside. The
artefacts and rules are permanent. When the agent is building a feature in
month four, it reads the artefacts and the rules — never the guides.

This split is deliberate. It's also the one thing most likely to be "improved"
into a worse state by someone who doesn't understand it.

---

## The balance: not micromanaging, not under-specifying

The system is designed around a specific balance that took several iterations
to find. Read this section before changing anything.

### What goes wrong when there's too much guidance

Coding agents (Claude Code and others) perform worse when the prompt prescribes
implementation details — file paths, function names, the exact order of
operations inside a function, which utility class to use where. Excess
prescription:

- Fights the agent's natural problem-solving flow
- Adds context that doesn't change correctness but uses tokens
- Goes stale faster than the codebase changes
- Trains the user to write longer prompts, which makes the cycle worse

Earlier versions of this system prescribed too much. The instructions felt
authoritative but produced fragile output. Stripped-down instructions produced
better code.

### What goes wrong when there's too little guidance

But "less prescription" is not the same as "no structure." When the agent is
given only a feature description, it has to assemble its own context from the
codebase mid-task: which entities exist, what RLS patterns are in use, which
PRD rules apply. It does this inconsistently. The failure modes are:

- Schema drift — code references columns that don't exist in the DB
- RLS denials — policies that compile but reject legitimate operations at runtime
- PRD drift — features that work but don't match what the PRD said
- Reinventing helpers that already exist
- Inventing fields that have no source of truth

These are exactly the bugs the rules and the artefacts exist to prevent.

### The principle

> **Tell the agent _what_ the truth is and _where the boundaries are_. Don't
> tell it _how_ to write the code.**

Two examples make the line clear:

| Type 1 — Implementation prescription (avoid) | Type 2 — Context assembly (good)                             |
| -------------------------------------------- | ------------------------------------------------------------ |
| "Use `useState` here, then a `useEffect`"    | "These three PRD rules govern this task"                     |
| "Name this file `customer-list.tsx`"         | "This entity isn't in the contract — add it before building" |
| "Use `revalidatePath` not `router.refresh`"  | "Service-role usage requires an entry in DATA_CONTRACT.md"   |
| Telling the agent _how_                      | Telling the agent _what_ and _where_                         |

The rules are Type 2. The artefacts are Type 2. The reference guides are mostly
Type 2 — they used to contain more Type 1 content, and that content was either
deleted or moved into rules where it's enforced automatically rather than
restated per task.

### Why some content was moved into the rules

Earlier versions contained universal rules baked into task descriptions:
"always use `getUser()` not `getSession()`," "every authenticated layout must
use `cache: 'no-store'`," "every RLS predicate must use the sub-select form."

These are real rules and they must be enforced. But they belong in
`.cursor/rules/` where the agent reads them on every task automatically.
Restating them inside task descriptions had two costs:

1. **Drift.** Two copies of the same rule will diverge. When they disagree, the
   agent has to decide which to follow.
2. **Noise.** Long task descriptions with embedded rule-restatements crowd out
   the project-specific instructions, which is what the task is actually for.

So each guide now references the relevant rule file ("see
`.cursor/rules/04-auth.mdc` § Auth Exclusion Zone") instead of restating the
rule. The cross-reference is explicit so future readers know where the content
lives.

If you find yourself writing a rule into a guide, stop. The rule probably
belongs in `.cursor/rules/`. See the decision rules below.

---

## Why the start of a project is different

These guides exist because **the start of a project is genuinely different from
the rest of it.**

At the start, there is little implementation context yet. There is no
`docs/DATA_CONTRACT.md` to read. There are no migrations to grep. The agent
cannot derive context from the live system because the live system doesn't
exist yet. The `.cursor/rules/` constraints are present and active from day
one, but bootstrap-specific decisions must be stated explicitly rather than
discovered.

That's why the guides are heavy and the rules are lighter. Once bootstrap is
done — walking skeleton shipped, auth wired, first feature live — the artefacts
and the codebase carry the context. The agent can grep, read, and infer. Heavy
upfront prompts become counterproductive.

This is also why the guides are read at project start and then set aside. They
are not a recurring tool for feature work. The always-on rules and the
artefacts are what carry ongoing development. The one class of exception is the
verification/diagnostic material in `docs/project_start/build-reference/auth.md`
— the auth preflight is re-run after each precondition fix until it passes, and
the auth doctor is an on-demand diagnostic run whenever auth misbehaves. These
verify or repair rather than generate, so re-running them is safe by design.

---

## Decision rules for future improvements

When you're tempted to change something in this system, run through these in
order. Stop at the first one that applies.

### 1. Are you adding a rule that should apply to every feature forever?

If yes, it goes in `.cursor/rules/`. Not in a guide, not in an artefact. The
rule files are alwaysApply or auto-attach by glob — the agent reads them
automatically. Restating a rule inside a guide creates two copies that will
drift.

**Test:** Will a feature task in month six need this rule? If yes → rules file.

### 2. Are you adding a project-specific decision?

If yes, it goes in an artefact (`docs/DATA_CONTRACT.md`, `docs/DESIGN_TOKENS.md`,
`docs/PRD.md`). Not in a guide. The artefacts are what the agent reads during
ongoing work.

**Test:** Would this same content differ between two projects using this same
toolchain? If yes → artefact.

### 3. Are you adding project-start-only procedure?

If yes, it goes in a reference guide. Phase structure, git tags, manual
checkpoints, conflict pre-checks, interview questions, scaffolding order — all
guide territory.

**Test:** Will this run exactly once, at the start of the project? If yes →
reference guide.

### 4. Are you about to prescribe how the agent should write code?

If yes, stop. Don't add it. Type 1 prescription degrades agent performance.
Restate the _what_, not the _how_. If you can't see how to express the
constraint as a what (an entity, a boundary, a fact the agent must respect),
you're probably trying to micromanage.

**Test:** Could the same instruction be replaced with "the agent will figure
this out from the codebase"? If yes → don't add the instruction.

### 5. Are you tempted to "improve" a slim guide that looks incomplete?

The slim guides are slim deliberately. The content you think is missing has
been moved to the rules and is enforced automatically. Before adding content,
search `.cursor/rules/` for the topic. If it's there, the guide is correct
as-is. If it's truly missing from both, decide which place it belongs in
(rule 1 vs rule 2 above) and put it there — not in the guide.

### 6. Are you adding human-review steps?

The user of this system is non-technical. Manual review of code, schemas, or
RLS policies is not a useful safety net for them — they can't act on what they
see. Prefer agent-led self-verification: greps, builds, smoke tests,
anchor-string checks. Reserve human intervention for things only the human can
do (UAT in a real browser, SMTP test email, final yes/no on splits or merges).

**Test:** Could an agent verify this autonomously? If yes → don't add a human
step.

---

## What this system does NOT cover

A few things are intentionally out of scope. If you're tempted to add them,
think hard first.

- **Designing the brand from scratch in-repo.** `docs/project_start/03-inserting-the-design.md`
  assumes the user has generated a Claude Design package externally and has the
  unzipped folder ready. The insertion step incorporates that folder; it does
  not interview the user about brand personality, colour palette, or type
  pairing. There is no half-step where the repo produces a design system from a
  written brief — that's what Claude Design is for
  (`docs/project_start/02-briefing-claude-design.md`).
- **Designing every screen in the prototype.** The prototype covers the happy
  path of the main product screens; it does not require coverage of every
  screen described in `docs/PRD.md`. The prototype is typically **partial**, so
  the build must handle missing-screen fallback explicitly — the component spec
  and the design-package atoms cover screens the prototype does not render, and
  `reference/prototype/SCREENSHOTS.md` records which PRD screens are absent
  (its Coverage gaps section). There is no step that interviews the user to
  fill those gaps with synthesised screens — the absent screens are designed at
  implementation time using the tokens, the component spec, and the package
  atoms as reference.
- **Mobile.** The template is web-only
  (`docs/decisions/0005-mobile-removed-from-template.md`). Adding a native app is
  an opt-in step with its own guide
  (`docs/project_start/optional/adding-mobile.md`), and it requires a separate
  rule set for the React Native Supabase client and EAS builds. Don't extend the
  existing rules to mobile until that ruleset exists.
- **Production deployment beyond Vercel/Supabase.** The toolchain assumes
  Vercel + Supabase + Resend. Other stacks need different rules and guides.
- **Post-launch operations.** Monitoring, analytics, and performance — not
  covered. The one exception is **error tracking**, which now ships in the
  template: env-gated Sentry that stays a complete no-op until a DSN is set
  (`docs/decisions/0008-production-error-tracking.md`). Beyond that, the system
  gets you to "feature works in production"; it doesn't cover what happens after.

---

## Durable conventions that live across the guides

These conventions are established at project start and enforced forever. They
are recorded here so this meta-README stays the single place that explains the
system's shape; the detail lives in the guide or rule cited.

- **Tailwind-native spacing scale.** The design tokens keep Tailwind's spacing
  scale unrenumbered (`10` = `40px`, never remapped); off-scale values get
  named tokens rather than renumbered indices. Constrained by
  `docs/project_start/02-briefing-claude-design.md`, verified during the
  scaffold (`docs/project_start/build-reference/scaffold.md`).
- **The `⚑ DATA IMPLICATION` flag and the PRD completeness checklist.** The PRD
  process flags where a product rule implies a data need, and runs a
  full-lifecycle completeness checklist over every entity. By default the coding
  agent drafts the PRD via a plain-English interview and must declare it
  build-ready against that checklist — recorded in a Build-Ready Declaration
  block — before it feeds Claude Design. See
  `docs/project_start/01-writing-the-prd.md`.
- **Trace-to-PRD reconciliation.** The burden of proof is on **adding**; the
  default is **exclude**. A prototype-surfaced need routes through the PRD, never
  straight into the contract. See
  `docs/project_start/build-reference/prd-prototype-reconciliation.md`.
- **RLS discipline.** Predicates use the sub-select form `(SELECT auth.uid())`;
  every operation gets its own policy; tenant isolation is shape-conditional;
  recursion is avoided via `SECURITY DEFINER` helpers; and RLS is always
  in-scope-or-explicitly-deferred in each task. See `.cursor/rules/01-database.mdc`
  and `docs/project_start/build-reference/data-contract.md`.
- **Auth shape and provisioning.** `/auth/callback` is inert; provisioning runs
  through the `on_auth_user_created` trigger plus a `SECURITY DEFINER`
  function; the code always uses `getUser()`, never `getSession()`; and the
  auth doctor probes the four surfaces that must agree in dependency order —
  claim → middleware → RLS → provisioning. See
  `docs/project_start/build-reference/auth.md` and `.cursor/rules/04-auth.mdc`.
- **Migrations applied by the agent.** The coding agent applies **every**
  migration itself via the Supabase MCP `apply_migration` tool — never a
  SQL-Editor hand-off to the human, never `supabase db push`. The project owner
  is non-technical and should never paste SQL into the Supabase dashboard. See
  `.cursor/rules/01-database.mdc` and `docs/project_start/build-reference/scaffold.md`.

---

## Final note for future agents

If you're reading this because someone asked you to improve, modify, or extend
this bootstrapping system: **the most likely correct answer is "don't, or do
less than you think."**

This system was built by removing things until it worked, not by adding things
until it felt complete. The slim guides, the cross-references, the rule files
doing the heavy lifting — these are the result of iteration. Reverting any of
those choices because a guide "looks thin" or "could be more authoritative" is
the most common way this system gets degraded.

If you genuinely need to change something, follow the decision rules above and
make the smallest possible edit. Then update this document to explain why.
