# Walking-Skeleton Scaffold — Build Reference

> **Audience:** Claude Code, executing the roadmap's walking-skeleton phase.
> **When to use:** As a **build phase of the roadmap**, immediately after the
> data contract is derived (`docs/project_start/build-reference/data-contract.md`)
> and before the auth build (`docs/project_start/build-reference/auth.md`). This
> phase takes the project from "contract audited" to "walking skeleton live" —
> design tokens applied, layouts and route stubs in place, auth UI stubbed,
> baseline `public.users` table migrated, and a clean build/typecheck/lint.

The walking skeleton is the thin end-to-end shell of the product: real design
tokens reaching the browser, both layouts (marketing and app), a stub page for
every route, the auth UI surface wired to real Supabase, and the baseline
`public.users` table with its signup trigger. It builds **nothing** inside the
Auth Exclusion Zone — that is the auth build's territory
(`docs/project_start/build-reference/auth.md`).

The phase is structured in three parts:

- **Part 1 — Configuration & tokens.** Ingest specs, derive the Route Map and
  Nav Map, inject the design system from `docs/DESIGN_TOKENS.md`, install the
  Shadcn/UI components the skeleton needs.
- **Part 2 — Walking skeleton.** Layouts, route stubs, error boundaries, auth
  UI, the baseline `public.users` migration, and autonomous build/typecheck/lint.
- **Part 3 — Verification (automation-first).** The scaffold's routing,
  unauthenticated-redirect, error-rendering, and auth-UI checks ship as
  Playwright E2E tests (`apps/web/e2e/smoke.spec.ts`) and gate the phase — no
  human sitting. The only human-judgment residue (subjective brand styling)
  is not verified here; it defers to the roadmap's end-of-roadmap Final UAT
  (`.cursor/rules/05-vertical-slice.mdc`; ADR-0019).

> **Universal rules live in `.cursor/rules/`.** This reference does not restate
> rules enforced on every task forever — Claude Code reads the rule files
> automatically. Specifically: the `getUser()` mandate (`.cursor/rules/04-auth.mdc`),
> runtime declarations (`.cursor/rules/00-architecture.mdc`), RLS patterns
> (`.cursor/rules/01-database.mdc`), service-role discipline
> (`.cursor/rules/02-api.mdc`), and the real-Supabase-from-day-one mandate
> (`.cursor/rules/05-vertical-slice.mdc`) all apply here without repetition. This
> reference specifies _what_ the skeleton builds; the rule files enforce _how_ it
> must be built.

---

## Phase gates and checkpoints

The scaffold is the opening build territory of the roadmap. It is gated on both
sides:

- **Upstream gate — the data contract.** Do not scaffold until
  `docs/DATA_CONTRACT.md` exists and its audit line reads `PASS` or
  `CONDITIONAL PASS`. If there is no `Contract audited by ... — status:` line, or
  the status is `FAIL`, the contract must be finished first
  (`docs/project_start/build-reference/data-contract.md`). A `FAIL` contract
  produces a skeleton on unsound schema assumptions.
- **Downstream hand-off — the auth build.** The scaffold stops at the edge of the
  Auth Exclusion Zone. Provisioning, middleware, tenant schema, role assignment,
  and the real onboarding round trip are all owned by
  `docs/project_start/build-reference/auth.md`, which runs next.

Part boundaries are git-tagged as build checkpoints so a failed part can be
reverted cleanly:

| Checkpoint            | Meaning                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `scaffold-phase-1-ok` | Configuration & tokens complete: tokens injected, Route/Nav Map settled, Shadcn components installed.                               |
| `scaffold-phase-2-ok` | Walking-skeleton code complete: layouts, stubs, auth UI, baseline migration applied, build/typecheck/lint green. E2E not yet green. |
| `scaffold-phase-3-ok` | Scaffold E2E checks green — walking skeleton fully complete.                                                                        |

If a part fails partway through, revert to the previous tag before re-running.
Partial token injections, half-installed Shadcn components, or partial layout
writes corrupt a retry. A build that fails any internal check is **not** tagged —
the failure is reported and the phase halts.

