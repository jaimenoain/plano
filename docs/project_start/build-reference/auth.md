# Auth Build — Provision the Auth Domain Deterministically

> **Audience:** Claude Code, executing the roadmap's auth build phase.
> **When to use:** As the fourth opening phase of the roadmap — after the
> data contract (`docs/project_start/build-reference/data-contract.md`) and
> the walking-skeleton scaffold (`docs/project_start/build-reference/scaffold.md`)
> are in place, and before the first feature slice. This guide is the source
> of truth for how the auth domain is bound, gated, built, and diagnosed.

This guide explains how the auth domain is built. It reads
`docs/DATA_CONTRACT.md` and `docs/PRD.md` for every project-specific value,
never interviews, and produces auth that is correct on the first round trip:
the auth schema and RLS, the provisioning function(s), the limbo-gate
middleware, onboarding, and — for multi-membership — workspace selection and
member management.

The phase has five parts, in order:

```
AUTH_SPEC  →  Preflight gate  →  The build  →  (Doctor, only if it misbehaves)
   |
   +--  Supabase auth/email/secrets requirements (dashboard-side, prerequisite)
```

1. **AUTH_SPEC** binds the project's facts — which routes are protected,
   which fields force onboarding, which roles route where — and sources every
   one of them to the PRD or contract. It produces `docs/AUTH_SPEC.md`.
2. **Preflight** is a six-precondition gate that HALTs on the first failure,
   so the build never runs on a broken baseline. It is a repeatable check.
3. **The build** writes the migrations, RLS, provisioning, middleware, and
   onboarding, branching on the declared auth shape.
4. **The doctor** is a fixed-sequence diagnostic — claim → middleware → RLS →
   provisioning — run when auth misbehaves. It is a repeatable check.
5. **Supabase auth/email/secrets requirements** are the dashboard-side and
   secrets-handling preconditions the whole flow depends on.

## What is fixed vs. what this phase decides

Auth architecture is **fixed** and lives in `.cursor/rules/`: the `getUser()`
mandate (`.cursor/rules/04-auth.mdc`), the RLS predicate forms
(`.cursor/rules/01-database.mdc` Rule 6), the trusted claim path, the
provisioning model, FK ordering, and service-role discipline
(`.cursor/rules/02-api.mdc`). Auth correctness depends on those being **the
same every time**; this phase never touches them.

This phase decides the project's _values_ (AUTH*SPEC) and builds the
shape-specific \_what*. It states the WHAT for the declared shape; the rules
enforce the HOW. Do not restate rule content — cite it.

> The line is decision rule 4 from `docs/project_start/00-how-bootstrapping-works.md`:
> state the _what_ (the project's facts and boundaries), never the _how_ (the
> code). The AUTH*SPEC layer is pure \_what*.

---

# Part 1 — AUTH_SPEC: bind the project before the build

`docs/AUTH_SPEC.md` is the binding layer. It produces the project-specific
_values_ the build needs — which routes are protected, which fields force
onboarding, which roles route where, the post-login destination, the tenancy
routes — and sources every one of them.

It is **not** an auth-architecture generator. It does not invent middleware
logic, RLS predicate forms, provisioning patterns, or the JWT-claim mechanism.
Those are fixed. Binding the values _explicitly and up front_ — rather than
threading them through a mid-build interview by hand — is what prevents the
classic "fields missing / routes not wired up / RLS too restrictive" failures,
which come from late, hand-threaded binding.

## Step 1 — Read the auth shape (do not infer the architecture)

Read `docs/DATA_CONTRACT.md`'s Auth Domain section. Find the line of the form
`**Auth shape:** <value>`. This is canonical. Record it verbatim. It selects
which build tasks run.

- `solo`, `single-membership multi-tenant`, or `multi-membership multi-tenant`
  → a recognised shape; the build below branches on it.
- `custom` → no variant applies; note that auth must be built by hand. The
  spec is still useful as a sourced value list, but flag clearly that no
  automated build consumes it.

If no `**Auth shape:**` line exists, HALT and report that the contract must
declare its auth shape (per the Auth Domain Boundary Rule in
`docs/project_start/build-reference/data-contract.md`) before this phase can
run. Do not guess the shape.

## Step 2 — Naming drift pre-check (catch the silent killer)

Before binding any values, cross-check the entity NAMES the contract uses
against the names the build expects. Name mismatches compile cleanly and fail
at runtime — they are a top cause of "RLS too restrictive / nothing loads."

Known check (multi-membership): the contract template names the join table
`tenant_memberships`, but the build below references `memberships` throughout
(RLS, middleware, provisioning). If the contract and the build disagree on ANY
auth-domain table name (`users`, `tenants`, the membership/join table,
`tenant_invitations`, `tenant_access_requests`), record it under a
`## Naming Reconciliation` section in the spec with BOTH names and a one-line
note on which the build will actually use. Do not silently rename — surface it
so it can be confirmed that the build and contract are aligned. The preflight
gate (Part 2, Check 3) verifies this live.

