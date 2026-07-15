# Writing the PRD

> **Audience:** The coding agent drafting the product spec from the owner's
> brief (the default — see the **Agent-led drafting protocol** below), or a human
> writing it directly (step 1 of bootstrapping). Also usable by Claude Design and
> Claude Code to validate that a PRD is complete before they consume it.
>
> **When to use:** At the very start of a project, once you have a rough
> strategy brief or product idea and want to turn it into `docs/PRD.md` —
> the canonical source of truth for the product's scope, business rules,
> and user flows. This is the first artefact produced; everything
> downstream (the prototype, the design docs, the data contract, the
> scaffold, the roadmap) traces back to it.

The Product Requirements Document (PRD) is the single source of truth for
**what** the product does and **why**. It captures business rules, user
flows, and edge cases in enough detail that a developer — or a coding
agent — could build the product without asking a single clarifying
question about intended behaviour. The finished document lives at
`docs/PRD.md`.

This guide has five parts:

1. **What a PRD is and is not** — the scope boundaries.
2. **The completeness checklist** — the lifecycle stages every PRD must cover.
3. **The required block formats** — Permission Matrix, Happy Path, Business
   Logic, Edge Cases, and the `⚑ DATA IMPLICATION` flag convention.
4. **The self-review checklist** — how to audit a draft before it ships.
5. **A copy-pasteable template skeleton** — the block formats assembled into
   a starting point.

The default path to producing one is the **Agent-led drafting protocol** at the
end of this guide: the coding agent interviews the owner in plain English and
drafts the document to the standards in parts 1–5. Writing it by hand against
those same standards is fully supported.

The one question the whole document is answering:

> _If someone built this product using only this PRD, would they build the
> right thing without having to guess?_

---

## 1. What a PRD is — and what it is NOT

The PRD's domain is **business logic, rules, and functional user journeys**.
It describes the "What" (the functionality requirements) and the "Why" (the
design principles, user value, and business goals). It completely abandons
the "How" (technical implementation details). System architecture, database
design, and UI layouts are decided downstream by the coding agent and by the
`docs/DATA_CONTRACT.md` build.

### The "No Abstraction" rule

Do not use high-level, generic, or vague terminology like "standard
features," "user dashboard," "appropriate settings," or "smart matching." If
a feature or dashboard is required, list exactly _what_ elements are on it,
_what_ those settings are, and _how_ the underlying business rules govern
them. A vague term is a gap, not a spec.

### The "Not Your Job" rule — forbidden content

The PRD MUST NOT contain any of the following. These are decided elsewhere:

- **Data Models or ERDs.** No database schemas, tables, relationships, or
  foreign keys. (Storage _implications_ of a business rule — "is this a
  stored status or computed at read time?" — ARE in scope, because they are
  decisions about behaviour, not schema. See the `⚑ DATA IMPLICATION` flag
  convention in §3. The schema itself is built later, in
  `docs/project_start/build-reference/data-contract.md`.)
- **UI/UX screen layouts.** No wireframes, button placements, or visual
  layout decisions. The prototype and the design docs handle appearance; see
  `docs/project_start/02-briefing-claude-design.md`.
- **Tech stack recommendations.** No frameworks, libraries, or programming
  languages.
- **Open technical / architecture decisions.** No engineering debates (SQL
  vs. NoSQL, hosting environments, etc.).
- **Universal auth mechanics.** Sign Up, Log In, Forgot Password, Email
  Verification, the Member Invitation flow, the limbo-gate middleware, and
  member management screens are settled by the auth build; see
  `docs/project_start/build-reference/auth.md` and `.cursor/rules/04-auth.mdc`.
  Do NOT spec these as features unless the product explicitly deviates from
  standard behaviour. They are implementation decisions, not PRD decisions.

### The test the PRD must pass

> _If handed to a developer, do they have all the exact business rules and
> scope boundaries needed to confidently design the architecture without
> asking a single clarifying question about intended behaviour?_

---

## 2. The full-lifecycle completeness checklist