---

## Part 1 — Configuration & tokens

### Ingestion and preconditions

Before building anything:

1. **Read the specs in full:** `docs/PRD.md`, `docs/DATA_CONTRACT.md`,
   `docs/DESIGN_TOKENS.md`, `docs/COMPONENT_SPEC.md`, and every
   `.cursor/rules/*.mdc` file.
2. **Confirm the contract audit.** Check the top of `docs/DATA_CONTRACT.md` for
   the audit status line. Only `PASS` or `CONDITIONAL PASS` may proceed; `FAIL`
   or a missing line means the contract is not ready.
3. **Record project constants.** Ensure `docs/AI_STATUS.md` has a
   `## Project Constants` section holding the Supabase Project ID, Supabase
   Project URL, Sender Name, and Sender Email. **Never write API keys or secrets
   into `docs/AI_STATUS.md`** — secrets live exclusively in `.env.local` and the
   deployment platform's environment variables.
4. **Environment-variable pre-flight.** Read the Environment Variable Registry
   from every domain section of `docs/DATA_CONTRACT.md`. Verify every variable
   listed there exists in `apps/web/.env.local`. If any are missing, halt and
   report the missing variable names with the domain they belong to.

### Route Map and Nav Map

From `docs/PRD.md` and `docs/DATA_CONTRACT.md`, produce a **Route Map**:

- Every public route and every authenticated route. Use the **API Route
  Registry** in `docs/DATA_CONTRACT.md` for the per-entity route list.
- Every user type and its primary route prefix (e.g. `operator → /dashboard`).
  Use the **User Types and Routing** section of `docs/DATA_CONTRACT.md`.
- Every domain whose entity inventory is marked **⚠️ STUB ONLY** — these are
  **not** scaffolded.

From the Route Map, derive a **Nav Map**:

- API routes (`/api/*`, webhook endpoints, callback routes) are **excluded** — they
  are not user-navigable.
- **Exclusion Zone routes** (`/onboarding`, `/settings/members`) are **excluded**
  — they are the auth build's responsibility
  (`docs/project_start/build-reference/auth.md`), and rendering stale links to
  them produces 404s.
- The remaining page routes are organised per user type per the User Types and
  Routing section.
- If `docs/DATA_CONTRACT.md` contains an explicit Nav Map section, use it
  verbatim and skip the derivation above.

The Route Map and Nav Map are the settled inputs to Part 2 — they must be
readable, not buried in prose. Any entry you are uncertain about is flagged for
human review rather than proceeding silently. Once settled, they are recorded in
`docs/AI_STATUS.md` and **not re-derived** in Part 2.

### Design-token extraction

From `docs/DESIGN_TOKENS.md`, extract and confirm:

- The **Tailwind Config Block** (Section 7) — injected verbatim below.
- The **Shadcn/UI Theme Variables** (Section 8) — injected into `globals.css`.
- The **font loading approach** (Section 3) — confirm whether `next/font/google`
  or the `<link>` fallback applies. Use `next/font/google` (Option A) by default.

> **`docs/DESIGN_TOKENS.md` is documentation truth, and the implementation wins on
> any disagreement.** Claude Design produces `docs/DESIGN_TOKENS.md` (along with
> `docs/COMPONENT_SPEC.md`, the brand-voice rule `.cursor/rules/07-brand-voice.mdc`,
> the design-system package, and the prototype). The scaffold implements
> `apps/web/tailwind.config.ts` from that document here. If the implemented config
> and the document ever diverge, the implemented `tailwind.config.ts` is
> authoritative — but the correct move is to bring the two back into agreement, not
> to let them drift.

### Brand-asset detection

Check for the following files (each may or may not exist) and record which are
present in `docs/AI_STATUS.md`:

- `apps/web/public/logo.svg` — full wordmark for marketing surfaces
- `apps/web/public/logomark.svg` — compact mark for app sidebars and dense surfaces
- `apps/web/public/logo-on-dark.svg` — wordmark variant for dark surfaces (e.g. marketing footer)
- `apps/web/public/favicon.svg` — browser favicon