## Step 3 — Extract and bind every value the build needs

For EACH value below, do three things: (a) state the value, (b) quote or cite
the exact PRD/contract location that justifies it (section heading + a short
identifying phrase — never a long passage), (c) if no source can be found,
mark it `⚠️ NO SOURCE` and resolve it as a product decision before finalising
the spec (see "Resolving unsourced values" below). Never fill an unsourced
value with a guess.

**Routing**

1. `protectedRoutes` — every URL path/prefix that requires authentication.
   Source: PRD user flows + the contract's route registry. Cross-check against
   the scaffold's route stubs recorded in `docs/AI_STATUS.md`.
2. `postLoginRoute` — where an authenticated, fully-onboarded user lands.
   Source: the PRD's description of the primary landing screen.

**Onboarding (the "fields missing" failure)**

3. `requiredUserFields` — columns on `public.users`, beyond
   `id/email/created_at/updated_at`, that are NOT NULL with no default and
   therefore must be collected before the user can use the app. Source: the
   contract's user entity definition. For EACH field, record the name and the
   PRD/contract line that says it's required. If any required field exists,
   onboarding is implied — set `onboardingRoute` (default `/onboarding`, but
   confirm against the scaffold's stubbed route). If none exist, state
   explicitly: "No onboarding flow needed beyond email confirmation."

**Roles (the "RLS too restrictive" failure)**

4. `roles` — every role value the contract's RLS relies on. Source: the
   contract's "Role values used by RLS" line AND the PRD's Permission Matrices.
   Run the **actor-completeness check**: every distinct PRD Permission Matrix
   Actor (excluding synthetic/`System`/`(SR)` actors) MUST map to a contract
   role value. Any PRD actor with no contract role is role drift — record it as
   `⚠️ ROLE DRIFT` and resolve it as a product decision. This is the same drift
   the build's RLS authoring would otherwise hit, surfaced now instead of at
   runtime.
5. (multi-tenant variants) `adminRoles` — which role values can manage members
   / update the tenant. Source: PRD permission matrix rows.
6. (if roles route differently) `userTypes` / role-to-route mapping — only if
   the PRD says different roles see different parts of the app. Source: PRD
   routing description. Default: all roles share routes.

**Tenancy (multi-tenant variants only)**

7. `selectWorkspaceRoute`, `onboardingRoute`, `postSelectRoute`,
   `tenantScopedPrefix` — source from the contract's Active-tenant mechanism
   notes and the PRD's workspace flow. For `solo`, omit this whole group.

**Invitations / access requests (multi-membership only)**

8. Whether invitations and/or access-request flows are enabled, and the
   accept-route shape. Source: the PRD's collaboration/team flows. If the PRD
   describes no team/sharing flow, mark these disabled.

### Resolving unsourced values

Where a value has no source in the PRD or contract, it is a **product
decision**, not a technical one. Resolve each with a single direct question
that offers a convention-based default — for example:

> The scaffold stubbed `/dashboard` as the landing route, but the PRD does not
> say where users land after login. Use `/dashboard`? (yes / a different route)

A confirmed default is recorded as `source: user-confirmed default` (not
`inferred` — it was confirmed). Do not finalise `docs/AUTH_SPEC.md` while any
`⚠️` marker remains: an open value means the build will guess, and the guess
becomes a broken page at UAT. Resolving it here costs one word.

## Step 4 — Write `docs/AUTH_SPEC.md`

Produce the artefact below. Every value is filled; every value has a source
line. There are no blanks and no `⚠️` markers left — if any remain, an
unsourced value was skipped; resolve it first.

```markdown
# AUTH_SPEC.md — Bound Auth Values for This Project

> Generated from docs/PRD.md and docs/DATA_CONTRACT.md. This is the binding
> layer the auth build consumes. Every value below is traced to its source.
> The build reads this file in place of any interview.

**Auth shape:** <verbatim from contract>
**Matching build variant:** <a recognised shape below, or "custom — build by hand">

## Naming Reconciliation

<Either "No mismatches — contract and build agree on all auth-domain table
names." OR a table: Contract name | Build name | Build uses | Note.>

## Routing

| Value                           | Resolved | Source                                              |
| ------------------------------- | -------- | --------------------------------------------------- |
| protectedRoutes                 | <list>   | <PRD/contract location or "user-confirmed default"> |
| postLoginRoute                  | <route>  | <source>                                            |
| (tenancy routes, if applicable) | ...      | ...                                                 |

## Onboarding

| Required field    | Type | Why required | Source |
| ----------------- | ---- | ------------ | ------ |
| <field or "NONE"> | ...  | ...          | ...    |

onboardingRoute: <route or "n/a — no required fields">

## Roles

| Role value | Routes to           | Admin?   | Source   |
| ---------- | ------------------- | -------- | -------- |
| <role>     | <route or "shared"> | <yes/no> | <source> |

Actor-completeness: <"All PRD actors map to a contract role." OR the
resolution chosen for any drift.>

## Invitations / Access Requests (multi-membership only)

- Invitations: <enabled/disabled> — <source>
- Access requests: <enabled/disabled> — <source>

## Open assumptions

<Anything confirmed as a default rather than sourced from the PRD/contract,
listed plainly so preflight and UAT know what was a judgement call vs. a
documented requirement. If none: "None — every value is sourced from the PRD
or contract.">
```

`docs/AUTH_SPEC.md` is a committed artefact. The build reads it directly —
there is no interview to skip.

### Hard rules for AUTH_SPEC

- Never invent a value. Unsourced → resolve as a product decision.
- Never quote more than a short identifying phrase from the PRD/contract.
- Never decide architecture. The shape comes from the contract's declaration.
- Every value in the finished spec carries a source line; no `⚠️` markers remain.

---

# Part 2 — Preflight: gate the build before it runs

Most auth builds that "fail" actually fail because a precondition was wrong and
nobody noticed until UAT — the SMTP test went to spam, an env var was missing
in Preview, the scaffold baseline drifted, or the spec still had an open
assumption. Preflight verifies all of those _before_ a single migration runs,
and HALTs with a specific fix for the first one that's wrong. It writes no auth
code. It is a **repeatable** check — run it again after fixing any failure.

The only files preflight may modify are `docs/AI_STATUS.md` (to log the result)
and nothing else. Read `docs/AUTH_SPEC.md` and `docs/AI_STATUS.md` first for
context (auth shape, matching variant, project constants).

## Why each check matters

Each check targets a named failure mode the build otherwise assumes silently:

| #   | Check                                     | Failure it prevents                                                    |
| --- | ----------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Spec is complete                          | Build guesses an open value → "fields missing / not wired up"          |
| 2   | Scaffold baseline is real                 | ALTERs land on the wrong/absent table → "not wired up"                 |
| 3   | Naming alignment is live-verified         | RLS on a wrongly-named table denies everything → "RLS too restrictive" |
| 4   | SMTP genuinely delivers                   | Confirmation email never arrives → "login isn't finished at UAT"       |
| 5   | Env vars in all three Vercel environments | A var set only in Production → Preview deploys fail auth silently      |
| 6   | Clean DB state                            | A half-applied prior migration collides with the fresh build           |

Run the six checks IN ORDER. HALT at the first FAIL with the stated remedy — do
not run later checks on a broken precondition, and do NOT proceed to the build.

## Check 1 — Spec completeness

Open `docs/AUTH_SPEC.md`.

- **PASS if:** the file exists, declares an `**Auth shape:**`, names a matching
  build variant, and contains NO `⚠️`, `TODO`, `<...>` placeholder, or
  `NO SOURCE` markers anywhere.
- **FAIL → HALT:**
  > ⚠️ AUTH_SPEC.md is incomplete (found: <list each marker + location>).
  > Re-derive the open values (Part 1) and resolve them before preflight can pass.

## Check 2 — Scaffold baseline is live and correct

Confirm the scaffold's Phase-3 baseline exists (recorded in `docs/AI_STATUS.md`
per `docs/project_start/build-reference/scaffold.md`). Then query the linked
Supabase project (read-only):

