# The Data & API Contract — What It Must Contain and How It Is Audited

> **Audience:** Claude Code, deriving and validating `docs/DATA_CONTRACT.md` as
> an early phase of the roadmap.
> **When to use:** After the PRD has been prototype-enriched
> (`docs/project_start/build-reference/prd-prototype-reconciliation.md`) and
> before the walking-skeleton scaffold. The contract is derived from the
> prototype-enriched `docs/PRD.md`, audited against it, and only then does the
> schema get built (during scaffold) and the feature slices get planned.

`docs/DATA_CONTRACT.md` is the **bootstrap source of truth** for the database.
At the moment it is written, no migrations exist, no TypeScript types exist, no
Zod schemas exist. The schema, RLS policies, server actions, and route structure
for v1 are all generated _from_ this document. Anything omitted here, the build
will guess — and on greenfield builds, the most expensive guesses are
silently-wrong RLS policies and missing columns.

The contract is a **decision document, not a schema file.** It contains no
runtime TypeScript, no Zod schemas, no example JSON — those are derived in code
at build time. What it contains is every decision the build cannot make on its
own: which entities exist, how they relate, who can do what to them, and why.

**The One Rule:**

> Include everything the build needs to produce a correct first migration and a
> correct first set of RLS policies. Omit only things that can be derived
> trivially and unambiguously from what is already written here.

This guide has two halves: **Part A — Building the contract** (what sections it
must contain and in what shape) and **Part B — Auditing the contract** (the
protocol that proves it is complete before the schema is built). Both run as
roadmap phases: the contract is derived, then audited against the PRD, then
frozen at handoff to the scaffold.

---

## Source-of-truth lifecycle

The contract has two phases. Each entity section is explicit about which phase
it is in.

**Phase 1 — Bootstrap (before the migration for a table is written):** The
contract is authoritative for that table's schema, policies, and rules. Claude
Code reads the contract and produces the migration from it.

**Phase 2 — Steady state (once the migration is written and applied):** The
migration becomes the source of truth for schema and RLS _for that table_. The
contract entry for that table gets a marker:

```markdown
> 🔒 SCHEMA FROZEN — see `supabase/migrations/<timestamp>_<name>.sql`.
> The columns, types, FKs, and RLS policies in this entry are historical;
> the migration is authoritative.
```

**Updating a frozen entry:** Once an entry is 🔒 SCHEMA FROZEN, its column list,
types, and RLS policies are never edited in place. The intended change is
recorded as a `**Pending migration:**` note inside the frozen entry. The next
migration consumes that note and removes it.

```markdown
### `invoices`

> 🔒 SCHEMA FROZEN — see `supabase/migrations/20240901_invoices.sql`.

| Column | Type | ... |
| ... | ... | ... |

**Pending migration:**

- Add `last_sent_at` (timestamptz, nullable) for re-send tracking.
  Reason: PRD §4.3 — sortable by recency of last reminder.
- Add INDEX on `last_sent_at` (RLS-adjacent column, may be queried
  in admin views).
```

The contract is now in an explicit "frozen with pending changes" state for this
entity. The next time a migration touches `invoices`, the Pending migration list
is consumed, the migration is generated from it, and the list is removed. No
silent updates, no ambiguity about "is this what's live or what's planned."

A frozen entry with no `**Pending migration:**` note is current. A frozen entry
with a `**Pending migration:**` note has known divergence; the contract records
the divergence rather than hiding it.

The contract retains authority — even after freeze — over the things a migration
cannot express:

- Business rules and invariants ("an invoice cannot be edited after `sent`")
- State machines and allowed transitions
- Route ownership and which entity a route mutates
- Environment variable inventory
- Provisioning logic and first-user rules
- The reasoning behind RLS decisions (the "why," which a `CREATE POLICY`
  statement does not capture)

When updating an existing table, the migration is authoritative for what _is_;
the contract is authoritative for what the _next_ migration must do.

---

## Migrations are applied by the agent, via the Supabase MCP

Every migration derived from this contract is applied by Claude Code itself,
using the Supabase MCP `apply_migration` tool. There is no SQL-Editor hand-off to
a human, and `supabase db push` is not used. The contract specifies the schema
and RLS; the agent turns each entity's spec into a migration and applies it
directly. This is why the contract must be complete enough to generate a correct
migration without guesswork — nothing downstream fills the gaps by hand.

---

## Naming & formatting conventions

**Document header:** `# {Project Name}: Data & API Contract`

**Output location:** `docs/DATA_CONTRACT.md`. If the file exists, update or
append the relevant domain sections — do not overwrite unrelated domains.

**Naming:**

- Tables: `snake_case`, plural (`invoices`, `customer_addresses`)
- Columns: `snake_case`, singular (`tenant_id`, `created_at`)
- Enum types: `snake_case` (`invoice_status`, `user_role`)
- Indexes: `idx_<table>_<columns>` (`idx_invoices_tenant_id`)
- Policies: descriptive sentences in double quotes
  ("Members can read invoices in their tenant")

---

# Part A — Building the contract

The contract is derived from the prototype-enriched `docs/PRD.md`. By this point
the PRD's ambiguities, undefined workflow states, implied entities, and
terminology drift have already been resolved (during PRD authoring and, if a
prototype exists, during reconciliation). The contract build proceeds directly to
generating the sections below.

## PRD annotations the contract must respect

- **`⚑ DATA IMPLICATION` flags** are confirmed storage requirements. They are not
  open questions — they are signals that the functional decision is resolved and
  the storage need is flagged. Each flag MUST appear in the PRD-to-Schema Trace
  as a row pointing to a column, enum, or relationship in the contract.
- **`⚐ REVIEW:` annotations** are the PRD author's self-flagged residual
  uncertainty — places where a rule was inferred rather than directly resolved.
  Treat these as elevated-attention: do not silently default past them. If the
  inferred rule is consistent with the rest of the PRD and the contract can
  proceed without ambiguity, document the reading inline as a `**Decision:**`
  note and continue. If the rule is ambiguous enough to change the schema or RLS,
  this is one of the rare cases where a single sharp product question is warranted
  before generating the contract.
- **`OPEN COMMERCIAL DECISION` markers** identify values that depend on commercial
  inputs not yet finalised (pricing, plan caps, grace periods, refund policy). The
  _value_ is config, not schema — but the _behavioural envelope_ around the
  unknown drives storage. Read the surrounding rules: the states involved, the
  timestamps that must be stored, the counters required. Generate the schema and
  RLS for the envelope; leave the value to runtime configuration. If the envelope
  itself is unspecified (no states, no timestamps, no observable behaviour), that
  is a `[GAP]` row in the trace, not a commercial decision.

## When a product question is warranted (rare)

The contract build makes data and architectural decisions on its own. It only
stops for a genuine blocker — something that would force it to invent a _product
rule_, not a data decision:

- A direct, unresolved contradiction in the PRD.
- A business rule that operates on an entity entirely absent from the PRD with no
  reasonable default.
- A permission rule referencing a role that is never defined anywhere.
- An auth _shape_ (see below) that is genuinely ambiguous between two recognised
  shapes — shape is load-bearing for the entire contract and cannot be inferred
  later without rework.

The contract must NOT stop for:

- Architectural choices that are the build's to make (cascade behaviour, default
  values, index strategy, RLS predicate form when role rules are clear).
- Anything resolvable by a reasonable default consistent with the rest of the PRD
  — pick the default, document it inline as a `**Decision:**` note, move on.
- Column types and FK directions when the PRD makes them obvious.

---

## The PRD-to-Schema Trace (write this first)

Before writing the entity inventory or schema specification, perform a trace pass
over the PRD. This is the single highest-leverage check for preventing "missing
column" bugs at build time. It is also the contract's audit trail — the answer to
"did this contract miss anything the PRD asked for?", readable in 30 seconds and
falsifiable against the PRD line by line.

For every feature module in the PRD, list:

1. **Every noun the feature operates on** — including ones the PRD mentions in
   passing (e.g. "the user's last login", "the invoice's due date", "the team's
   plan"). A noun that has no entity row in the inventory and no column on an
   existing entity is a gap.
2. **Every state mentioned** — explicitly or implicitly. Statuses like `draft`,
   `pending`, `archived`, `expired`, `revoked` MUST each have either a column or
   an enum value. A state with no storage is a silent feature gap.
3. **Every "when X, then Y" rule** — these usually imply a stored value. "When an
   invoice is overdue" implies a `due_date` column. "When a member was last
   active" implies a `last_active_at` column. "Sortable by last contacted"
   implies a `last_contacted_at` column.
4. **Every permission rule referencing a value** — "only the assignee can edit"
   implies an `assignee_id` column. "admins of the same tenant" implies that role
   and tenancy are queryable from the user record.
5. **Every System-actor row in a Permission Matrix.** The PRD marks System
   operations as either `(service-role)` / `(SR)` (bypasses RLS) or unmarked
   (RLS-permitted). Each marked row goes into the Service-Role Inventory with the
   PRD reference and a one-line justification drawn from the PRD's text. Each
   unmarked row needs a corresponding RLS policy that grants the System actor the
   operation through normal authentication — verify this is plausible (typically
   only for read operations on broadly-readable rows; writes by an unmarked System
   actor are usually a PRD defect to escalate, not a thing to silently
   policy-around).

Output the trace as a table at the top of `docs/DATA_CONTRACT.md`, under a
`## PRD-to-Schema Trace` heading:

| PRD reference                                              | Implied storage                                                         | Location in contract                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| §3.2 "users can sort customers by last contacted"          | `customers.last_contacted_at` (timestamptz)                             | Customers domain → schema                         |
| §4.1 "invoices become overdue 30 days after sent"          | `invoices.due_date` (date), state machine includes `overdue`            | Invoices domain → state machine                   |
| §5.2 "only the assignee can edit a task"                   | `tasks.assignee_id` (uuid, FK to users)                                 | Tasks domain → schema + RLS                       |
| §9.2 "extraction worker writes obligations" (System ✅ SR) | service-role insert into `obligations`; entry in Service-Role Inventory | Obligations domain → RLS + Service-Role Inventory |

The trace MUST be exhaustive — every PRD-implied storage need maps to a row, or
to a `[GAP]` row that names what's missing. A `[GAP]` row forces the contract to
either resolve the gap (add the column to the schema) or escalate it back to the
PRD. **Never proceed to schema specification with unresolved `[GAP]` rows.**

Every `⚑ DATA IMPLICATION` flag in the PRD produces a trace row. A flag with no
row is a confirmed storage requirement the contract overlooked.

---

## The Auth Domain Boundary Rule and the `**Auth shape:**` declaration

The auth domain has a project-wide _shape_ — the structural choice about whether
the project has tenants, and if so, how users relate to them. The shape
determines which tables exist, which RLS predicates make sense, and how the auth
build (`docs/project_start/build-reference/auth.md`) provisions the domain. This
declaration makes the shape findable in one place rather than inferred from schema
details, and **all downstream RLS depends on it.**

### Declare the auth shape

Whether the project builds the auth domain as a separate phase or populates it
inline, the Auth Domain section MUST open with a single line in this exact
format, immediately under the section heading:

```markdown
**Auth shape:** <one of: single-membership multi-tenant | multi-membership multi-tenant | solo | custom>
```

The recognised shapes:

- **`single-membership multi-tenant`** — `users.tenant_id NOT NULL`, no
  memberships join table. One user belongs to exactly one tenant, forever. Suits
  B2B SaaS where workspace switching is rare or unsupported.
- **`multi-membership multi-tenant`** — global `users` plus a
  `tenant_memberships(user_id, tenant_id, role)` table. One user can belong to
  many tenants. Suits Linear/Vercel/Notion-style products.
- **`solo`** — no `tenants` table. RLS keys on `auth.uid()` directly. Suits
  personal productivity, consumer apps, single-user tools.
- **`custom`** — anything else (hierarchical tenancy, multi-region sharding,
  organisations-of-organisations). State the axis that diverges from the three
  recognised shapes.

Pick the shape from the PRD. If the PRD's user-and-workspace model is ambiguous
between two shapes, this is one of the rare cases that warrants a sharp product
question — shape is load-bearing and cannot be inferred later without rework.

### When the auth domain is built as a separate phase

If the auth domain is provisioned by the separate auth build
(`docs/project_start/build-reference/auth.md`), do NOT define
users/tenants/memberships/invitations entities in this document. Instead, emit a
stub. The stub's table list depends on the declared shape — use one of the three
templates below.

**Template for `single-membership multi-tenant`:**

```markdown
## Auth Domain — users, tenants, tenant_invitations, tenant_requests

**Auth shape:** single-membership multi-tenant

⚠️ STUB ONLY — DO NOT POPULATE
This domain is owned end-to-end by the auth build.
The auth build will replace this notice with the authoritative definitions.

**Auth assumptions this contract depends on** (the auth build MUST satisfy these):

- Tenant identifier column on `public.users`: `tenant_id` (uuid, NOT NULL, FK to `tenants.id`)
- Role values used by RLS in this contract: [`owner`, `admin`, `member`, ...]
- JWT claims this contract relies on: `tenant_id`, `role` (both in `app_metadata`)
- Helper functions this contract relies on: `auth.uid()`, `auth.jwt()`,
  and any custom helpers (list them).
```

**Template for `multi-membership multi-tenant`:**

```markdown
## Auth Domain — users, tenants, tenant_memberships, tenant_invitations

**Auth shape:** multi-membership multi-tenant

⚠️ STUB ONLY — DO NOT POPULATE
This domain is owned end-to-end by the auth build.
The auth build will replace this notice with the authoritative definitions.

**Auth assumptions this contract depends on** (the auth build MUST satisfy these):

- Tenant join table: `tenant_memberships(user_id, tenant_id, role)`
- Role values used by RLS in this contract: [`owner`, `admin`, `member`, ...]
- JWT claims this contract relies on: active `tenant_id` and `role` (typically
  set on workspace selection, not at login)
- Helper functions this contract relies on: `auth.uid()`, `auth.jwt()`,
  and any custom helpers — including any membership-resolution helper used
  by RLS (list them).
```

**Template for `solo`:**

```markdown
## Auth Domain — users

**Auth shape:** solo

⚠️ STUB ONLY — DO NOT POPULATE
This domain is owned end-to-end by the auth build.
The auth build will replace this notice with the authoritative definitions.

**Auth assumptions this contract depends on** (the auth build MUST satisfy these):

- All entities in this contract are owned by `auth.uid()` directly, not via tenancy.
- JWT claims this contract relies on: `auth.uid()` only.
- Helper functions this contract relies on: `auth.uid()`, `auth.jwt()`,
  and any custom helpers (list them).
```

For `custom`, write a bespoke stub naming the entities the shape requires, with
the same `**Auth shape:** custom` line and the same "Auth assumptions" block.
State explicitly which auth-domain entities the rest of the contract relies on.

The stub is non-negotiable: if it is missing or the shape is undeclared,
downstream RLS and downstream auth tooling will reference columns and claims that
may not exist.

### When the auth domain is populated inline

Treat the auth domain as a normal domain and populate it fully like any other.
The populated Auth Domain section MUST still open with the same `**Auth shape:**`
declaration line directly under the section heading. The shape declaration is
independent of whether the auth domain is built separately or inline — it always
lives at the same place in the contract.

---

## Output structure

For each domain, produce sections in this order. Then, after all domains, produce
the cross-cutting sections.

1. Domain Entity Inventory
2. Schema Specification (one block per entity)
3. RLS Policy Specification (one block per entity)
4. API Route Registry
5. Environment Variable Registry
6. Storage Contract (only if files involved)

---

### Component 1: Domain Entity Inventory

For each domain, list its entities, relationships, ownership, tenancy, key
business constraints, and state machines.

```markdown
## [Domain Name] Domain

### Entities

- `invoices` — belongs to `customers`. Tenant-scoped via `tenant_id`.
- `line_items` — belongs to `invoices` (cascade delete). Inherits tenancy
  from parent invoice (no own `tenant_id` column needed; RLS reaches
  through the parent).

### Business constraints

- An invoice cannot be edited after status leaves `draft`.
- Monetary amounts are stored in minor units (pence/cents) as integers.
- Invoice numbering is sequential per tenant, not globally unique.
- Soft delete via `archived_at` timestamp; hard delete forbidden.

### State machine

- Invoice status: `draft` → `sent` → `paid` | `overdue` → `void`
- Reverse transitions FORBIDDEN. `void` reachable from any non-`paid` state.
- Only `draft` invoices may have line items added or modified.
```

---

### Component 2: Schema Specification

Mandatory for v0. For each entity, specify every column — types, nullability,
defaults, and FKs. This translates directly into a migration.

```markdown
### `invoices`

| Column         | Type                    | Null | Default             | Notes                                    |
| -------------- | ----------------------- | ---- | ------------------- | ---------------------------------------- |
| `id`           | `uuid`                  | NO   | `gen_random_uuid()` | Primary key                              |
| `tenant_id`    | `uuid`                  | NO   | —                   | FK → `tenants.id`, ON DELETE CASCADE     |
| `customer_id`  | `uuid`                  | NO   | —                   | FK → `customers.id`, ON DELETE RESTRICT  |
| `number`       | `integer`               | NO   | —                   | Sequential per tenant; see business rule |
| `status`       | `invoice_status` (enum) | NO   | `'draft'`           | See state machine                        |
| `amount_pence` | `bigint`                | NO   | `0`                 | CHECK (`amount_pence >= 0`)              |
| `issued_at`    | `timestamptz`           | YES  | —                   | NULL until status leaves `draft`         |
| `created_at`   | `timestamptz`           | NO   | `now()`             |                                          |
| `updated_at`   | `timestamptz`           | NO   | `now()`             | Updated by trigger                       |

**Enum:** `CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');`

**Indexes:**

- `idx_invoices_tenant_id` on `(tenant_id)` — required for RLS performance
- `idx_invoices_customer_id` on `(customer_id)`
- `UNIQUE (tenant_id, number)` — enforces per-tenant numbering

**Triggers:**

- `set_updated_at` BEFORE UPDATE — sets `updated_at = now()`
```

**Mandatory inclusions per entity:**

- Primary key column with type and default.
- `tenant_id` if the entity is tenant-scoped (or a justified note if it inherits
  via FK chain).
- Foreign keys with explicit `ON DELETE` behaviour (`CASCADE`, `RESTRICT`,
  `SET NULL`).
- `created_at` and `updated_at` (`timestamptz`, default `now()`).
- Indexes on every column used in an RLS policy (RLS without indexes is the #1
  performance failure in Supabase).
- Indexes on every FK column.
- Any CHECK constraints implied by business rules.

---

### Component 3: RLS Policy Specification

For each entity, write the actual `CREATE POLICY` statements. Yes, this
duplicates what will end up in the migration — that is intentional. RLS errors
are the most common failure mode of AI-generated Supabase code, and prose intent
is not enough to prevent them.

#### RLS Action Inventory (mandatory before writing policies)

For every entity, before writing a single `CREATE POLICY` statement, list every
action the application will perform on it. Use this exact table format:

| Entity      | Action | Performed by                           | Constraint                                    |
| ----------- | ------ | -------------------------------------- | --------------------------------------------- |
| `customers` | SELECT | members of the tenant                  | tenant match                                  |
| `customers` | INSERT | members                                | tenant match (auto-set)                       |
| `customers` | UPDATE | members who created the row, or admins | tenant match + (creator OR admin)             |
| `customers` | DELETE | admins only                            | tenant match + admin role                     |
| `invoices`  | SELECT | members of the tenant                  | tenant match                                  |
| `invoices`  | INSERT | members                                | tenant match + status='draft'                 |
| `invoices`  | UPDATE | members                                | tenant match + status='draft' (state machine) |
| `invoices`  | DELETE | —                                      | forbidden (soft-delete only)                  |

**Why this is mandatory:** the most common silent RLS failure is a missing policy
for an action the application performs. The action appears to work in code review
(it compiles, the migration runs), then returns "0 rows returned" or 403 at
runtime because no policy grants it. The Action Inventory makes this catchable at
planning time — every row in the table must correspond to a `CREATE POLICY`
statement later in this section, or be explicitly marked "forbidden" with a
reason.

**Cross-check requirement:** before the contract is considered complete, count
the rows in the Action Inventory and count the `CREATE POLICY` statements. The
numbers must match (modulo "forbidden" rows). A mismatch is a blocking error.

**Mandatory rules for every policy block:**

1. RLS MUST be enabled on every table in the public schema:
   `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
2. Write **separate policies per operation** (`SELECT`, `INSERT`, `UPDATE`,
   `DELETE`). Never use `FOR ALL`.
3. Always specify `TO authenticated` (or another explicit role). Never omit the
   `TO` clause.
4. Wrap auth function calls: use `(SELECT auth.uid())` not `auth.uid()`. Same for
   `auth.jwt()`. This lets Postgres cache the result per-statement instead of
   evaluating per-row.
5. `UPDATE` policies require BOTH `USING` (which rows can be targeted) AND
   `WITH CHECK` (what the row must look like after update). Forgetting
   `WITH CHECK` is how users escape tenant isolation on update.
6. `INSERT` policies use `WITH CHECK` only (the row doesn't exist yet). This is
   where most AI-generated RLS gets tenant scoping wrong — the policy must verify
   the _new_ row's `tenant_id` matches the caller.
7. Helper functions called from RLS that query RLS-protected tables MUST be
   `SECURITY DEFINER` to avoid infinite recursion. List them in the cross-cutting
   RLS Architecture Notes section.
8. Always default to the **most permissive policy that satisfies the product
   rules**. AI agents bias toward over-restriction; the contract must counteract
   that. If a role can read a table per the PRD, the SELECT policy must allow it —
   do not add extra "just in case" conditions.

The tenant-isolation predicate form is governed by `.cursor/rules/01-database.mdc`
Rule 6 and follows the contract's declared auth shape. The SQL here is
illustrative and MUST match it.

````markdown
### `invoices` — RLS Policies

```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SELECT: any tenant member can read their tenant's invoices
CREATE POLICY "Members read tenant invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
);

-- INSERT: members can create invoices in their own tenant only
CREATE POLICY "Members create invoices in own tenant"
ON invoices FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
);

-- UPDATE: only draft invoices, only in own tenant; status transitions
-- are enforced by a trigger, not RLS
CREATE POLICY "Members update own-tenant draft invoices"
ON invoices FOR UPDATE
TO authenticated
USING (
  tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  AND status = 'draft'
)
WITH CHECK (
  tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
);

-- DELETE: forbidden by product rule (soft-delete only). No DELETE policy
-- means no DELETE allowed, which is the desired behaviour.
```
````

**Rationale:**

- Tenant isolation is enforced via JWT claim, not a join to a memberships
  table. This is faster and avoids recursion. Trade-off: changing tenant
  membership requires a JWT refresh.
- The state machine (`draft` → `sent` etc.) is enforced by a trigger
  rather than RLS because RLS cannot compare old and new values cleanly.
  See `triggers/invoice_status_transition.sql` (to be written).
- DELETE intentionally has no policy — soft delete via `archived_at` is
  enforced at the action layer.

````

**For child tables (e.g. `line_items`):** RLS reaches through the parent.
Pattern:

```sql
CREATE POLICY "Members read line items via parent invoice"
ON line_items FOR SELECT
TO authenticated
USING (
  invoice_id IN (
    SELECT id FROM invoices
    WHERE tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)
  )
);
````

If this pattern appears in 3+ child tables, factor into a `SECURITY DEFINER`
helper function and document it in the cross-cutting RLS Architecture Notes.

---

### Component 4: API Route Registry

| Entity       | Consuming routes              | Mutating server actions       |
| ------------ | ----------------------------- | ----------------------------- |
| `invoices`   | `/invoices`, `/invoices/[id]` | `create`, `update`, `archive` |
| `line_items` | `/invoices/[id]`              | `add`, `remove`, `reorder`    |

**Route Collision Guard:** List every reserved static segment that must precede a
dynamic route, per `.cursor/rules/01-database.mdc` § "Static Route Collision
Guard". Format: one line per static segment, with the dynamic segment it must
precede.

> ⚠️ STATIC ROUTES — must be declared before `/invoices/[id]`:
> `/invoices/new`, `/invoices/import`

---

### Component 5: Environment Variable Registry

```markdown
### Environment variables (this domain)

STRIPE*SECRET_KEY
Consumed by: /api/invoices/charge, actions/invoices/charge.ts
Location: Vercel env vars
Notes: Server-only. NEVER prefix with NEXT_PUBLIC*.

STRIPE_WEBHOOK_SECRET
Consumed by: /api/webhooks/stripe
Location: Vercel env vars
Notes: Used to verify webhook signatures.
```

If the domain consumes nothing beyond Supabase basics, write: _"No additional
environment variables required."_

---

### Component 6: Storage Contract (conditional)

Include only if the domain involves file uploads. Specify:

- Bucket name and path convention (deterministic, user- or tenant-scoped).
- Access model: private (pre-signed URLs) or public (CDN).
- Pre-signed URL expiry: upload 15 min default; read 1 hour default.
- Storage RLS policies (yes, Supabase Storage uses RLS too — write them out the
  same way as table policies).
- Required environment variables.
- Maximum file size and accepted MIME types.

---

## Cross-cutting sections (after all domains)

### User Types and Routing

| User type | Role value | Post-login route | Protected route prefix |
| --------- | ---------- | ---------------- | ---------------------- |
| Operator  | `operator` | `/dashboard`     | `/dashboard`           |
| Investor  | `investor` | `/portfolio`     | `/portfolio`           |

This table MUST cover every Actor named in any PRD Permission Matrix that
represents a logged-in human user. Synthetic actors (the `System` actor
representing background workers, scheduled jobs, or webhook handlers; anonymous
readers of public-by-design data) do not need a row here — note them inline as a
one-liner beneath the table instead. Adding an Actor to a Permission Matrix
without adding a row here is a spec defect: the downstream RLS work cannot
reference a role that does not exist in this table.

### Provisioning

The tables written during provisioning depend on the declared `**Auth shape:**`.
The example below shows the multi-membership case; for
`single-membership multi-tenant` the second row is `public.users.tenant_id` set
on the user row itself (no separate memberships table), and for `solo` only
`public.users` is written. Match the example to the shape the contract declares.

On first confirmed sign-up, create rows in the following tables using the
service-role client (bypasses RLS — provisioning writes only):

- `public.users` — one row per user; `id` = `auth.users.id`
- `public.tenant_memberships` — seed the user's initial tenant membership
  (multi-membership shape only; replace with `tenant_id` column on `public.users`
  for single-membership, omit entirely for solo)

**First-user rule:** if `public.users` is empty at provisioning time, assign the
`operator` role. Subsequent users get the default role (`viewer` unless otherwise
specified).

**Idempotency:** provisioning MUST be idempotent — check row existence before
inserting. Repeated calls must never create duplicates or throw.

The provisioning mechanism itself (the `on_auth_user_created` trigger and its
`SECURITY DEFINER` function) is built during the auth build; see
`docs/project_start/build-reference/auth.md`. This section names _what_ is
provisioned and the rules; the auth build implements _how_.

### RLS Architecture Notes

This section captures the project-specific RLS decisions that
`.cursor/rules/01-database.mdc` cannot encode generically. It does NOT restate the
predicate form, indexing rule, or default-deny posture — those are universal and
live in the rule file.

- **Tenancy model:** governed by the `**Auth shape:**` declaration in the Auth
  Domain section — do not restate it here. The rule file's tenant isolation
  template (§ "Tenant Isolation") branches on that declaration.
- **`SECURITY DEFINER` helpers:** list every helper function this project's RLS
  policies call that queries an RLS-protected table. For each: name, schema (must
  be non-exposed, e.g. `private`), purpose, internal `auth.uid()` check. The rule
  file enforces the pattern; this list names the helpers it must apply to.
- **JWT claim source:** the tenant-isolation form follows the declared auth shape
  per `.cursor/rules/01-database.mdc` Rule 6; it is fixed by the auth build, not
  chosen per contract.

### Service-Role Inventory

Every operation that bypasses RLS via the service-role client MUST appear here,
with one row per operation. The rule file
`.cursor/rules/02-api.mdc` § "Service-Role Discipline" enforces the runtime
check; this inventory enforces the planning-time check. The source for these rows
is twofold:

1. **System-actor matrix rows in the PRD marked `(service-role)` or `(SR)`.**
   Every such row produces an entry here. The PRD section reference goes in the
   Source column.
2. **Architect-identified service-role needs** — provisioning writes, migrations,
   scheduled cleanup jobs, webhook handlers that update state across tenants. Mark
   the Source as `architect`.

Format:

| Operation                                                 | Source    | Justification                                                                                              |
| --------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `INSERT` into `obligations` from extraction worker        | PRD §9.2  | Worker writes results into the contract owner's tenant; cannot do this through the inviting user's session |
| `UPDATE` `subscriptions.status` from billing webhook      | PRD §9.5  | Webhook is unauthenticated; updates state across tenants                                                   |
| Provisioning insert into `users` and `tenant_memberships` | architect | First-user creation; no session yet exists                                                                 |

A service-role operation that does not appear here is a spec defect.

### RLS Smoke Test Matrix

After migrations are applied, every policy MUST be smoke-tested before the
contract moves out of bootstrap. The smoke test is two queries per policy: one
positive, one negative. `.cursor/rules/01-database.mdc` § 8 specifies the exact
form.

The contract's responsibility is to enumerate the test cases. Use this matrix:

| Entity      | Policy              | Positive case (must succeed)                             | Negative case (must return 0 rows)                |
| ----------- | ------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| `customers` | `members_select`    | user A in tenant T1 reads customers in T1                | user B in tenant T2 reads customers in T1         |
| `customers` | `members_insert`    | user A in tenant T1 inserts a customer with tenant_id=T1 | user A in T1 attempts to insert with tenant_id=T2 |
| `invoices`  | `draft_only_update` | user A updates an invoice with status='draft'            | user A updates an invoice with status='sent'      |

Every entity must have at least:

- One positive cross-tenant test (different tenant cannot read).
- One positive within-tenant test (same tenant CAN read).
- One state-constraint test if the entity has a state machine.

A passing migration does NOT prove RLS works. Only the smoke tests do. The matrix
tells the developer what to test; the rule file tells them how to write the test.

### State Machine Enforcement

State machines are enforced by **triggers**, not RLS. Triggers can compare `OLD`
and `NEW` row values cleanly; RLS cannot. List every state-machine trigger here:

- `invoice_status_transition` on `invoices` — enforces allowed transitions

### Database Functions and Triggers

List every custom function and trigger the migrations must create. For each,
give: name, table (if a trigger), purpose, security mode (`SECURITY INVOKER`
default; `SECURITY DEFINER` only when justified).

---

## Recording decisions

Write with authority. Use `MUST`, `SHOULD`, `FORBIDDEN` to enforce rules. Every
decision in this document is read by the build with no additional context —
precision is not optional.

When an architectural decision is made that the PRD did not specify, mark it
inline as `**Decision:**` with a one-line rationale. These stand; future humans
editing the contract will know what was chosen and why.

---

## Completeness gate (run before declaring the contract done)

1. The Auth Domain section opens with a `**Auth shape:**` declaration line naming
   one of the four recognised shapes (`single-membership multi-tenant`,
   `multi-membership multi-tenant`, `solo`, `custom`). This applies whether the
   auth domain is a stub for a separate build phase or populated inline.
2. Every PRD-to-Schema Trace row maps to a column, enum, or `[GAP]`.
3. Every Action Inventory row maps to a `CREATE POLICY` statement or is marked
   "forbidden" with a reason.
4. Every entity in the inventory appears in the RLS Smoke Test Matrix with at
   least one positive and one negative case.
5. Every helper function called in any policy is declared in the RLS Architecture
   Notes with its `SECURITY DEFINER` status.
6. Every System-actor row from the PRD's Permission Matrices that is marked
   `(service-role)` or `(SR)` appears in the Service-Role Inventory with a PRD
   reference and a one-line justification. Every unmarked System-actor row has a
   corresponding RLS policy. A System operation that has neither is a blocking
   error.
7. Every distinct Actor name that appears in any PRD `### Permission Matrix:`
   block has a corresponding row in the `## User Types and Routing` table, OR is
   explicitly marked as a non-user actor in that table's notes (the `System`
   actor, anonymous public readers, or similar synthetic actors that do not log
   in). Compile the list of Actor names by scanning every Permission Matrix in the
   PRD; any name in that list with no row in User Types and Routing and no
   non-user-actor note is a blocking error. An actor that exists in the PRD but
   has no role value in this contract cannot have RLS policies written for it, and
   the resulting schema will silently under-enforce permissions.

A contract that fails any of these seven checks is not done. Surface the failures
explicitly — do not paper over them.

---

## What belongs in the contract vs. what doesn't

**Belongs here (always):**

- Domain Entity Inventory — entity names, relationships, ownership, tenancy,
  business constraints, state machines.
- Schema Specification (during bootstrap, frozen at handoff).
- RLS Policy Specification (during bootstrap, frozen at handoff) — note: predicate
  form and helper function patterns are governed by
  `.cursor/rules/01-database.mdc`; this section captures the project's specific
  predicates and the rationale behind each.
- API Route Registry — route → entity mapping, including reserved static segments
  (per the rule's Route Collision Guard).
- Service-Role Inventory — every operation requiring service-role access, with
  justification (governed by `.cursor/rules/02-api.mdc` § "Service-Role
  Discipline").
- Environment Variable Registry per domain.
- Provisioning logic and first-user rules.
- State machines and allowed transitions.
- Cross-cutting RLS Architecture Notes — tenancy model, helper function inventory,
  JWT claim source.

**Belongs here (during bootstrap only, frozen at handoff):**

- Detailed schema spec — frozen once the migration ships.
- Detailed RLS spec — frozen once the migration ships.

**Does NOT belong here:**

- TypeScript interfaces (the compiler enforces these).
- Zod schemas (they live next to the actions that use them).
- Example JSON payloads (stale within one phase).
- React component props.
- Anything labelled "for reference" — if it doesn't drive a decision the build
  cannot make from the codebase alone, it's noise.

---

## Keeping the contract accurate over time

- **New table** → add full Schema Specification + RLS Policy Specification. Once
  the migration is written, freeze with the 🔒 marker.
- **Change to an existing (frozen) table** — column add, column retype, RLS policy
  modification → record the intended change as a `**Pending migration:**` note
  inside the frozen entry. **Never edit the frozen column list, types, or RLS
  policies in place.** The next migration takes the change from the Pending
  migration list and removes the note when applied. This is the only sanctioned
  way to evolve a frozen entry; ad-hoc edits to frozen content are a spec defect.
- **New RLS policy on an existing (frozen) table** → same Pending migration
  pattern. Add the new policy as SQL inside the note.
- **New user type or role** → update User Types and Routing immediately, AND scan
  every policy for whether it should now reference the new role. Conversely, when
  adding or editing a PRD Permission Matrix, cross-check this table — a new Actor
  in the PRD must produce either a new row here or an explicit non-user-actor note.
- **New environment variable** → update the Environment Variable Registry for the
  consuming domain.
- **New `SECURITY DEFINER` helper** → add to RLS Architecture Notes with its
  schema, purpose, and the auth check it performs internally.

---

# Part B — Auditing the contract

Once the contract is written, it is audited against `docs/PRD.md` before the
schema is built. The audit is a distinct roadmap phase: its purpose is to ensure
zero information loss, zero security vulnerabilities, zero silent
under-specification, and absolute compliance with the contract's architectural
standards. Assume the contract is flawed until proven otherwise — it is the final
gatekeeper before the migration is generated and applied.

The audit does not rewrite the contract as it inspects. It produces an audit
report and isolated patch snippets; applying the patches is a separate, explicit
step (see **Applying the patches** below).

**Two failure modes to hunt for equally:**

1. **Rule violations** — RLS without `WITH CHECK`, unwrapped `auth.uid()`, missing
   indexes on RLS columns, etc. These are syntactic and easy to spot.
2. **Silent under-specification** — a policy that is syntactically perfect but
   more restrictive than the PRD requires; a column missing because a PRD rule was
   prose-only; a state never represented in an enum. These are semantic and
   require reading the PRD line by line.

The second class is the more common failure in practice. Bias attention toward
it.

**Global evidence requirement:** every gap, violation, and flag reported MUST
quote the PRD line or contract rule that grounds it. A finding without a
falsifiable anchor is itself a defect. If a source cannot be cited, do not raise
the finding.

## Inputs to the audit

Two documents:

1. `docs/PRD.md` — the refined, prototype-enriched product requirements.
2. `docs/DATA_CONTRACT.md` — the generated data contract.

You may also have:

- **Migrations directory** (`supabase/migrations/*.sql`) if the project is past
  v0. When present, treat the migration as the authoritative source of truth for
  any table whose contract entry carries the `🔒 SCHEMA FROZEN` marker. For frozen
  tables, audit the migration against the PRD, not the contract.
- **Migration ↔ frozen entry conflicts:** if a frozen entry's columns, types, or
  policies disagree with the referenced migration, the migration wins. The
  contract is wrong. The required patch is to realign the frozen entry with the
  migration AND record any PRD-implied changes as a `**Pending migration:**` note
  inside the frozen entry — not to edit the frozen content in place.

## The audit protocol

Execute the inspection points sequentially. Point 0 is a structural pre-check — if
the contract fails it, the rest of the audit short-circuits to FAIL because a
mandatory artifact was skipped and there is nothing meaningful to audit further.
Points 1–7 are the semantic checks. Do not skip points even if the contract
appears clean — the second class of failure hides in plain sight.

### 0. Completeness Gate Pre-Check (structural)

The contract mandates four structural artifacts. If any are absent or trivially
incomplete, the audit returns FAIL immediately and the remaining points are
reported as `[NOT RUN — completeness gate failed]`.

1. **PRD-to-Schema Trace table** exists at the top of the contract, with at least
   one row per PRD feature module. A trace with `[GAP]` rows is acceptable here
   (the trace is doing its job); a missing trace is not.
2. **RLS Action Inventory** exists for every domain that defines entities. The
   inventory must enumerate every action (SELECT, INSERT, UPDATE, DELETE) the
   application performs on each entity, with the performing role and the
   constraint.
3. **RLS Smoke Test Matrix** exists in the cross-cutting sections and contains at
   least one row per non-frozen entity.
4. **RLS Architecture Notes** exists and declares the tenancy model, the JWT claim
   source, and every `SECURITY DEFINER` helper called from any policy in the
   contract.

For each present artifact, run the structural sub-check below. A sub-check failure
is a critical finding (Section 2 of the report), not a fatal short-circuit — the
artifact exists, it just isn't doing its job.

**Sub-check A — Action Inventory ↔ `CREATE POLICY` row-count match.** Count the
rows in the Action Inventory across all entities. Count the `CREATE POLICY`
statements across all entities. The two counts MUST match, modulo rows explicitly
marked "forbidden" with a reason. A mismatch is a blocking error — name the
missing direction:

- Inventory rows with no matching `CREATE POLICY` → the policy was forgotten; the
  action will fail at runtime with 0 rows or 403.
- `CREATE POLICY` statements with no matching inventory row → the inventory is
  stale; the policy may be granting unintended access.

**Sub-check B — Smoke Test Matrix coverage.** For every non-frozen entity in the
inventory, the matrix MUST contain:

- At least one positive cross-tenant test (different tenant cannot read).
- At least one positive within-tenant test (same tenant can read).
- A state-constraint test if the entity has a state machine.
  Missing entities, or matrix rows that lack a positive AND a negative case, are
  critical findings.

**Sub-check C — Architecture Notes ↔ helper-function coverage.** Every helper
function called in any RLS policy in the contract MUST appear in the RLS
Architecture Notes with its schema, purpose, and internal `auth.uid()` check
declared. A helper used but undeclared is a critical finding (the developer will
write a SECURITY INVOKER stub that recurses).

**Sub-check D — PRD-to-Schema Trace exhaustiveness.** The trace MUST have a row
for every `⚑ DATA IMPLICATION` flag in the PRD and every PRD-implied storage need
(state, attribution, sortable timestamp, counter, join). Unresolved `[GAP]` rows
are not findings here — they are explicit handoffs from the contract author. But a
flag in the PRD with no corresponding trace row is a critical finding: the
contract author overlooked a confirmed storage requirement.

**Sub-check E — Auth shape declaration.** The Auth Domain section MUST open with a
`**Auth shape:**` declaration line directly under the section heading, naming one
of the four recognised values: `single-membership multi-tenant`,
`multi-membership multi-tenant`, `solo`, or `custom`. This applies whether the
auth domain is a stub for a separate auth build or populated inline. A missing
declaration line is a critical finding — downstream auth tooling and RLS templates
read this declaration to choose which shape to build, and inference from schema
details is exactly the silent-mismatch failure the declaration prevents. An
unrecognised value (anything outside the four) is also a critical finding unless
explicitly declared as `custom` with the divergent axis named.

**Sub-check F — Actor ↔ User Types and Routing coverage.** Compile the distinct
Actor names across every `### Permission Matrix:` block in the PRD, excluding
actors explicitly marked synthetic — typically named `System`, or actors whose
every ✅ cell carries `(service-role)` / `(SR)` markers (these are background
workers, scheduled jobs, or webhook handlers, and belong in the Service-Role
Inventory rather than the User Types and Routing table).

Every remaining actor MUST map to a `Role value` row in `docs/DATA_CONTRACT.md`
§ "User Types and Routing." The mapping is not necessarily 1:1 by string —
`Tenant Owner` in the PRD may map to `owner` in the contract, `Member` to
`member`, `Investor` to `investor` — but a plausible lexical correspondence must
exist. If the contract's User Types and Routing section contains an explicit note
mapping a PRD Actor to a Role value, follow it.

A PRD actor with no contract role is a critical finding. Downstream RLS authoring
cannot reference a role that does not exist in the contract, so policies either get
written against the wrong role or silently omit the actor entirely — and the
omission propagates into the walking-skeleton scaffold's folder structure
(`app/(app)/<role>/`), the auth build's shape check, and JWT claim design. This is
the same class of silent under-specification as a missing `**Auth shape:**`
declaration and carries the same severity.

When reporting a Sub-check F failure, name every unmatched PRD actor and quote the
PRD section reference(s) where it appears in a Permission Matrix. Do not propose a
Role value — the contract author chooses the canonical name; the audit only flags
the absence.

If all four artifacts are present and all six sub-checks pass, proceed to Point 1.

### 1. PRD-to-Contract Coverage (Gap Check)

Walk the PRD section by section. For every product rule, verify the contract
represents it. The PRD-to-Schema Trace from Point 0 is the starting map, but do
not trust it as exhaustive — re-walk the PRD.

- **Entities:** Every noun the PRD treats as a persistent thing must appear in the
  Domain Entity Inventory. Implied entities count (e.g., a PRD that says "users
  can favourite invoices" implies a `favourites` join table even if never named).
- **Fields:** Every attribute the PRD attaches to an entity must appear as a
  column in the Schema Specification. Watch for prose-only fields: "users see when
  an invoice was last viewed" implies a `last_viewed_at` column that's easy to
  miss.
- **Workflow states:** Every status value mentioned anywhere in the PRD must
  appear in an enum or CHECK constraint. Cross-reference the Schema
  Specification's enum definitions against the State Machine section — they must
  match exactly. A status in the state machine but missing from the enum is a
  critical gap.
- **Transitions:** Every transition the PRD describes must appear in the state
  machine, AND must be enforced somewhere — either by a trigger (preferred for
  state machines) or by an RLS UPDATE policy guard.
- **`⚑ DATA IMPLICATION` flags:** Locate every flag in the PRD. Each must have a
  corresponding column, table, or log entry in the contract AND a row in the
  PRD-to-Schema Trace.
- **Business invariants:** Rules like "invoice amounts cannot be negative" must
  appear as either a CHECK constraint or a trigger. Prose-only invariants are gaps.
- **Computed/derived values:** If the PRD describes a value derived from others (a
  total, a status badge, a formatted display), verify the contract specifies
  whether it is stored (with a recomputation trigger) or computed at read time.
  Either is acceptable; silence is not.

For every gap reported in Section 3 of the report, quote the PRD line that implies
the storage need. Without a quoted anchor, the finding is unfalsifiable — drop it.

### 2. Schema Specification Rigor

For every entity not marked `🔒 SCHEMA FROZEN`:

- **Primary key:** Present, typed (`uuid` with `gen_random_uuid()` default, or
  another defensible choice).
- **Tenancy:** If the entity is tenant-scoped per the PRD, it MUST carry
  `tenant_id` directly OR have a documented FK chain to a tenant-scoped parent. If
  neither, this is a critical gap — the most common silent cause of cross-tenant
  data leaks.
- **Foreign keys:** Every FK must specify `ON DELETE` behaviour (`CASCADE`,
  `RESTRICT`, `SET NULL`). Missing cascade behaviour is a data-integrity time bomb.
- **Timestamps:** `created_at` and `updated_at` (`timestamptz`, default `now()`)
  on every entity unless explicitly justified.
- **Indexes — RLS columns:** Every column referenced in any RLS policy for this
  entity MUST be indexed. Verify by cross-referencing the RLS Policy Specification
  against the index list. **This is the single highest-impact check in this
  audit** — missing indexes on RLS columns cause queries that pass review and time
  out in production.
- **Indexes — FK columns:** Every FK column should be indexed (Postgres does not
  auto-index FKs).
- **Index naming:** Indexes MUST follow the contract convention
  `idx_<table>_<columns>`. Off-pattern names are minor findings but worth flagging
  — downstream tooling may rely on the convention.
- **CHECK constraints:** Every business invariant that can be expressed as a
  column-level check (non-negative amounts, valid enum subsets, date ordering)
  must appear as a CHECK constraint.
- **Enum coverage:** Every enum type's value list must match the state machine for
  that entity. No silent omissions.

### 3. RLS Policy Specification — The Eight Rules

For every entity not marked `🔒 SCHEMA FROZEN`, walk the RLS Policy Specification
against each of the eight mandatory rules from Part A. For each rule, output PASS
or FAIL with the offending policy.

1. **RLS enabled.** `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` present for
   every public-schema table.
2. **Separate policies per operation.** No `FOR ALL`. Each table has up to four
   policies (SELECT, INSERT, UPDATE, DELETE).
3. **Explicit role.** Every policy specifies `TO authenticated` or another named
   role. No implicit role.
4. **Wrapped auth functions.** Every `auth.uid()` and `auth.jwt()` call appears
   wrapped in `(SELECT ...)` — `(SELECT auth.uid())`,
   `(SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)`. Unwrapped
   calls are a FAIL — they evaluate per-row at scale. Wrapping is necessary but
   not sufficient: the tenant predicate must also use the canonical form for the
   table's category (auth-domain vs ordinary) and the declared `**Auth shape:**` —
   not necessarily a top-level claim (Point 6a checks the form).
5. **UPDATE has both clauses.** Every UPDATE policy has BOTH `USING` AND
   `WITH CHECK`. Missing `WITH CHECK` on UPDATE is a tenant-isolation escape
   vector.
6. **INSERT uses WITH CHECK.** Every INSERT policy uses `WITH CHECK`, not `USING`.
   The `WITH CHECK` predicate must constrain the _new_ row's tenant scope or
   ownership — verify the predicate references the new row, not the caller's
   existing data.
7. **SECURITY DEFINER discipline.** Any helper function called from RLS that
   queries an RLS-protected table must be listed in the RLS Architecture Notes as
   `SECURITY DEFINER`, MUST live in a non-exposed schema, and MUST internally check
   `auth.uid()`. Verify all three.
8. **Permissiveness check (the bidirectional under/over-specification check).** For
   each policy, find the PRD lines that describe access for the relevant role. The
   policy must match the PRD's grant _exactly_ — neither narrower nor broader. Two
   failure modes:

   **8a — Over-restriction (most common silent failure).** The policy excludes
   access the PRD grants. Examples:
   - PRD says "any tenant member can view invoices" but the SELECT policy also
     requires `created_by = auth.uid()` → FAIL.
   - PRD says "admins can update any invoice" but the UPDATE policy restricts to
     `status = 'draft'` → FAIL unless a separate admin policy exists.
   - PRD is silent on a role's access and the policy excludes that role → FLAG
     (not a hard fail, but the contract should make the decision explicit, not
     assume restriction).

   **8b — Over-permission (a security vulnerability, classify as critical).** The
   policy allows access the PRD does NOT grant. This is a lazy-predicate failure —
   the author wrote tenant scoping and stopped, missing an ownership or role
   constraint the PRD requires. Examples:
   - PRD says "only the assignee can edit a task" but the UPDATE policy is
     `tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)`
     with no `assignee_id` check → critical FAIL. Any tenant member can edit any
     task.
   - PRD says "admins can delete invoices" but the DELETE policy applies to
     `TO authenticated` with only a tenant predicate → critical FAIL. Any member
     can delete.
   - PRD says "members see only their own drafts" but the SELECT policy is
     tenant-scoped only → critical FAIL.

   When flagging Rule 8 violations of either flavour, **cite the PRD line** that
   defines the correct grant. 8a violations go to Section 4 of the report; 8b
   violations go to Section 2 (critical) because they are security bugs.

### 4. State Machine Enforcement Location

State machines are enforced by triggers, not RLS. Verify enforcement location AND
transition coverage.

- **Enforcement location:** Every state machine in the contract has a
  corresponding entry in the Database Functions and Triggers section. No RLS
  policy attempts to enforce a state transition by comparing values across rows or
  referencing pseudo-`OLD`/`NEW` semantics. RLS cannot do this cleanly; if it
  appears, FAIL.
- **Acceptable RLS scoping:** UPDATE policies may restrict _which rows_ can be
  targeted by status (e.g., "only `draft` invoices are updatable"), which is
  acceptable. The forbidden pattern is enforcing the _transition_ itself in RLS.
- **Transition coverage (build a transition table).** For each state machine, walk
  every transition the PRD describes and every transition the trigger spec allows
  or forbids. Build a comparison table:

  | PRD transition | Allowed in trigger?                | Status                                |
  | -------------- | ---------------------------------- | ------------------------------------- |
  | `draft → sent` | yes                                | OK                                    |
  | `sent → paid`  | yes                                | OK                                    |
  | `sent → draft` | (PRD: forbidden)                   | OK if trigger forbids; FAIL if silent |
  | `paid → draft` | (PRD: forbidden, money-trail rule) | FAIL — trigger does not forbid        |

  A trigger that silently allows a PRD-forbidden transition is a critical finding
  (Section 2). A PRD-required transition with no trigger handling is a schema gap
  (Section 3).

### 5. Phase-Marker Integrity

For each entity in the contract:

- **Marked `🔒 SCHEMA FROZEN`:** Verify a corresponding migration file is
  referenced. Verify no `**Pending migration:**` notes are missing for any change
  implied by the PRD since the freeze. If the migrations directory is provided,
  verify the migration's columns, types, and policies match the frozen entry
  exactly — when they diverge, the migration wins (see Inputs), and the contract is
  the one in error.
- **Not marked frozen:** Verify the entry contains a complete Schema Specification
  AND a complete RLS Policy Specification. If either is partial, the entry should
  not exist yet; flag as incomplete.
- **Inconsistent state:** An entry with a freeze marker but an updated schema table
  that doesn't match the referenced migration is a critical gap — the contract is
  lying about the source of truth.

### 6. Auth Domain Boundary

Point 0 Sub-check E has already verified the `**Auth shape:**` declaration exists
and names a recognised value. This point checks consistency — does the declared
shape match the rest of the contract? — and applies mode-specific structural rules.

#### 6a. Shape ↔ schema consistency (always runs)

The declared shape must be internally consistent with every other mention of auth
tables, columns, or routes in the contract. A declaration that contradicts the
schema is a critical finding — the contract is silently inconsistent about the
project's fundamental auth model, and downstream tooling will follow one signal
while the rest of the contract follows the other.

Walk the contract for these contradictions:

- Declared `single-membership multi-tenant` but a `tenant_memberships` (or
  similarly named join) table is defined anywhere → critical FAIL.
- Declared `single-membership multi-tenant` but `public.users` lacks a `tenant_id`
  column, OR the column is nullable → critical FAIL.
- Declared `multi-membership multi-tenant` but no membership join table is defined
  → critical FAIL.
- Declared `multi-membership multi-tenant` but `public.users` has a NOT NULL
  `tenant_id` column → critical FAIL (the schema is single-membership; the
  declaration is wrong, or the schema is).
- Declared `solo` but any `tenants` table or `tenant_id` column appears anywhere →
  critical FAIL.
- Declared `custom` but no axis of divergence is named on the declaration line or
  immediately below it → Section 5 finding (the declaration is unfalsifiable;
  future readers cannot tell what's custom about it).
- RLS policies elsewhere in the contract reference `tenant_id` via
  `auth.jwt() ->> 'tenant_id'` while the declared shape is `solo` → critical FAIL.
- RLS policies use a membership-resolution helper (e.g. `is_member_of(tenant_id)`)
  while the declared shape is `single-membership multi-tenant` (which gets
  `tenant_id` from JWT directly with no helper) → Section 5 finding (likely
  over-engineered, but not a security defect).
- An ordinary domain table using the wrong category form for its declared shape —
  an auth-domain, membership-from-uid subquery where the shape calls for the
  active-tenant claim, or vice versa → critical FAIL: scoped wrongly. The form must
  match the table's category and shape per the project's tenant-isolation rule
  (`.cursor/rules/01-database.mdc` Rule 6).
- An auth-domain table (`users`, `tenants`, the membership/join table,
  invitations) using the active-tenant JWT-claim form → critical FAIL. Auth-domain
  tables resolve membership from the uid, never from the active-tenant claim;
  claim-scoping the membership or workspace-list table shows only the user's
  current workspace, not every workspace they belong to (the "empty workspace
  list" bug).
- A multi-membership tenant predicate that reads the active-tenant claim at a path
  other than `app_metadata.tenant_id` (e.g. the top-level
  `auth.jwt() ->> 'tenant_id'`) → critical FAIL. The canonical form is
  `(SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid)`.

When flagging a 6a contradiction, do not pick a side — the declaration may be
wrong, the schema may be wrong, or both. The patch in Section 6 of the report MUST
surface the contradiction and defer the resolution decision to the contract
author.

#### 6b. Stub-mode checks (apply only when the Auth Domain is a stub)

A stub-mode Auth Domain is identified by the presence of `⚠️  STUB ONLY — DO NOT
POPULATE` immediately under the `**Auth shape:**` line. When the contract is in
stub mode:

- No schemas, no policies, no routes beneath the stub heading. Anything beneath the
  assumptions block is a boundary violation.
- The **Auth assumptions block** beneath the stub MUST list:
  - The tenancy column or join structure appropriate to the declared shape
    (`tenant_id` for single-membership, `tenant_memberships` for multi-membership,
    none for solo).
  - The role values used elsewhere in the contract.
  - JWT claims relied on by RLS policies.
  - Helper functions relied on by RLS policies.
- **Cross-reference (the original Point 6 check):** every JWT claim, role value,
  and helper function referenced in any RLS policy elsewhere in the contract MUST
  appear in the assumptions block. A claim used in a policy but not declared in the
  assumptions block is a critical FAIL — the auth build won't know to provide it.

#### 6c. Populated-inline-mode checks (apply only when the Auth Domain is populated)

A populated Auth Domain has full schema, RLS, and route sections beneath the
heading — like any other domain. When the contract is in populated-inline mode:

- The auth domain is audited by Points 1–5 like any other domain. No
  cross-reference check is required here (the policies define their own claims and
  helpers locally).
- The `**Auth shape:**` declaration must still appear under the section heading
  (verified in Point 0 Sub-check E).
- Sub-point 6a above still applies — the declared shape must match the schema
  actually defined in the section.

### 7. Cross-Cutting Hygiene

- **Service-Role Inventory:** Every use of the service-role key outside
  provisioning and explicit auth-build carve-outs must appear in the Service-Role
  Inventory section with a one-line justification. Unjustified service-role use is
  a critical security failure — it bypasses every RLS policy just audited. A
  missing Service-Role Inventory section, when service-role usage is implied
  anywhere (provisioning, webhooks, admin tasks), is itself a critical finding.
- **Route collision guards:** Every entity with a dynamic route (`/[id]`) must list
  reserved static segments under `⚠️ STATIC ROUTES`. Missing guards cause runtime
  route shadowing bugs that won't surface until production.
- **Environment variable completeness:** Every secret referenced anywhere in the
  contract (Stripe keys, webhook secrets, third-party API tokens, signing keys)
  must appear in the Environment Variable Registry of its consuming domain. Note
  the location (Vercel env vars, Supabase Vault, or both) — server-only secrets
  must NOT carry the `NEXT_PUBLIC_` prefix.
- **Webhook idempotency:** If any external service sends webhooks (Stripe, GitHub,
  Slack, etc.), verify a `processed_<service>_events` or equivalent idempotency
  table exists AND has appropriate RLS (typically service-role-only — no
  `TO authenticated` policy on this table; user code should never read it). Missing
  idempotency is a silent duplicate-charge or duplicate-action vector. An
  idempotency table with permissive RLS is a tampering vector.
- **Storage IAM:** If a Storage Contract is present, verify access policies are
  scoped to specific buckets and path prefixes. Wildcard actions (`s3:*`,
  full-bucket access) without justification are a FAIL. Storage RLS policies must
  follow the same eight rules from Point 3 as table policies — walk all eight
  against the storage policies, not just rules 1–3.
- **Decision marker quality.** The contract uses `**Decision:**` markers to record
  non-obvious architectural choices. Two failure modes:
  - A `**Decision:**` marker exists but has no rationale ("**Decision:** use
    cascade delete." with no _why_) — flag as a Section 5 finding.
  - The contract makes a non-obvious choice (`RESTRICT` over `CASCADE`, a
    non-default index strategy, a non-`uuid` primary key, a soft-delete pattern)
    without any `**Decision:**` marker — flag as a Section 5 finding. Future humans
    editing the contract will not know what was chosen and why.

## The audit report

The audit produces a structured **Audit Report** in the format below — not a
rewritten contract. Be terse; the reader needs the patches, not commentary.

**Numbering rule:** Findings are numbered globally across Sections 2–5 (F1, F2,
F3, …) so that Section 6's patches can reference them directly. A finding that
requires multi-location patches gets letter suffixes in Section 6 (F3a, F3b, F3c)
but a single global number in Sections 2–5.

### 1. Executive Summary

- **Status:** [PASS / CONDITIONAL PASS / FAIL]
- **Completeness gate:** [PASS / FAIL — if FAIL, name the missing artifact]
- **Critical violations (security, RLS, boundary, over-permission):** [count]
- **Schema gaps (missing entities, columns, enums, indexes, transitions):** [count]
- **Under-specification flags (policies more restrictive than PRD):** [count]
- **Other inconsistencies:** [count]

Status rules:

- **FAIL** if the completeness gate fails, OR any critical violation exists, OR any
  schema gap that would prevent a feature from functioning.
- **CONDITIONAL PASS** if only under-specification flags or other inconsistencies
  remain — these require human review but don't block development.
- **PASS** only if all checks return clean.

### 2. Critical Violations

RLS rule failures (rules 1–7), Rule 8b over-permissions (security), unjustified
service-role use, boundary violations, missing webhook idempotency, idempotency
table with permissive RLS, wildcard IAM, PRD-forbidden state transitions allowed
by trigger, completeness-gate sub-check failures (Action Inventory mismatch,
missing helper declaration, missing smoke-test coverage, missing or unrecognised
`**Auth shape:**` declaration, PRD actor with no matching contract role), auth
shape declaration contradicting the schema (Point 6a). For each:

- **Finding ID:** F\<n>
- **Location in contract:** entity name, section name, line if visible
- **Rule violated:** the inspection point and rule number
- **Anchor:** quoted PRD line OR contract rule that grounds the finding
- **Why it matters:** one sentence

### 3. Schema Gaps

Missing entities, missing columns, enum/state mismatches, missing indexes on RLS
columns, missing FK cascade behaviour, missing CHECK constraints, PRD-required
transitions missing from trigger spec. For each:

- **Finding ID:** F\<n>
- **PRD reference:** quoted PRD line
- **What's missing in the contract:** terse description
- **Where it should go:** entity, section

### 4. Under-Specification Flags (Rule 8a)

Policies more restrictive than the PRD requires. For each:

- **Finding ID:** F\<n>
- **Policy name and entity**
- **PRD anchor:** the PRD line that grants the broader access (quoted)
- **Why the policy is over-restrictive:** terse description

This section deserves special attention. Over-restriction is the most common
silent failure in AI-generated contracts.

### 5. Other Inconsistencies

Route collision guards, env var registry omissions, phase-marker inconsistencies,
missing or empty `**Decision:**` markers, off-pattern index names. For each:

- **Finding ID:** F\<n>
- **Location and description**
- **Anchor:** contract rule or convention being violated

### 6. Required Patch Snippets

For every finding F1…Fn from sections 2, 3, 4, and 5, provide a patch under the
same finding ID. If a finding requires changes in multiple places, produce one
patch per location and suffix the ID (F3a, F3b, F3c). Sort patches by finding ID.

Each patch contains:

1. **Rationale:** One or two sentences. Cite the PRD line or the contract rule
   that's being violated (this echoes the anchor from sections 2–5 for
   self-contained readability).
2. **Patch:** The exact, copy-pasteable Markdown or SQL block needed to fix the
   contract. Provide ONLY the corrected block (a single column row, a single
   `CREATE POLICY` statement, a single index, a single table cell). Do not rewrite
   broader sections.

Format each patch as:

```markdown
### Patch F<n>[<a|b|c>]: <short description>

**Location:** `<entity name>` → <section name>
**Rationale:** <one or two sentences with quoted anchor>
**Patch:**
\`\`\`sql
-- or markdown, as appropriate
<the exact replacement or addition>
\`\`\`
```

When a finding spawns multi-location patches (e.g., adding a column also requires
adding an index and updating an RLS policy), include a one-line note under the
parent finding ID explaining the relationship, then list F\<n>a, F\<n>b, F\<n>c in
order.

## Applying the patches

Inspecting and applying are separate steps. The audit emits the report and the
isolated patch snippets of Section 6, nothing more. Applying them is explicit:

1. Edit `docs/DATA_CONTRACT.md` in place using the patch snippets already produced
   in Section 6. Apply nothing that was not already emitted as a patch — invent no
   new schema, policy, or wording at apply time.
2. Keep the contract's original voice and structure. This is editing, not
   rewriting — touch only the blocks the approved patches name, and add no change
   markers, inline comments, or changelog beyond the single audit-status line in
   step 3.
3. Write or refresh the audit-status marker as the FIRST line of
   `docs/DATA_CONTRACT.md`. There is only ever one such line; a re-audit overwrites
   it, and it must reflect the contract's current state:
   - **Any critical (Section 2) finding still unresolved** → never write a PASS or
     CONDITIONAL marker. Write
     `> ⛔ Contract audited — status: FAIL (<n> unresolved critical) — <YYYY-MM-DD>`.
   - **All critical findings resolved, only flags or other inconsistencies left** →
     `> ✅ Contract audited — status: CONDITIONAL PASS — <YYYY-MM-DD>`.
   - **Nothing left to resolve** →
     `> ✅ Contract audited — status: PASS — <YYYY-MM-DD>`.
4. The updated `docs/DATA_CONTRACT.md` is the artifact of record.
5. Note which findings were applied, which were skipped, and any unresolved
   critical (Section 2) findings that still block the contract.

**First-turn clean PASS.** If the audit finds nothing — zero findings,
completeness gate clean — there is nothing to apply, but the marker is still
recorded so downstream steps can confirm the audit ran. Stamp
`> ✅ Contract audited — status: PASS — <YYYY-MM-DD>` as the first line of
`docs/DATA_CONTRACT.md`.

## What the audit does not do

- It does not rewrite the contract while inspecting — the separate apply step does.
- It does not produce migrations or SQL beyond what's needed for patches.
- It does not audit code or migrations except as a source-of-truth reference for
  frozen entries.
- It does not second-guess explicit `**Decision:**` markers in the contract —
  those are the architect's calls and stand unless they contradict the PRD. (It
  DOES flag missing or empty `**Decision:**` markers — that's about discipline, not
  about overriding the call.)
- It does not invent new categories of violation. If an issue is found that doesn't
  fit any inspection point, include it in Section 5 with a brief explanation of why
  it matters.

---

## Where this fits in the roadmap

The contract is derived and audited as an opening phase of the roadmap, in this
order:

```
prototype-enriched docs/PRD.md
  → derive docs/DATA_CONTRACT.md (Part A)
  → audit docs/DATA_CONTRACT.md against docs/PRD.md (Part B), freeze at handoff
  → walking-skeleton scaffold builds the migrations via the Supabase MCP
  → auth build provisions the auth domain
  → feature slices
```

Preceding step: `docs/project_start/build-reference/prd-prototype-reconciliation.md`.
Following steps: `docs/project_start/build-reference/scaffold.md` (which builds the
schema from this contract, applying migrations via the Supabase MCP) and
`docs/project_start/build-reference/auth.md` (which owns the auth domain). The
roadmap that sequences all of this is written per
`docs/project_start/04-writing-the-roadmap.md`. Always-on rules that govern the
schema and RLS: `.cursor/rules/01-database.mdc` (schema, RLS, migrations) and
`.cursor/rules/02-api.mdc` (service-role discipline, routes).