If the design package was inserted upstream
(`docs/project_start/03-inserting-the-design.md`), all four should exist. If they
are absent, the layouts in Part 2 fall back to a text wordmark — acceptable for
the walking skeleton, but note it for follow-up.

### Design-token injection

Inject the design system from `docs/DESIGN_TOKENS.md` in three steps:

1. **`apps/web/tailwind.config.ts`:** Merge the Tailwind Config Block from
   Section 7 into `theme.extend`. Replace all existing placeholder token values.
   Do not invent values — use only what is in the file.
2. **`apps/web/app/globals.css`:** Replace the Shadcn/UI CSS custom-property block
   with the Theme Variables from Section 8. Include dark-mode variables if Section
   8 defines them.
3. **`apps/web/app/layout.tsx`:** Implement font loading using the confirmed
   approach:
   - **`next/font/google` (default):** Import the font(s) via the
     `next/font/google` API as specified in Section 3, and apply the CSS-variable
     classNames to the `<html>` element.
   - **`<link>` tag (fallback only):** Add the Google Fonts `<link>` import to
     `<head>` with `display=swap`. Use this only if `next/font` is explicitly
     unavailable.

### Token-injection verification (required)

A typecheck pass alone does **not** prove tokens are reaching the browser. Both
of the following are required:

- Run `turbo run typecheck` — must pass.
- Start the dev server (`pnpm dev --filter web` or equivalent), wait for ready,
  then `curl -s http://localhost:3000/` and confirm the served HTML contains:
  - At least **three** of the CSS custom properties defined in Section 8 of
    `docs/DESIGN_TOKENS.md` (grep for `--`-prefixed custom-property names).
  - The font CSS-variable class name applied to `<html>` (if `next/font/google`
    is used).
- Stop the dev server.

**Spacing-scale assertion — the scale must stay Tailwind-native.** This is the
**second net**: the design doctor already asserted the scale at intake (Phase 0.5
of `03-inserting-the-design.md`, `npm run design:doctor`), against the source
token CSS. Re-asserting here against the injected `tailwind.config.ts` is
defence in depth — it catches a renumbering introduced during injection itself.
Parse the numeric spacing scale from the injected `tailwind.config.ts` and assert
every numbered spacing token resolves to Tailwind's default pixel value:

| Token | Pixels                      |
| ----- | --------------------------- |
| `1`   | 4px                         |
| `2`   | 8px                         |
| `3`   | 12px                        |
| `4`   | 16px                        |
| `6`   | 24px                        |
| `8`   | 32px                        |
| `10`  | **40px** (never renumbered) |
| `12`  | 48px                        |
| `16`  | 64px                        |
| `24`  | 96px                        |

If any numbered token diverges — e.g. `10` resolves to 72px instead of 40px —
**halt and report**: the design package shipped a renumbered scale, which silently
breaks every spacing utility across the codebase. Off-scale values must be
expressed as **named** spacing tokens (e.g. `--space-section`), which are exempt
from this assertion. The numeric scale stays native; named tokens carry the
exceptions.

### Shadcn/UI component inventory

Install only the Shadcn/UI components the **walking skeleton** needs: auth forms,
layouts, navigation, error boundaries (`Card`, `Button`), and any component needed
for the stub pages built in Part 2. Run the appropriate `npx shadcn-ui add`
commands.

Do **not** install components required only for features built after the walking
skeleton — those are installed at the start of their respective feature slices,
when the full requirements are known.

### Close out Part 1

1. Confirm the internal checks passed: environment-variable pre-flight,
   `turbo run typecheck`, and the served-HTML verification (CSS custom properties
   and font class reached the browser).
2. Record in `docs/AI_STATUS.md`: the Route Map, Nav Map, user types and their
   route prefixes, design-tokens source file (`docs/DESIGN_TOKENS.md`), font
   loading approach used, and Shadcn components installed. Also record the
   token-injection summary and brand-asset presence (see the summary shape below).