- `public.users` table exists with at least `id, email, full_name, created_at,
updated_at`.
- Trigger `on_auth_user_created` exists on `auth.users` (function
  `public.handle_new_auth_user`).
- `public.users` has RLS enabled.
- **PASS if** all present in the expected shape.
- **FAIL → HALT**, naming exactly what's missing, e.g.:
  > ⚠️ Scaffold baseline drift: trigger `on_auth_user_created` not found on
  > auth.users. The build ALTERs this baseline; it cannot run without it.
  > Re-run the scaffold's baseline task, or restore the scaffold baseline,
  > before preflight can pass.

## Check 3 — Naming alignment (contract ↔ build)

Read the `## Naming Reconciliation` section of `docs/AUTH_SPEC.md` and the
auth-domain table names the build below actually references (RLS, middleware,
provisioning). Confirm they agree on every auth-domain table name. Where the
spec recorded a mismatch with a "Build uses" resolution, confirm the build in
fact uses that name throughout.

- **PASS if** names align (or the recorded resolution matches the build).
- **FAIL → HALT:**
  > ⚠️ Auth table name mismatch: the contract/spec expects `<X>` but the build
  > references `<Y>` in <where>. RLS and middleware built against `<Y>` will not
  > match a contract written for `<X>`, producing runtime denials. Reconcile the
  > names (pick one, update the other) before the build runs.