The PRD MUST cover the user's complete journey — from first landing on the
product to account deletion. It is easy to spec the exciting features and
skip the foundational lifecycle stages. The following items are
**project-specific** and MUST each be addressed. For every one, either
specify it as a fully-defined feature or record an explicit, one-line reason
it is not applicable. Silence on any of these is a defect.

| Lifecycle stage                      | What the PRD must state                                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Roles & permissions**              | What named roles exist, and exactly what each role can and cannot do. Every role becomes an actor in a Permission Matrix (§3).                                    |
| **Onboarding flow content**          | What information is collected during workspace or account creation, and what entities are initialised as a result.                                                |
| **Tenant cardinality**               | Can a user belong to multiple tenants simultaneously, or exactly one? This choice reshapes the whole permission and isolation model.                              |
| **Subscription & billing lifecycle** | Is there a paid tier, a trial, or is it free? What happens on expiry or cancellation — to the account, the data, in-flight work, and outstanding balances?        |
| **Account & tenant deletion**        | What triggers deletion, what data is retained and for how long, whether there is a recovery window, how cascades behave, and what happens to in-flight processes. |
| **Audit logging**                    | Is it required? If so, which actions must be logged, and who can view the log?                                                                                    |
| **Unauthenticated public surfaces**  | Which routes, if any, are accessible without logging in (marketing pages, public shares, invitation-accept links)?                                                |

**Decompose compound lifecycle questions.** A stage like "what happens on
cancellation" quietly bundles several distinct rules — the data, the users,
the billing, any outstanding tokens or credits. Do not answer it with a
single sentence. Break it into separate rules, one per sub-part, because a
compressed answer loses fidelity and propagates that loss downstream.
Worked example, for tenant deletion:

- Tenant deletion — cascade behaviour for contracts and their child records:
  hard-delete contracts and all linked obligations atomically.
- Tenant deletion — members whose only tenant was the deleted one: account
  remains active with zero memberships; route to a "no workspace"
  interstitial on next login.
- Tenant deletion — recovery window: none; deletion is final.
- Tenant deletion — in-flight jobs for that tenant: the worker verifies
  tenant existence on completion and discards results if the tenant is gone.

**What NOT to include here.** The universal auth mechanics listed in §1
(Sign Up, Log In, Forgot Password, Email Verification, Member Invitation)
are handled by the auth build, not the PRD. Do not spec them, and do not
raise them as open questions — they are already settled in
`docs/project_start/build-reference/auth.md`.

---

## 3. Required PRD block formats

For every distinct **feature** — a discrete user-facing capability such as
_Invitation Acceptance_, _Postcard Cancellation_, or _Subscription Upgrade_
(not a technical layer) — the PRD must carry the following blocks. They do
not need to sit together as a numbered template, and they do not need a fixed
order, but they MUST use the exact heading conventions below so that
downstream consumers can extract them by name. The data contract build reads
Permission Matrices; the roadmap and its build-reference docs read Happy
Paths; the data contract build reads `⚑ DATA IMPLICATION` flags.

> **Organise for coherence, label for retrieval.** Structure the document
> however best fits the product — whatever keeps related rules together
> rather than scattering them. Cross-cutting concerns (a credit system, a
> shared state machine, a B2B/B2C duality) should live in one coherent place
> with a one-line reference from each feature that touches it, not be
> shredded into per-feature fragments. What matters is not the outline but
> that every required block carries a clear, consistent heading. Do NOT use
> lazy umbrella headers (`Authentication`, `Settings`, `Misc`, `Other`) that
> hide multiple distinct flows under one vague label — each distinct flow is
> its own labelled block.
>
> **Test for a good structure:** reading the PRD cold, could you find every
> entity's permission rules in under a minute, and locate every rule that
> governs feature X without re-reading the whole document? If yes, the
> structure is fine.

### A. Context & Purpose

_Heading convention: prose, no special label. Place at the start of each
feature's discussion._

One sentence explaining strictly WHAT this feature does and the primary
value it delivers to the user or business.