3. Commit and tag: `git commit -am "Scaffold Part 1 configuration complete" && git tag scaffold-phase-1-ok`.

If any check failed, do **not** tag the commit. Report the failure and halt.

#### Part 1 completion record (write into `docs/AI_STATUS.md`)

```
### Files Modified
[Every file created or modified]

### Route Map
[Public routes, authenticated routes, user type → route prefix mapping]

### Nav Map
[Per user type. Input to Part 2.]

### Items Flagged for Human Review
[Any Route/Nav Map entries you were uncertain about, or "None"]

### Stub-Only Domains
[Domains marked ⚠️ STUB ONLY that will NOT be scaffolded]

### Design Tokens
- Font loading approach: [next/font/google | <link> fallback]
- Tailwind config: [INJECTED / FAILED]
- globals.css theme variables: [INJECTED / FAILED]
- Served-HTML verification: [PASS — N custom properties found / FAIL — details]
- Spacing-scale assertion: [PASS — Tailwind-native / FAILED — token X resolves to Ypx]

### Brand Assets
- logo.svg: [PRESENT / ABSENT]
- logomark.svg: [PRESENT / ABSENT]
- logo-on-dark.svg: [PRESENT / ABSENT]
- favicon.svg: [PRESENT / ABSENT]
- Brand voice rule (.cursor/rules/07-brand-voice.mdc): [PRESENT / ABSENT]

### Shadcn Components Installed
[List]

### Build Status
turbo run typecheck: [PASS / FAIL]
```

---

## Part 2 — Walking skeleton

Part 2 assumes Part 1 is complete and tagged. Its primary source of truth is the
settled Route Map and Nav Map in `docs/AI_STATUS.md` — **do not re-derive them.**
Read specific spec sections only as needed (the User Types and Routing section of
`docs/DATA_CONTRACT.md` for layouts, the auth-relevant sections of `docs/PRD.md`
and the error-state guidance in `docs/COMPONENT_SPEC.md` for auth forms and error
boundaries).

### The Auth Exclusion Zone — what the skeleton must NOT build

This is the boundary between the scaffold and the auth build. The following are
owned exclusively by the auth system and are **never** created, stubbed, or
partially scaffolded by the walking skeleton. The canonical list lives in
`.cursor/rules/04-auth.mdc` § "Auth Exclusion Zone"; it is reproduced here because
respecting it is the defining constraint of this phase:

**Files:**

- `middleware.ts` (also must not be modified — it was verified upstream)
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `lib/supabase/admin.ts`
- `lib/auth/` (entire directory)
- `lib/onboarding/` (entire directory)
- `tenant-system.config.ts`
- `types/supabase.ts` (do not create; extend only if it already exists with non-auth types)

**Routes:**

- `/onboarding` (any variant)
- `/settings/members`
- `/auth/callback`

**Navigation rule for Exclusion Zone routes.** If a Nav Map item points to an
Exclusion Zone route whose destination page does not yet exist, render it as a
**disabled/greyed** element — non-clickable, with a `title`/`aria-label` of
"Coming soon". Never render an active link to a page that does not exist (it
404s), and never create the destination page to make the link work — that page is
owned by the auth build. This is the canonical rule in `.cursor/rules/04-auth.mdc`
§ "Navigation rule for Exclusion Zone routes".

> **On `/auth/callback` specifically.** The callback route is in the Exclusion
> Zone and is **not** created by the scaffold. It is an **inert session-exchange
> handler** — its sole responsibility is to call
> `supabase.auth.exchangeCodeForSession(code)`, redirect to `/` on success, and
> redirect to `/login` with an error parameter on failure. It must never write to
> `public.users` or any domain table, and must never call provisioning or
> tenant-assignment logic — doing so would fracture the "Onboarding Limbo" state
> the downstream middleware depends on. The auth build owns and creates it
> (`docs/project_start/build-reference/auth.md`); the scaffold only needs to know
> the route exists so navigation can account for it.

### App shell & layouts

Build the two core layouts:

**Marketing layout (`app/(marketing)/layout.tsx`):**