## Check 4 — SMTP actually delivers (human-confirmed)

Confirm the custom SMTP config exists (Supabase custom SMTP → Resend; see
Part 5). Then ask the user to trigger a real test email and confirm THREE
facts. Do not accept "it worked":

> Please send a test email from Supabase → Authentication → SMTP Settings, then
> tell me: (1) did it arrive in the inbox (not spam)? (2) does the sender match
> your project? (3) does the link point to your real app domain (not localhost,
> unless testing locally)?

- **PASS only** on explicit yes to all three.
- **FAIL → HALT** with the specific failing fact and a pointer to SMTP settings
  / email-template redirect URLs (Part 5). A link pointing at the wrong domain
  is the exact cause of "login isn't finished at UAT."

## Check 5 — Env vars in all three Vercel environments

Verify presence (NOT values) of `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`NEXT_PUBLIC_APP_URL` in Production, Preview, AND Development. Check
`apps/web/.env.local` for local presence too.

- **PASS if** all present in all three remote environments + local.
- **FAIL → HALT** listing each missing var × environment, with where to add it
  (Vercel → Project Settings → Environment Variables) and a reminder to redeploy
  after adding.

## Check 6 — Clean DB state (no half-applied prior run)

Query the linked DB for partial auth artefacts that would collide with a fresh
build: a `tenants` / membership / `tenant_invitations` table that exists but is
empty or incomplete, or auth-domain RLS policies present without their tables.
These indicate a prior build failed mid-apply — **a git revert does not undo a
migration already applied to the remote project.**

- **PASS if** the DB is at the clean post-scaffold baseline (Check 2 shape, no
  extra partial auth tables).
- **FAIL → do NOT auto-destroy anything.** Report exactly what partial state
  exists and ask:

  > ⚠️ Found partial auth schema from what looks like a prior failed build:
  > <list>. A git revert doesn't undo a migration already applied to the remote
  > project. Before a clean build, this needs resolving. I can show you the exact
  > objects to drop, or the linked DB can be reset to the scaffold baseline. How
  > do you want to proceed?

  Then HALT — the human decides; do not drop tables unprompted.

## Result

If all six PASS:

1. Append to `docs/AI_STATUS.md` under a `## Auth Preflight` heading: the date,
   all six checks marked PASS, and the matching build variant.
2. Proceed to the build (Part 3), which reads `docs/AUTH_SPEC.md` for its bound
   values instead of interviewing.

If any check FAILED, halt at it with its remedy. Do not proceed. Fix the issue
and re-run the six checks.

---

# Part 3 — The build: provision the auth domain deterministically

This is the deterministic build the rest of the phase is built around: Part 1
produced the bound values, Part 2 verified the preconditions, this part builds,
and Part 4 diagnoses it if it misbehaves. It reads `docs/AUTH_SPEC.md` for every
project-specific value and **never interviews**.

It is the auth-domain builder — shape-aware (`solo` / `single-membership` /
`multi-membership`), bound by `docs/AUTH_SPEC.md`. It writes the auth schema and
RLS, the provisioning function(s), the limbo-gate middleware, onboarding, and —
for multi-membership — workspace selection and member management. It is NOT an
architecture generator (the rule files own that); it does not decide the claim
path, the predicate form, or the provisioning location — those are fixed.

## Session init — HALT conditions (check all before any work)

1. Confirm preflight passed (its `## Auth Preflight` result is in
   `docs/AI_STATUS.md`). If not, HALT: "Run the preflight gate (Part 2) first —
   the build is gated on it."
2. Read `docs/AUTH_SPEC.md`. If it is missing, or contains any `⚠️`, `TODO`,
   `<...>` placeholder, or `NO SOURCE` marker, HALT: "AUTH_SPEC.md is incomplete
   — re-derive the open values (Part 1)." Record the `**Auth shape:**` value; it
   selects which tasks below run.
3. Read `docs/DATA_CONTRACT.md`: the Auth Domain stub (role values, JWT claims,
   helper functions the contract relies on), the Provisioning section, the
   Service-Role Inventory, and the RLS Architecture Notes.
4. Read `docs/PRD.md` for the team / collaboration / sharing flows
   (multi-membership invitations and access requests).
5. Read all `.cursor/rules/*.mdc`. These govern every decision here.

**Migration application:** apply each migration to the linked Supabase project
as you go, via the Supabase MCP `apply_migration` tool — the standard apply path
in `.cursor/rules/01-database.mdc` (the agent applies every migration itself,
using the `.env` credentials). Never hand a migration to a human via the SQL
Editor, and never `supabase db push`. Regenerate
`packages/supabase/src/database.types.ts` after each migration. Do NOT proceed
past a migration that fails to apply.

## Task 1 — Auth-domain schema + RLS (shape-specific)