### B. Permission Matrix

_Heading convention:_ `### Permission Matrix: <Feature Name>` _or_
`### Permission Matrix: <Entity Name>`. _The data contract build extracts
every block matching this heading pattern for its RLS Action Inventory;
deviating from it (e.g. "Roles & Permissions") will cause the block to be
missed._

Define exactly which actors can perform which operations on the entities
involved. Use a matrix — not prose. Multiple matrices can sit anywhere in
the document (next to the feature, grouped at the start, or both); what
matters is that every feature with non-trivial permission rules has one.

| Actor        | Create      | Read                  | Update                   | Delete      |
| ------------ | ----------- | --------------------- | ------------------------ | ----------- |
| Tenant Owner | ✅          | ✅ all rows           | ✅ all rows              | ✅ all rows |
| Admin        | ✅          | ✅ all rows           | ✅ all rows except owner | ❌          |
| Member       | ✅ own rows | ✅ all rows in tenant | ✅ own rows only         | ❌          |
| Guest        | ❌          | ✅ public rows only   | ❌                       | ❌          |

**Required precision:**

- Every cell is either ✅, ❌, or a single-line scope qualifier ("✅ own
  rows", "✅ rows where status='draft'", "✅ all rows except where
  role=owner"). No prose, no paragraphs.
- "Read" means rows **visible** to the actor — not "the actor can see this
  feature exists." A member who can see the customers list but not edit it is
  `Read: ✅ all rows in tenant, Update: ❌`, not "read-only access."
- If the feature has more than four CRUD operations (e.g. archive, send,
  approve, revoke), add a column for each. Do NOT collapse them into
  "Update."
- If a cell would need more than a single-line qualifier, the rule is too
  complex for the matrix — promote it to the Business Logic block as a named
  permission rule and reference it in the cell ("✅ per Rule R1").
- **The System / service-role convention.** When the matrix lists a `System`
  actor — a synthetic actor representing automated or background processes
  (a worker writing extraction results, a scheduled job expiring tokens, a
  webhook handler updating subscription state) — append `(service-role)` or
  `(SR)` to each ✅ cell where the operation requires bypassing RLS. A ✅
  cell _without_ this marker is read as an RLS-permitted operation the System
  performs through normal authentication. Without the distinction, the data
  contract build has to guess, per cell, whether to write a policy or list
  the operation in the Service-Role Inventory. Example:
  `| System | ✅ (SR — extraction output) | ✅ | ✅ (SR — status transitions only) | ❌ |`

The matrix is the canonical statement of "who can do what" for the feature.
Prose elsewhere MUST NOT contradict it; if a later rule changes a permission,
update the matrix.

### C. Happy Path

_Heading convention:_ `### Happy Path: <Feature Name>`.

A chronological, step-by-step narrative of the exact interaction between the
user and the system. Write it as an explicit sequence, not a summary:

1. User submits the invitation form with an email address and a selected role.
2. System checks whether the email is already a member of this tenant.
3. If not a member, System generates a time-limited invitation token and
   sends an invitation email.
4. Invited user clicks the link, is routed to the Accept Invitation screen,
   and completes signup if not already registered.
5. On acceptance, System creates the membership record and routes the user to
   the tenant dashboard.

### D. Business Logic & Constraints

_Heading convention:_ `### Business Logic: <Feature Name>` _or, for
cross-cutting rules that govern multiple features (credit systems, state
machines, validation pipelines), a dedicated section with its own
descriptive heading. The data contract build looks for_ `⚑ DATA IMPLICATION`
_flags directly, not for a specific section name._

Bullet points defining the hard limits, validation rules, and state
constraints. Must include:

- **Input validation rules with specific values** — e.g. "Email must be RFC
  5321-compliant; display name must be 2–50 characters."
- **Timeouts and expiry windows** — e.g. "Invitation tokens expire after 72
  hours."
- **Rate limits** — e.g. "Maximum 10 invitation emails per tenant per hour."
- **State requirements and transition rules** — e.g. "A cancelled
  subscription cannot be reactivated — the user must create a new
  subscription."
- **URL & routing constraints.** For any feature involving entity creation or
  a multi-step flow, state whether a dedicated static URL segment is required
  (e.g. `/invitations/accept` MUST NOT be handled by a dynamic entity route),
  and any slug or ID format constraints (e.g. "Invitation tokens are UUIDs —
  the path segment `/invitations/new` MUST be declared as a static route
  taking precedence over `/invitations/[token]` to prevent misrouting").
- **Data implication flags** — mandatory; see the dedicated subsection below.

#### The `⚑ DATA IMPLICATION` flag convention

Every business rule that implies **stored state** MUST be annotated with a
`⚑ DATA IMPLICATION:` flag, inline at the point the rule is stated, followed
by a one-line description of the storage need. The flag exists for the data
contract build's PRD-to-Schema Trace — without it, columns get missed and
surface as "field does not exist" errors when the product is being built. A
missing flag on a storage-implying rule is the single most common cause of
those errors.

**The categories that trigger a flag — annotate at minimum:**

| Rule contains…                                           | Flag form                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| An expiry, timeout, or "after N days"                    | `⚑ DATA IMPLICATION: requires <entity>.<column>_at timestamp`                        |
| A state, status, or stage                                | `⚑ DATA IMPLICATION: requires <entity>.status enum with values [list]`               |
| "sortable by X", "filterable by Y", "show most recent Z" | `⚑ DATA IMPLICATION: requires <entity>.<column> to support sort/filter`              |
| "who did X" or "when was Y last touched"                 | `⚑ DATA IMPLICATION: requires <entity>.<actor_column>_id and/or <entity>.<event>_at` |
| A counter, quota, or rate limit                          | `⚑ DATA IMPLICATION: requires per-<scope> counter for <thing> per <period>`          |
| "user can have multiple X"                               | `⚑ DATA IMPLICATION: requires join between <entity_a> and <entity_b>`                |

**Flag the _need_ precisely; do NOT design the storage.** No SQL, no types,
no FK directions — that is the data contract build's job. A vague flag like
`⚑ DATA IMPLICATION: invitations need to expire` is a defect: the reader
cannot tell whether you mean a timestamp column, a TTL job, or a polling
check. The right form is
`⚑ DATA IMPLICATION: requires invitations.expires_at timestamp; expiry checked at read time`.

**Forbidden flag patterns.** A flag's job is to commit the PRD to a storage
_need_. Patterns that hedge or offer alternatives push the decision back onto
the build, which treats flags as already-resolved and will not re-litigate
them. These forms are FORBIDDEN:

- `⚑ DATA IMPLICATION: requires X OR Y (architect's choice)` — the PRD must
  pick which need is real; alternatives are not a PRD author's job.
- `⚑ DATA IMPLICATION: requires storage for <concept>` — too vague; name the
  column-shape need ("requires `obligations.origin` enum to distinguish
  extracted vs manual").
- `⚑ DATA IMPLICATION: requires X (e.g., column_name)` — the parenthetical
  _is_ design. Drop the example or commit to it.

The right form names the need precisely without naming the solution:

- ✅ `requires distinguishing extraction-derived obligations from manually created ones`
- ✅ `requires per-tenant counter for invitation emails per rolling hour`
- ❌ `requires obligations.extracted_by_system boolean OR obligations.origin enum`
- ❌ `requires counter table OR equivalent counter mechanism`

**Self-flagged uncertainty (`⚐ REVIEW:`).** When you write a rule you are
unsure about — typically because the brief was silent and you inferred a
default you'd like a second pair of eyes on — annotate it inline:

`⚐ REVIEW: <one-line description of the uncertainty>`

The self-review pass (§4) treats `⚐ REVIEW:` flags as elevated-attention
items. Use it sparingly — three to six per PRD is healthy; thirty means you
should have resolved more up front. Do not use it for things you should
decide yourself (default values, naming, scope boundaries). Use it for
genuine residual ambiguity.

Any rule containing expiry, status, sortability, attribution, counters, or
"multiple X per Y" **without** a `⚑ DATA IMPLICATION` flag is a spec defect.
The PRD is not complete until every such rule carries one.

### E. Edge Cases & Error Handling

_Heading convention:_ `### Edge Cases: <Feature Name>`, _or interleaved into
the relevant flow if the cases are tightly coupled to specific steps.
Cross-cutting failure modes (e.g. an external service being unavailable) can
live in a dedicated section._

Explicit rules for what happens when the flow breaks. Must include:

- Specific named error states and what triggers them.
- Fallback behaviours and recovery paths.
- Timeout handling.
- What the system displays when an external service (email provider, payment
  processor) fails.
- Duplicate, conflict, and race-condition handling where relevant.

### Consolidating cross-cutting blocks

Some content doesn't belong to a single feature. A credit-balance system
might be touched by a subscription module, a top-up flow, a refund flow, and
a B2B pool flow. Splitting its rules across four feature sections fragments a
coherent system into incoherent shards.

For these cases: write the cross-cutting concern once, in its own dedicated
section, with its own labelled blocks (e.g. `### Business Logic: Credit
System`). Then, in each feature that touches it, add a one-line reference
("Credit consumption follows the priority order defined in §X.X."). The data
contract build reads `⚑ DATA IMPLICATION` flags by location, not by feature
attribution, so this works as long as the flags live where the rule is
written. This is the preferred pattern for shared state machines, credit /
quota systems, validation pipelines used by multiple flows, and B2B/B2C
parallel features that share most rules.

### The document header

The document MUST begin with this exact H1 title:

`# {Project Name}: Product Requirements & Functional Spec`

Followed immediately by a one-paragraph **Product Vision** statement: what
the product is, who it is for, and the primary problem it solves. This is a
narrative section, not bound by the labelled-block conventions.

---

## 4. Self-review / refinement checklist

Once a draft PRD exists, run it against this checklist before treating it as
done — a human can do this, and so can Claude Design or Claude Code when they
receive it. The question every finding answers is still: _if someone built
this using only this PRD, would they build the right thing without guessing?_

You are reviewing the **product spec**, not the database. If a gap is really
a storage-design question ("should `expires_at` be a timestamp or a date?
should it be indexed?"), it is out of scope here — mark it `→ defer to the
data contract build` and move on. The line to hold:

- ✅ _Spec fix:_ "An invoice can be draft, sent, or paid. Only drafts can be
  edited."
- ❌ _Not here:_ "Invoices table has a status column of type enum…"

**What to look for:**

- **Vague wording.** "Multiple", "some", "fast", "user-friendly" without
  specifics.
- **The same thing called different names.** "Customer" in one place,
  "client" in another. Pick one term and use it throughout.
- **Rules that contradict each other.**
- **Storage-implying language with no flag.** Phrases like "expires after",
  "most recent", "sortable by", "marked as", "history of", "last updated" all
  imply stored state. If the rule is described but carries no
  `⚑ DATA IMPLICATION` flag, the downstream schema will miss the column. This
  is the single most common cause of "field does not exist" errors. **Treat a
  missing flag as a must-fix.**
- **`⚑ DATA IMPLICATION` flags that hedge.** Flags of the form `requires X OR
Y`, `requires storage for…`, or `requires X (e.g., column_name)` are
  defects — they push the decision onto the build. Rewrite to the corrected
  form (see §3), picking whichever alternative best matches the rest of the
  PRD's logic. **Must-fix.**
- **Permission rules without an actor and a scope.** "Users can edit
  projects" is ambiguous — which users? A rule without a named actor and a
  named scope ("own", "all in tenant", "all") becomes silently broken RLS
  later. **Must-fix.**
- **Unmarked `System` actor rows.** Every ✅ cell for a `System` actor that
  bypasses RLS must be marked `(service-role)` or `(SR)`. An unmarked ✅ reads
  as RLS-permitted. Mark unmarked System rows as must-fix and recommend the
  correct marker based on whether the operation is plausibly RLS-permitted
  (a System read of a user-readable row) or service-role (writing into
  another tenant's data, modifying state across tenants, expiring tokens).
- **States mentioned but not enumerated.** "When the invoice is overdue" — is
  `overdue` a stored status or a calculation from `due_date`? A state name
  used in prose but absent from any state machine is a gap.
- **Missing rules.** A feature described without saying who can use it, what
  happens when it fails, or what happens on day one when there's no data yet.
- **Workflow gaps.** A status is mentioned but it isn't clear how you enter
  it, leave it, or whether it can be reversed.
- **State-machine transitions triggered by blocked actions.** Check every
  transition's trigger against the permission matrix and Business Logic for
  the _prior_ state. A transition fired by a "blocked", "rejected", or
  "denied" action is suspicious — if the action didn't occur, no state change
  can follow. The fix is usually one of: (a) the state should be entered on a
  _successful_ prior action, not a blocked attempt; (b) the state shouldn't
  be stored at all and is just a derived condition; or (c) the action should
  in fact succeed and the matrix is wrong.
- **Missing edge cases.** What if two people do this at once? What if the
  parent thing is deleted? What if the input is empty?
- **Things implied but never defined.** "Users can share with their team" —
  but "team" is never explained.
- **Silent assumptions.** Multi-tenant or single-tenant? Public or
  login-only? Free or paid? Often the author knows but didn't write it down.

**How to resolve what you find.** Be direct — recommend a specific fix rather
than asking an open question. Three cases:

1. **Spec clarification** (most findings): state the exact rule or wording to
   add. If it involves stored state, include the corrected
   `⚑ DATA IMPLICATION` flag as part of the fix — the flag is a PRD-level
   annotation, not schema design.
2. **A genuine product call** (a scope or behaviour decision only the product
   owner can make): still recommend a default, mark it `⚠ needs a decision`,
   and state the one-line alternative. Prioritise these — they are the ones
   worth pausing on.
3. **A database question** (how the storage is built, not what the product
   does): don't propose a fix. Mark it `→ defer to the data contract build`.

**Completeness gate — the five checks that must pass before the PRD is
build-ready.** Walk every feature and confirm:

1. Every business rule mentioning expiry, status, sortability, or attribution
   carries a `⚑ DATA IMPLICATION` flag at the point the rule is stated.
2. Every feature with non-trivial permission rules has a `### Permission
Matrix:` block somewhere in the document, fully populated. Cross-cutting
   features that share rules can share a matrix as long as it names which
   features it governs.
3. Every actor referenced in any matrix is defined exactly once across the
   document — no actor name appears unintroduced.
4. Every state mentioned in a happy path or rule appears in a documented
   state machine (or is annotated as a transient computed state with the rule
   that derives it).
5. Every state-machine transition has a trigger consistent with what the
   permission matrix and Business Logic say is _permitted_ in the prior
   state.

Fix any failing check inline. Declaring the PRD build-ready is not the
default — do it only after positively spot-checking these five (verify at
least three storage-implying rules carry flags; at least three
non-trivial-permission features have matrices; no actor is unintroduced;
every prose-mentioned state appears in a state machine; at least three flags
name a _need_ not an alternative). Any failed spot-check is a must-fix, not a
pass.

### Recording the declaration — the Build-Ready block

Once all five checks pass, record it. Append a **Build-Ready Declaration** block
to the **foot of `docs/PRD.md`** — a dated statement of the gate result. This is
the durable, checkable artefact that the next step (briefing Claude Design) looks
for before it will start; a PRD without this block is not yet build-ready, no
matter how complete it looks. Use this exact shape:

```markdown
## Build-Ready Declaration

- **Date:** {YYYY-MM-DD}
- **§4 completeness gate:** PASS
  1. Storage-implying rules carry `⚑ DATA IMPLICATION` flags — ✅ (spot-checked: {which rules})
  2. Every non-trivial-permission feature has a `### Permission Matrix:` — ✅
  3. Every matrix actor introduced exactly once — ✅
  4. Every prose-mentioned state appears in a state machine — ✅
  5. Every state-machine transition has a permitted trigger — ✅
```

If any check cannot be marked ✅, the PRD is not build-ready — fix the gap and
re-run the gate rather than recording a partial pass.

---

## 5. PRD template skeleton

A copy-pasteable starting point assembling the block formats from §3. Adapt
the structure to the product (see the "organise for coherence" note in §3) —
this skeleton shows the required blocks and headings, not a mandatory
outline.

```markdown
# {Project Name}: Product Requirements & Functional Spec

{One-paragraph Product Vision: what the product is, who it is for, and
the primary problem it solves.}

---

## Roles & Actors

{Define every named actor exactly once. Each becomes a row in the
Permission Matrices below. Include the synthetic `System` actor if any
automated/background process touches data.}

- **Tenant Owner** — {what this role is}
- **Admin** — {what this role is}
- **Member** — {what this role is}
- **Guest / unauthenticated** — {what this role is}
- **System** — automated/background processes (workers, schedulers,
  webhook handlers).

---

## Feature: {Feature Name}

{Context & Purpose: one sentence — WHAT this feature does and the value
it delivers.}

### Permission Matrix: {Feature Name}

| Actor        | Create          | Read                  | Update                   | Delete      |
| ------------ | --------------- | --------------------- | ------------------------ | ----------- |
| Tenant Owner | ✅              | ✅ all rows           | ✅ all rows              | ✅ all rows |
| Admin        | ✅              | ✅ all rows           | ✅ all rows except owner | ❌          |
| Member       | ✅ own rows     | ✅ all rows in tenant | ✅ own rows only         | ❌          |
| Guest        | ❌              | ✅ public rows only   | ❌                       | ❌          |
| System       | ✅ (SR — {why}) | ✅                    | ✅ (SR — {why})          | ❌          |

### Happy Path: {Feature Name}

1. {User does X.}
2. {System checks Y.}
3. {System does Z and routes the user to W.}

### Business Logic: {Feature Name}

- {Input validation rule with specific values.}
- {Timeout / expiry rule.}
  ⚑ DATA IMPLICATION: requires {entity}.{column}\_at timestamp; {when checked}
- {State / status rule.}
  ⚑ DATA IMPLICATION: requires {entity}.status enum with values [{list}]
- {Rate limit / counter rule.}
  ⚑ DATA IMPLICATION: requires per-{scope} counter for {thing} per {period}
- {URL/routing constraint, if the feature involves entity creation or a
  multi-step flow.}

### Edge Cases: {Feature Name}

- {Named error state and its trigger; the fallback / recovery path.}
- {What is displayed when an external service fails.}
- {Duplicate / conflict / race-condition handling.}

---

## {Cross-cutting concern, e.g. Credit System / State Machine}

{Write shared systems once, here, with their own labelled blocks. Each
feature that touches this references it in one line rather than
duplicating its rules.}

### Business Logic: {Cross-cutting concern}

- {Rule.}
  ⚑ DATA IMPLICATION: {precise need}

---

## Lifecycle Coverage

{Confirm each project-specific lifecycle stage from §2 is covered as a
feature above, or state a one-line reason it is not applicable:}

- Roles & Permissions — {COVERED / NOT APPLICABLE (reason)}
- Onboarding Flow Content — {COVERED / NOT APPLICABLE (reason)}
- Tenant Cardinality — {COVERED / NOT APPLICABLE (reason)}
- Subscription Lifecycle — {COVERED / NOT APPLICABLE (reason)}
- Account & Tenant Deletion — {COVERED / NOT APPLICABLE (reason)}
- Audit Logging — {COVERED / NOT APPLICABLE (reason)}
- Unauthenticated Public Surfaces — {COVERED / NOT APPLICABLE (reason)}

{Universal auth mechanics — Sign Up, Log In, Forgot Password, Email
Verification, Member Invitation — are NOT specced here; they are handled
by the auth build. See docs/project_start/build-reference/auth.md.}

---

## Build-Ready Declaration

{Added once the §4 completeness gate passes. The next step — briefing Claude
Design — checks for this block before it starts.}

- **Date:** {YYYY-MM-DD}
- **§4 completeness gate:** PASS
  1. Storage-implying rules carry ⚑ DATA IMPLICATION flags — ✅ (spot-checked: {which rules})
  2. Every non-trivial-permission feature has a ### Permission Matrix: — ✅
  3. Every matrix actor introduced exactly once — ✅
  4. Every prose-mentioned state appears in a state machine — ✅
  5. Every state-machine transition has a permitted trigger — ✅
```

---

## Agent-led drafting protocol

_Audience: the coding agent. This is the default path — the owner supplies a
rough brief and asks you to run the PRD interview. Your job is to produce a
build-ready `docs/PRD.md` to the standards in parts 1–5 above; this section only
orders the interaction, it does not restate those standards._

1. **Interview from the lifecycle checklist, in plain English.** Build your
   questions from the §2 lifecycle stages — roles & permissions, onboarding
   content, tenant cardinality, subscription & billing, account & tenant
   deletion, audit logging, unauthenticated public surfaces — **plus** the
   product's own feature list from the brief. Translate each into a product
   question the owner can answer ("When someone cancels, what happens to their
   data and any work in progress?"), never a technical one.
2. **Never ask the owner technical or storage questions.** They decide product
   _behaviour_; you decide how that behaviour is recorded. Derive the
   `⚑ DATA IMPLICATION` flags (§3) yourself — do not surface columns, types,
   enums, or "should this be stored or computed?" to the owner. The universal
   auth mechanics (§1) are already settled; do not ask about them.
3. **Batch the interaction — do not drip one question per turn.** Run it in
   rounds: (a) one round of grouped questions covering every gap you can see at
   once; (b) draft the full PRD to the parts 1–5 standards, resolving everything
   you can with a sensible default and a `⚐ REVIEW:` flag where you're unsure;
   (c) bring back only the genuine product calls — the `⚠ needs a decision`
   items from §4 — in a single second round, each with your recommended default.
4. **Close by running §4 and declaring build-ready.** Run the self-review and
   the five-check completeness gate yourself, fix what fails inline, then append
   the **Build-Ready Declaration** block (§4) to the foot of `docs/PRD.md`.
   Report the gate result to the owner. Only then is Step 1 done and the PRD
   ready to feed Claude Design.

---

## Where the PRD goes next

Once `docs/PRD.md` is written and passes the self-review in §4, it feeds the
rest of bootstrapping:

- It is fed into **Claude Design** to create the prototype — see
  `docs/project_start/02-briefing-claude-design.md`.
- After the prototype is imported, the prototype is reconciled back against
  the PRD (any product signal the prototype shows but the PRD never stated is
  routed back into `docs/PRD.md`) — see
  `docs/project_start/build-reference/prd-prototype-reconciliation.md`.
- The enriched PRD then drives the **data contract**
  (`docs/project_start/build-reference/data-contract.md`), the **scaffold**
  (`docs/project_start/build-reference/scaffold.md`), and the **auth build**
  (`docs/project_start/build-reference/auth.md`) — the opening phases of the
  roadmap.
- Finally it anchors the **roadmap** — see
  `docs/project_start/04-writing-the-roadmap.md`.

The PRD stays the living source of truth for product behaviour for the life
of the project. It is changed after bootstrapping through the **Product Change
Protocol** (`.cursor/rules/06-agent-behaviour.mdc` §15): when the owner asks for
something the PRD does not yet say — or contradicts — the coding agent updates
the PRD (and the contract and roadmap) as part of shipping the change. Because
the PRD is kept current this way, it never needs a disclaimer header noting that
it has diverged from the built product; the `CHANGE_LOG` in `docs/AI_STATUS.md`
is the record of what changed and when.