- Public — no auth required.
- Header with navigation links to `/login` and `/signup`. Footer.
- Style everything with the design tokens in `tailwind.config.ts`.
- **Brand assets:** if `apps/web/public/logo.svg` exists, use it in the header. If
  `logo-on-dark.svg` exists and the footer has a dark surface, use that variant.
  If no logo asset exists, render a text wordmark using the project name.
- **Copy:** if `.cursor/rules/07-brand-voice.mdc` exists, follow its rules for all
  visible text (header nav labels, footer copy). Otherwise use plain
  sentence-case labels.

**App layout (`app/(app)/layout.tsx`):**

- Authenticated — protected by the template middleware (which must **not** be
  modified; it is in the Exclusion Zone).
- Sidebar with navigation. Use the Nav Map from `docs/AI_STATUS.md` — do **not**
  re-derive nav items from the API Route Registry.
- **Brand assets:** if `apps/web/public/logomark.svg` exists, use it as the
  sidebar header mark. If only `logo.svg` exists, use it sized down. If no asset
  exists, render a text wordmark.
- Header with user avatar/name bound to the session user (no hardcoded values)
  and a Log Out button.
- Declare `cache: 'no-store'` — **mandatory** for all authenticated layouts.

### Route stubs

Build a stub page for every **page route** in the Route Map recorded in
`docs/AI_STATUS.md`. (API routes are not stubbed — only user-navigable page
routes.) Each stub renders a single `<h1>` with the page name. No content yet —
content is delivered by feature slices after the walking skeleton.

### Error boundaries (acceptance criteria, not stubs)

For every route-group layout created in this phase, co-locate an `error.tsx` and a
`not-found.tsx`. Also create `app/global-error.tsx` at the root level. These are
**production UI**, not placeholders — style them with design tokens.

Each error file must render, at minimum:

- A Shadcn/UI `<Card>` wrapping the content.
- A heading (`<h2>` or `<CardTitle>`) with a short error message: "Something went
  wrong." for `error.tsx` and `global-error.tsx`; "Page not found." for
  `not-found.tsx`.
- A body paragraph giving one sentence of context.
- Button actions:
  - `error.tsx` / `global-error.tsx`: "Try again" (calls the `reset()` prop) and
    "Go home" (navigates to `/`).
  - `not-found.tsx`: "Go home" (navigates to `/`). A single button suffices.

If `.cursor/rules/07-brand-voice.mdc` exists, the error message and body copy must
follow its tone — typically sentence case, matter-of-fact, no apology theatre, no
celebration.

### Auth forms & full loop

Build the complete authentication **UI** and flow, wired to **real Supabase from
day one**. No mock states. No boolean auth flags. If
`.cursor/rules/07-brand-voice.mdc` exists, all form copy (labels, button text,
success and error messages, page headings) follows its rules — errors are
matter-of-fact, not apologetic; successes are quiet, not celebratory.

**Sign Up (`/signup`):** Shadcn `<Form>` with email and password. Zod validation:
email format, password minimum 12 characters. On success: redirect to
`/confirm-email`. Never redirect to the dashboard — email confirmation is
mandatory.

**Confirm Email (`/confirm-email`):** Static holding page only. Message: the user
must click the confirmation link in their email before logging in. No data
fetching. No logic.

**Log In (`/login`):** Shadcn `<Form>` with email and password. On success:
redirect to the post-login route for the user's role as defined in the User Types
and Routing section of `docs/DATA_CONTRACT.md`. On failure: inline error message —
never a raw Supabase error string.

**Forgot Password (`/forgot-password`):** Email field. Triggers the Supabase
password-reset email. On submission: show confirmation **regardless** of whether
the email exists — do not leak account existence.

**Update Password (`/update-password`):** The destination Supabase redirects to
after the user clicks the password-reset link. Supabase appends a token to the URL
on redirect; this page exchanges it for a session and renders a form with a
new-password field (minimum 12 characters, Zod-validated). On success: redirect to
the post-login route for the user's role. On failure (expired or invalid token):
display an inline error and link back to `/forgot-password`. This page **must** be
a static route — it must not be handled by any dynamic catch-all. (The Supabase
email template's redirect URL must point at this route; that verification is
handled upstream — do not attempt it here.)