Write one timestamped migration per logical step. ALTER the baseline
`public.users` created by the scaffold's baseline task — NEVER recreate it
(`.cursor/rules/04-auth.mdc` FK-ordering rule 2).

- **All shapes:** ALTER `public.users` to add the `requiredUserFields` from the
  AUTH_SPEC Onboarding table. If a required field is NOT NULL, add it NULLABLE
  first, then add the NOT NULL constraint in a later step once
  onboarding/provisioning can populate it — `public.users` may already hold a
  confirmed test user from scaffold UAT. Add a role column on `public.users`
  only if the AUTH_SPEC Roles table assigns per-user roles not carried on a
  membership.
- **solo:** no tenant tables. Ordinary domain tables key on
  `user_id = (SELECT auth.uid())` per `.cursor/rules/01-database.mdc` Rule 6.
- **single-membership:** create `tenants`. Add `public.users.tenant_id` (uuid,
  FK → tenants, NOT NULL once provisioning sets it — use the
  nullable-then-constrain pattern above).
- **multi-membership:** create `tenants` and `tenant_memberships(user_id,
tenant_id, role)`. Create `tenant_invitations` and/or `tenant_access_requests`
  ONLY if `docs/AUTH_SPEC.md` marks them enabled. Reserve the invite-accept
  static route ahead of any dynamic `/[token]` per
  `.cursor/rules/01-database.mdc` Static Route Collision Guard.
- **RLS on every table** per `.cursor/rules/01-database.mdc` (Default Deny; a
  separate policy per operation; the sub-select `(SELECT auth.uid())` form; both
  USING and WITH CHECK on writes; index every predicate column). These are
  AUTH-DOMAIN tables, so they use the membership-from-uid form in Rule 6 — **NOT
  the active-tenant claim**. Use the exact role values and helper functions
  named in the contract's Auth Domain stub. Declare any SECURITY DEFINER helper
  in the contract's RLS Architecture Notes (`.cursor/rules/01-database.mdc`
  Rule 7, helper-safety check) — this is the anti-recursion mechanism: a policy
  that must read the membership table cannot do so through RLS without
  recursing, so the read goes through a SECURITY DEFINER helper.
- Enumerate and run the contract's RLS Smoke Test Matrix
  (`.cursor/rules/01-database.mdc` Rule 8) for these tables before moving on. A
  passing migration does not prove RLS.

## Task 2 — Provisioning (shape-specific), per `.cursor/rules/04-auth.mdc`

`public.users` rows are NOT created here — the scaffold trigger owns them
(`.cursor/rules/04-auth.mdc` FK-ordering rule 2). The `/auth/callback` route
stays **INERT** (`.cursor/rules/04-auth.mdc` Callback Route Discipline) —
provisioning is invoked from a server action, never from the callback.

- **solo:** no provisioning function; the baseline trigger is sufficient.
- **single-membership:** a SECURITY DEFINER function (called from the
  workspace/owner-setup server action) that creates the tenant and UPDATEs
  `public.users.tenant_id`. FK-ordered and idempotent per
  `.cursor/rules/04-auth.mdc`.
- **multi-membership:** a SECURITY DEFINER provisioning function (e.g.
  `create_tenant_and_owner_membership`) that creates the tenant + owner
  membership — FK-ordered, idempotent, first-user role per the contract. After
  it runs, and on every workspace switch, set the active-tenant claim
  `app_metadata.tenant_id` (and role) via
  `supabaseAdmin.auth.admin.updateUserById`. This is the claim
  `.cursor/rules/01-database.mdc` Rule 6 (multi-membership domain tables) and
  the doctor's Probe 1 read.

## Task 3 — The limbo-gate middleware, per `.cursor/rules/04-auth.mdc`

Create `middleware.ts` (auth owns this file). Per the Middleware Requirements in
`.cursor/rules/04-auth.mdc` — `getUser()` on every request, **never**
`getSession()` — and the doctor's Probe 2:

- **Always-allow, never redirected:** `/login`, `/signup` (preserve query
  params), `/confirm-email`, `/auth/callback`, the invite-accept route
  (multi-membership), and static assets. A missing always-allow route is a
  classic login-loop cause.
- **Gate authenticated requests by onboarding state**, using the AUTH_SPEC
  routes:
  - missing any `requiredUserFields` → `onboardingRoute`.
  - (multi-membership) authenticated but no active-tenant claim →
    `selectWorkspaceRoute`.
  - otherwise → the user's `postLoginRoute` (role-to-route map from AUTH_SPEC).
- (multi-membership) handle zero / one / many memberships and tenant-segment
  cases without looping.

## Task 4 — Onboarding + workspace selection (only if implied by AUTH_SPEC)

- If `requiredUserFields` is non-empty: build the `onboardingRoute` page and a
  server action that validates the fields (Zod, per `.cursor/rules/02-api.mdc`)
  and UPDATEs `public.users`, then redirects onward. After it sets the last NOT
  NULL field, add the deferred NOT NULL constraint from Task 1.
- (multi-membership) build `selectWorkspaceRoute` and a create-workspace server
  action that calls the Task 2 provisioning function and sets the active-tenant
  claim, then redirects to `postSelectRoute`.
- If AUTH_SPEC states "No onboarding flow needed beyond email confirmation,"
  skip this task.

## Task 5 — Member management (multi-membership, only if AUTH_SPEC enables it)

Build the members route (AUTH_SPEC route, e.g. `/settings/members`), the invite
action, the static invite-accept route, and the access-request flow — each only
if AUTH_SPEC marks it enabled. The service-role operations (invite acceptance,
member role updates) MUST already appear in the contract's Service-Role
Inventory (`.cursor/rules/02-api.mdc` Service-Role Discipline). If any required
one is missing, HALT and report it as a Contract Gap — do not policy around it.

## Task 6 — Build & integrity check

Run `turbo run build`, `turbo run typecheck`, `turbo run lint`; fix all failures
autonomously. Regenerate `packages/supabase/src/database.types.ts`. Confirm
`@project/supabase` resolves from `apps/web`. Do not proceed if any check fails.

## Task 7 — Journey 1: the authenticated round trip

This is the round trip the scaffold deferred. Automation-first (ADR-0015,
ADR-0019) splits it by who can verify each step:

- **The one human gate — real-inbox email delivery.** That a confirmation email
  actually **arrives** in a real inbox (correct sender, link to the real app
  domain) can only be confirmed by a human, and every feature phase depends on a
  signed-in, provisioned user — so it is the roadmap's Phase-3 critical gate
  (`X.98`; see `04-writing-the-roadmap.md`). Walk the user through it and confirm
  the email arrives and its link signs them in. (If the link does not resolve,
  the Supabase email template is pointing at the wrong route/flow — it must match
  the `/auth/callback` code-exchange flow; see Part 5.)
- **Everything else ships as E2E, not a human sitting.** The agent writes these
  into `apps/web/e2e/smoke.spec.ts` and they gate the phase by passing in CI:
  1. (If onboarding) required fields complete → routed onward.
  2. (multi-membership) create or select a workspace → land on the post-select
     route.
  3. Land on the authenticated post-login route showing real session data — no
     hardcoded values.
  4. RLS spot check: a second user cannot see the first user's tenant-scoped data.

If the human gate fails, or any E2E check is red, stop and diagnose with the
doctor (Part 4), which probes the four surfaces (claim → middleware → RLS →
provisioning) in order and reports the first break.

## Close out

Only after all checks and Journey 1 (the human gate plus its E2E checks) pass:

1. Update `docs/AI_STATUS.md`: auth domain built (tables, provisioning function,
   claim mechanism, middleware, RLS posture), and the matching shape.
2. Continue to the roadmap's first feature slice
   (`docs/project_start/04-writing-the-roadmap.md`).

If anything failed, do not mark the phase complete — run the doctor (Part 4).

## Hard rules for the build

- Read every project-specific value from `docs/AUTH_SPEC.md`. Never interview;
  never invent a value. If a needed value is absent, the spec is incomplete —
  HALT and return to Part 1.
- Never decide architecture. The predicate forms
  (`.cursor/rules/01-database.mdc` Rule 6), claim path, provisioning model, and
  the `getUser()` mandate (never `getSession()`) are fixed in the rules.
- The `/auth/callback` route is inert. Provisioning is the scaffold trigger
  (baseline row) plus the provisioning function called from a server action
  (tenant/membership) — never the callback.
- Apply each migration via the Supabase MCP `apply_migration` tool; regenerate
  types after each. Never a SQL-Editor hand-off, never `supabase db push`.
- Do not restate `.cursor/rules/` content — cite it.

---

# Part 4 — The doctor: find the one broken seam

Run the doctor any time auth misbehaves and the cause is unclear — login loops,
an empty dashboard after a successful login, RLS denying operations that should
be allowed, onboarding that never completes, or UAT that can't get past login.
It reads the filesystem and queries the live database. It is **repeatable** and
changes nothing without confirmation.

Auth correctness is spread across four surfaces that must agree exactly: the JWT
claim, the middleware that reads it, the RLS policies that read it, and the
provisioning that sets it. When they disagree, the build compiles and passes
types but fails at runtime — which is why it "just doesn't work and you can't
tell why." The doctor probes the four surfaces in a **fixed dependency order**
— claim → middleware → RLS → provisioning — because a break early in that chain
_causes_ symptoms that look like breaks later in it. Report the FIRST failing
surface with the specific fix; the first FAIL is almost always the root cause,
and fixing it often clears several downstream symptoms. Do not regenerate auth
wholesale, and do not speculatively "also fix" issues past the confirmed root
cause.