**Log Out:** Server Action calling `supabase.auth.signOut()`, redirecting to `/`.
Wire it to the Log Out button in the app layout.

**Auth Provider:** A React Context provider wrapping `(app)/layout.tsx`. Exposes
the current session and listens to `supabase.auth.onAuthStateChange()`. Auth client
and session-read rules are governed by `.cursor/rules/04-auth.mdc` §§ "The
getUser() Mandate" and "Client Type Rules" and are not restated here.

**Auth Provider scope.** The Auth Provider exposes session state **only**. It does
**not** trigger provisioning, write to domain tables, or make decisions based on
onboarding state — those concerns belong entirely to the downstream onboarding
flow (`docs/project_start/build-reference/auth.md`) and must not be pre-empted
here. Implement the Auth Provider as a separate `'use client'` component that wraps
the layout's children — the layout file itself must remain a Server Component.

### Baseline `public.users` table and signup trigger

Every auth shape this toolchain supports (multi-membership multi-tenant,
single-membership multi-tenant, solo) requires a `public.users` row mirroring each
`auth.users` row. The auth build (`docs/project_start/build-reference/auth.md`)
extends this row with shape-specific columns (`tenant_id` for single-membership,
profile fields it detects during its own interview, etc.), but the baseline
columns and the row-creation mechanism are universal, so the scaffold owns them.

**Why a trigger, not the callback or an RPC.** Creating this row via a database
trigger — rather than via the auth callback route or the provisioning RPC — makes
the operation atomic with the underlying auth signup, eliminates the
silent-failure surface of an unchecked client-side upsert, and removes the entire
class of "users row missing when a downstream FK fires" ordering bugs. The scaffold
owns the baseline; the auth build owns shape-specific extensions and is written to
`ALTER` the existing `public.users` rather than create it from scratch.

Create `supabase/migrations/[timestamp]_baseline_public_users.sql` with:

1. **`CREATE TABLE IF NOT EXISTS public.users`** with these columns and nothing
   more:
   - `id` UUID PRIMARY KEY REFERENCES `auth.users(id)` ON DELETE CASCADE
   - `email` TEXT NOT NULL
   - `full_name` TEXT (nullable; populated from `raw_user_meta_data` if present at
     signup, otherwise NULL)
   - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`
   - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `now()`

   Do **not** add `tenant_id`, role columns, or any shape-specific columns here —
   those are added by the auth build based on the declared `**Auth shape:**` in
   `docs/DATA_CONTRACT.md`.

2. **`CREATE OR REPLACE FUNCTION public.handle_new_auth_user()`** — `SECURITY
DEFINER`, `LANGUAGE plpgsql`. The body inserts into
   `public.users (id, email, full_name)` using `NEW.id`, `NEW.email`, and
   `NEW.raw_user_meta_data->>'full_name'`. Use `ON CONFLICT (id) DO NOTHING` so the
   trigger is idempotent against backfills.

3. **`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();`**

4. **RLS:** enable RLS on `public.users`. Add a single SELECT policy
   `users_self_select` with `USING (id = (SELECT auth.uid()))` — the sub-select
   form is required. **No** INSERT/UPDATE/DELETE policies — writes happen via the
   trigger (SECURITY DEFINER) or, later, via the auth build's provisioning
   function. This default-deny posture is correct.

**Apply the migration via the Supabase MCP `apply_migration` tool** — the standard
apply path in `.cursor/rules/01-database.mdc`. The agent applies every migration
itself using the credentials in `.env`; never hand a migration to the SQL Editor
and never use `supabase db push`. Do **not** proceed if the migration fails to
apply. After applying, regenerate the shared DB types
(`packages/supabase`) — via the Supabase MCP `generate_typescript_types` tool — so
the workspace type package reflects the new table.

**Do NOT include in this migration:** `tenants`, `memberships`,
`tenant_invitations`, `tenant_access_requests`, role columns, JWT metadata setup,
the `create_tenant_and_owner_membership` RPC, or any shape-specific logic. All of
those are owned by the auth build (`docs/project_start/build-reference/auth.md`).

Record in `docs/AI_STATUS.md`: migration filename, table created, trigger created,
RLS posture (enabled, self-select policy only).

### Autonomous build & integrity check

Run the following and **fix all failures autonomously** — do not ask the human to
run these:

```
turbo run build
turbo run typecheck
turbo run lint
```

Then verify the `@project/supabase` workspace package resolves correctly in
`apps/web`. Do not proceed to spec sync if any check fails.

### Spec sync

1. Compare the actually-implemented file structure against `docs/PRD.md`. If the
   implementation diverged from the spec, update the **spec** to reflect reality —
   not the reverse.
2. Verify `docs/DATA_CONTRACT.md` is current: the API Route Registry lists every
   route scaffolded, the User Types and Routing table matches the implemented
   roles, and the Domain Entity Inventory reflects any entities discovered during
   the phase.

(`database.types.ts` is regenerated as part of applying the baseline migration
above; there is no further schema to reconcile at this point, since the scaffold
applies only the one baseline migration.)

### Close out Part 2

1. Confirm the internal checks passed: `turbo run build`, `turbo run typecheck`,
   `turbo run lint` all green, and `@project/supabase` resolving from `apps/web`.
2. Record the Part 2 completion summary in `docs/AI_STATUS.md` (see shape below).
3. Mark Part 2 as "Code Complete — Pending E2E" in `docs/AI_STATUS.md`. It is not
   fully complete until the Part 3 scaffold E2E checks are green.
4. Commit and tag: `git commit -am "Scaffold Part 2 walking skeleton code complete" && git tag scaffold-phase-2-ok`.

If any check failed, do **not** tag the commit. Report the failure and halt.

#### Part 2 completion record (write into `docs/AI_STATUS.md`)

```
### Files and Folders Created
[Every file and folder created in Part 2. MUST include:]
- supabase/migrations/[timestamp]_baseline_public_users.sql — baseline
  public.users table, handle_new_auth_user trigger function,
  on_auth_user_created trigger, RLS enabled with self-select policy

### Auth Exclusion Zone — identified but NOT scaffolded
[Routes intentionally skipped, or: "None — no Exclusion Zone conflicts."]

### User Type Route Folders Scaffolded
[e.g. app/(app)/dashboard/ for operator, app/(app)/portfolio/ for investor;
 or "N/A — single user type"]

### Stub-Only Domains (⚠️ STUB ONLY in DATA_CONTRACT.md)
[List, or "None"]

### Spec Sync Results
- PRD divergence: [NONE / UPDATED — describe]
- DATA_CONTRACT divergence: [NONE / UPDATED — describe]

### Build Status
turbo run build:     [PASS / FAIL]
turbo run typecheck: [PASS / FAIL]
turbo run lint:      [PASS / FAIL]