## Symptom → likely surface (the doctor confirms which)

| Symptom                                                      | Likely surface                                                                                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Login loop / redirected back to `/login` while authenticated | claim or middleware (claim never set, or middleware reads the wrong path)                                                                 |
| Empty dashboard, no error                                    | RLS (policy denies legitimate reads) or claim (active tenant not set, so JWT-claim RLS matches nothing)                                   |
| "RLS too restrictive," operations denied                     | RLS pattern mismatch (auth-domain table using the JWT-claim pattern instead of the membership-subquery pattern, or a wrongly-named table) |
| Onboarding never finishes / required field stays null        | provisioning or spec (required field not collected, or trigger didn't fire)                                                               |
| UAT can't reach private pages                                | the login flow itself isn't complete — Probe 0 catches it before UAT time is wasted                                                       |

Read for context first: `docs/AUTH_SPEC.md` (bound values + shape),
`docs/AI_STATUS.md` (what was built), the build (Part 3, the intended design),
and `.cursor/rules/04-auth.mdc` and `.cursor/rules/01-database.mdc` (the
definition of correct). Note the auth shape — `solo` has no claim/tenant
surface, so Probe 1 and parts of Probe 3 differ.

## Probe 0 — Is the login flow even complete? (the UAT trap)

Before the four surfaces, confirm login actually works end-to-end, because a
half-finished login makes every later probe look broken.

- Does `middleware.ts` exist (not just the scaffold placeholder)?
- Do the auth actions (`lib/actions/auth.ts` or equivalent) exist and handle
  signup + callback?
- Does the auth callback route exist and provision/route correctly?
- Can a test user reach the post-login route at all?

If login is incomplete, STOP here and report: the build did not finish; this is
not a tuning problem. Point to the build task (Part 3) that owns the missing
piece. (This is the fix for "UAT asks me to test private pages but login isn't
finished.")

## Probe 1 — The JWT claim (skip for solo)

The active-tenant claim must be carried where the rest of the system reads it.
Per `.cursor/rules/01-database.mdc` Rule 6, that is `app_metadata.tenant_id`.

- Sign in a test user (service-role forged session or a real login) and inspect
  the session JWT. Is `app_metadata.tenant_id` present and a valid uuid after
  login / workspace select?
- Does provisioning / workspace-switch actually set it (via
  `supabaseAdmin.auth.admin.updateUserById`, per `.cursor/rules/04-auth.mdc`)?
- **FAIL signs:** claim is in `user_metadata` instead of `app_metadata`; claim
  never set after provisioning; claim set but stale after switch.
- Report the exact mismatch and the one-line fix (e.g. "provisioning sets
  `user_metadata`; middleware and RLS read `app_metadata` — align on
  `app_metadata` per `.cursor/rules/01-database.mdc` Rule 6"). Confirm before
  editing.

## Probe 2 — The middleware

Read `middleware.ts` against the intended gate logic (Part 3, Task 3).

- Does it read the active tenant from the SAME path Probe 1 verified
  (`session.user.app_metadata?.tenant_id`)?
- Are the always-allow routes complete — `/login`, `/signup` (with query params
  preserved), `/confirm-email`, `/auth/callback`, the invite-accept route,
  static files? A missing always-allow route is a classic login-loop cause.
- For multi-tenant: does it handle zero / one / many memberships and the
  tenant-segment cases without looping?
- **FAIL →** report the specific case that loops or over-redirects, and the fix.
  Confirm before editing.

## Probe 3 — The RLS policies (the "too restrictive" symptom)

Query the live policies. The correct predicate form depends on the table's role
and the auth shape (per Part 3, Task 1 and `.cursor/rules/01-database.mdc`
Rule 6):

- **Auth-domain tables** (`users`, `tenants`, the membership table, invitations)
  must use `auth.uid()`-based predicates with membership-resolution subqueries,
  in **every** shape — NOT the JWT-claim pattern. Using the claim pattern here
  is THE classic "too restrictive" bug: the workspace selector can't read the
  user's tenants because no active tenant is set yet, so everything denies.
- **Ordinary domain tables** take the form the auth shape dictates:
  - **solo** → `user_id = (SELECT auth.uid())` — no tenant scoping (and not
    accidentally scoped to a nonexistent tenant).
  - **single-membership** → the `public.users` subquery,
    `tenant_id = (SELECT tenant_id FROM public.users WHERE id = (SELECT auth.uid()))`.
  - **multi-membership** → the active-tenant claim,
    `(auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid = tenant_id`.
- Also confirm policies reference the ACTUAL table names (cross-check the Naming
  Reconciliation in `docs/AUTH_SPEC.md` — a policy on a wrongly-named table
  denies everything).
- Run a minimal live check: forge a session and confirm a legitimate read
  succeeds and a cross-user/cross-tenant read returns zero rows.
- **FAIL →** name the table, the wrong predicate, and the correct pattern.
  Confirm before editing the migration + re-applying it.

## Probe 4 — Provisioning & required fields (the "fields missing" symptom)

- Did the `on_auth_user_created` trigger create the `public.users` row at
  signup? Query a test user's row.
- For multi-tenant: did the provisioning function
  (`create_tenant_and_owner_membership` or variant equivalent) create the tenant
  - owner membership and set the claim?
- Are all `requiredUserFields` from `docs/AUTH_SPEC.md` actually collected by the
  onboarding flow and non-null after onboarding? A required field with no
  onboarding input is the "fields missing / never completes" bug.
- **FAIL →** name the field or step, trace to the AUTH_SPEC value and the build
  task (Part 3) that should handle it. Confirm before editing.

## Report format

1. **Symptom** (what was reported, or "general failure").
2. **First failing surface** (Probe N) with the root cause in one sentence and
   the evidence (the JWT path seen, the policy text, the query result).
3. **Proposed fix** — the smallest change that addresses the root cause, and
   which file/migration it touches.
4. Ask: "Apply this fix? (yes / explain more / I'll do it myself)"
5. On yes: apply, then RE-RUN all probes from 0 to confirm the fix cleared the
   symptom and introduced nothing new. Report the clean pass or the next failing
   surface.
6. If ALL probes pass and the symptom persists, say so plainly — the issue is
   outside the four surfaces (likely env/SMTP/deploy state); return to the
   preflight gate (Part 2) to check those.

## Hard rules for the doctor

- Diagnose in order. Report the FIRST break. Don't speculatively fix.
- Apply fixes only on explicit confirmation, smallest change possible.
- After any fix, re-run all probes — never declare success without it.
- Never regenerate the whole auth build to fix one surface.
- If a migration changes, re-apply it via the Supabase MCP `apply_migration`
  tool and regenerate types before re-probing.

---

# Part 5 — Supabase auth/email/secrets requirements

These are the dashboard-side and secrets-handling preconditions the whole auth
flow depends on. Preflight Check 4 verifies SMTP delivery; Check 5 verifies the
env vars. This section is the durable knowledge behind both — the confirmation
flow the code expects, the redirect URL pattern, the email-template formats, the
cross-device caveat, and the secrets rules.

## The code-exchange confirmation flow

This project uses the **code-exchange flow**. The email link runs through
Supabase's verify endpoint, which then redirects to the app with a `?code=` the
app exchanges for a session. The destination after the link is verified is
**not** set in the email template — it comes from the app code the scaffold
builds:

- Signup confirmation lands on `/auth/callback`, which calls
  `exchangeCodeForSession` and then routes onward.
- Password recovery lands on `/update-password`, which exchanges the token and
  shows the new-password form.

Do NOT point these links at `/auth/confirm` — no such route is built, so that
link will not resolve.

## URL configuration (Supabase → Authentication → URL Configuration)

- **Site URL:** the production URL (e.g. `https://example.com`).
- **Redirect URLs:** add `https://example.com/**`. The wildcard covers every
  route in the app, so it permits both `/auth/callback` and `/update-password`
  above.

## Email templates (Supabase → Authentication → Email Templates)

Ensure the _Password Reset_ and _Confirm Signup_ templates use
`{{ .ConfirmationURL }}` (Supabase's default link — the code-exchange link).

**Password Reset:**

```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

**Confirm Signup:**

```html
<h2>Confirm your email</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

> ⚠️ **Confirm before go-live.** In UAT (the build's Journey 1, Part 3), check
> that both links resolve all the way to a logged-in session. Note: the
> code-exchange flow can fail when the email is opened on a _different device_
> than the one used to sign up. If the team would rather use Supabase's
> `token_hash` + `verifyOtp` style instead, that is a larger change — it needs
> an `/auth/confirm` route built into the scaffold and the auth build. Flag it;
> do NOT switch the templates to `token_hash` without that route.

## Secrets rules

- Put every secret in its canonical home: `apps/web/.env.local` for local
  development, and the Vercel project's Environment Variables for the deployed
  environments (Production, Preview, Development). These are the stores the
  preflight gate verifies and `.cursor/rules/02-api.mdc` mandates. **Never commit
  secrets to git.**
- **Never expose the Supabase service-role key** (`SUPABASE_SERVICE_ROLE_KEY`).
  It bypasses every row-level-security policy — do NOT put it in Airtable or any
  spreadsheet. It belongs only in `.env.local` and Vercel env vars.
- For a shared team store, use a real secrets manager (1Password, Doppler, or
  the Vercel/Supabase native stores) — not a spreadsheet. Non-secret project
  metadata (project URL, project IDs) may live elsewhere, but no keys.