### Baseline migration
- Applied via Supabase MCP apply_migration: [YES / FAILED]
- DB types regenerated (packages/supabase): [YES / FAILED]
```

At this point the walking-skeleton code is complete: wired to real Supabase, auth
forms live, design tokens applied, all route stubs present, and the baseline
`public.users` table migrated. The skeleton is only **fully** complete once the
Part 3 scaffold E2E checks are green.

---

## Part 3 — Verification (automation-first)

**These checks are agent work, not a human sitting.** Automation-first (ADR-0015,
ADR-0019): anything a Playwright E2E test can verify ships as a test, not a UAT.
The scaffold's checks are all such — the agent writes them into
`apps/web/e2e/smoke.spec.ts` and they gate the phase by passing in CI. The one
human-judgment residue — that the auth UI is styled on-brand (not just present) —
is not verified here; it rolls into the roadmap's end-of-roadmap Final UAT.

**Precondition.** Part 2 is marked "Code Complete — Pending E2E" in
`docs/AI_STATUS.md` and the `scaffold-phase-2-ok` tag exists.

**Scope of these checks.** Stub pages render only a page-name `<h1>`. These checks
validate **routing, unauthenticated behaviour, and auth-UI rendering** — they do
**not** validate authenticated round trips. Full authenticated-round-trip
verification (signup → email confirmation → workspace creation → landing on the
authenticated dashboard) belongs to the auth build
(`docs/project_start/build-reference/auth.md`), which runs after provisioning logic
exists. The backend round trip cannot be verified here because provisioning logic,
tenant schema, and role assignment have not yet been built.

The four E2E checks the scaffold ships:

1. **Sign Up → confirm-email redirect.** Submitting the Sign Up form redirects
   to `/confirm-email`, **not** the dashboard. Confirms the email-confirmation
   gate is wired.
2. **Log In with invalid credentials.** A wrong password yields a visible inline
   error message — not a raw Supabase error string, not a page crash.
3. **Unauthenticated access.** Navigating directly to the primary authenticated
   route (e.g. `/dashboard`) while logged out redirects to `/login` with no
   authenticated content visible. Exercises the template middleware.
4. **Auth UI renders across all auth routes.** While logged out, each of
   `/login`, `/signup`, `/forgot-password`, `/update-password`, `/confirm-email`
   loads without errors and renders the expected form (or holding-page copy for
   `/confirm-email`), with inline, human-readable form-validation errors — no raw
   Supabase error strings, no page crashes. (Whether the styling is _on-brand_ is
   the subjective residue that defers to the Final UAT — the E2E test only asserts
   the elements render and behave.)

If any check fails, diagnose and fix before proceeding; the phase is not complete
until all four are green in CI.

### Close out Part 3

Once all four E2E checks pass in CI:

1. Update `docs/AI_STATUS.md`: mark Part 2 complete (replacing "Code Complete —
   Pending E2E") and record scaffold E2E as GREEN with today's date.
2. Commit and tag: `git commit -am "Scaffold E2E green — walking skeleton complete" && git tag scaffold-phase-3-ok && git push --tags`.

The walking skeleton is complete. The roadmap continues with the **auth build**
(`docs/project_start/build-reference/auth.md`), which reads the declared
`**Auth shape:**` from `docs/DATA_CONTRACT.md` directly and builds provisioning,
middleware wiring, tenant schema, and the authenticated round trip on top of the
skeleton.

- If the contract declares a **`custom`** auth shape, the auth build flags that no
  automated build applies and auth must be built by hand from the contract.
- If there is **no `**Auth shape:**` line** (or the Auth Domain section is
  missing), this violates the data contract's invariant
  (`docs/project_start/build-reference/data-contract.md`). Fix
  `docs/DATA_CONTRACT.md` by declaring the shape before proceeding — do not guess
  the shape.

---

## Hard rules for this phase

- **Never touch the Auth Exclusion Zone.** Do not create, stub, modify, or
  partially scaffold any file or route listed above (including `middleware.ts`,
  `lib/supabase/*`, `lib/auth/`, `lib/onboarding/`, `/onboarding`,
  `/settings/members`, `/auth/callback`). The canonical list is
  `.cursor/rules/04-auth.mdc` § "Auth Exclusion Zone".
- **The spacing scale stays Tailwind-native.** `10` is 40px and is never
  renumbered; off-scale values are named tokens. Halt on any divergence.
- **Real Supabase from day one.** No mock auth states, no boolean auth flags. The
  auth UI is wired to real Supabase; the baseline migration is applied to the real
  project.
- **Migrations are applied by the agent via the Supabase MCP `apply_migration`
  tool** — never a SQL-Editor hand-off, never `supabase db push`. Regenerate
  `packages/supabase` types after applying.
- **RLS is always in scope.** The baseline `public.users` migration enables RLS
  with the sub-select self-select policy; the default-deny posture (no
  write policies at the scaffold level) is deliberate.
- **The scaffold applies exactly one migration.** All tenant/membership/role
  schema is deferred to the auth build.
- **A failing check is never tagged.** Report the failure and halt; revert to the
  previous checkpoint tag before re-running.
