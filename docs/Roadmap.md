# Implementation Roadmap: Building Credits (v2)

---

## Phase 1 — Database Schema

---

**[x] Task 1.1 — Create `people` table and migrate `architects` (individuals only)**

- Create `people` table: `id`, `name`, `slug`, `bio`, `nationality`, `birth_year`, `death_year`, `avatar_url`, `website`, `location_note` (carries over from `architects.headquarters`), `claimed_by_user_id` → profiles (nullable), `claim_status` enum (`unclaimed` | `claimed` | `verified`), `created_at`, `updated_at`
- Create `credit_role_enum` Postgres enum with all values from the role taxonomy (design_architect, architect_of_record, executive_architect, interior_architect, landscape_architect, urban_designer, conservation_architect, structural_engineer, mep_engineer, civil_engineer, geotechnical_engineer, facade_engineer, wind_consultant, acoustic_consultant, fire_engineer, lighting_designer, developer, main_contractor, project_manager, cost_consultant, planning_consultant, graphic_wayfinding_designer, art_consultant, sustainability_consultant, heritage_consultant, other)
- Create `credit_tier_enum`: `primary` | `contributor` | `ancillary`
- Insert only `type = 'individual'` rows from `architects` into `people`, preserving UUIDs; map `website_url` → `website`, `headquarters` → `location_note`; `avatar_url` starts null for all migrated rows
- Populate `claimed_by_user_id` by joining `profiles.verified_architect_id` (authoritative source of verified linkages); also inspect `architect_claims` where `status = 'verified'` as a secondary source for any records not covered; set `claim_status = 'claimed'` for all matched rows
- Generate slugs from `name` during migration; handle collisions with `-2`, `-3` suffix counter
- Add RLS: public read, authenticated insert, owner/admin update

**Verify:** `SELECT count(*) FROM people` equals count of `type = 'individual'` rows in `architects`; all slugs unique; `claimed_by_user_id` populated for all architects that had `profiles.verified_architect_id` set; `location_note` contains values from `headquarters` where present.

**Depends on:** nothing

---

**[x] Task 1.2 — Create `companies` table and migrate `type = 'studio'` architects**

- Create `companies` table: `id`, `name`, `slug`, `bio`, `country`, `founded_year`, `dissolved_year`, `logo_url`, `website`, `verified_domain`, `claim_status` enum (`unclaimed` | `claimed` | `verified`), `created_at`, `updated_at`
- Create `company_stewards` junction table: `id`, `company_id`, `user_id`, `role` enum (`owner` | `steward`), `invited_by` (nullable), `created_at`
- Insert all `type = 'studio'` rows from `architects` into `companies`, preserving UUIDs; map `website_url` → `website`, `headquarters` → `country` (best-effort; flag for manual review if value doesn't look like a country); `claim_status = 'unclaimed'` for all migrated rows initially
- For any studio that had a verified claim via `profiles.verified_architect_id`, insert a `company_stewards` row with `role = 'owner'` for that user
- Add FK constraints and indexes on `company_stewards(company_id, user_id)`; unique constraint on `companies.slug`
- Add RLS: companies publicly readable; `company_stewards` readable by members of the same company and admins; insert/update restricted to stewards and admins

**Verify:** `SELECT count(*) FROM companies` equals count of `type = 'studio'` rows in `architects`; previously claimed studios have an owner steward row; `company_stewards` RLS rejects reads from non-members.

**Depends on:** nothing

---

**[x] Task 1.3 — Create `person_company_affiliations` table and migrate `architect_affiliations`**

- Create `person_company_affiliations` table: `id`, `person_id` → people, `company_id` → companies, `year_from` (nullable integer), `year_to` (nullable integer), `role_note` (nullable text — free description of the relationship, e.g. "founding partner"), `created_at`
- Migrate all rows from `architect_affiliations` (studio_id ↔ individual_id) into `person_company_affiliations`; `person_id` maps from the individual, `company_id` maps from the studio (now a company); `year_from`/`year_to` null for all migrated rows (the old table didn't carry this data)
- Add indexes on `person_id` and `company_id`
- Add RLS: public read; authenticated insert; update/delete restricted to the person's `claimed_by_user_id`, any steward of the company, or admin
- No UI is built for this table in this feature — data is preserved and the schema is ready for a future affiliations UI

**Verify:** Row count matches `architect_affiliations`; `person_id` and `company_id` FKs resolve correctly against the new tables; a query joining `person_company_affiliations` → `people` → `companies` returns readable results.

**Depends on:** Tasks 1.1, 1.2

---

**[x] Task 1.4 — Create `building_credits` table and migrate `building_architects`**

- Create `building_credits` table with all columns: `id`, `building_id` → buildings, `person_id` → people (nullable), `company_id` → companies (nullable), `CHECK (person_id IS NOT NULL OR company_id IS NOT NULL)`, `role` (credit_role_enum), `role_custom` (text, nullable), `credit_tier` (credit_tier_enum, default `contributor`), `is_lead` (boolean, default false), `contribution_notes` (text, nullable), `year_from` (integer, nullable), `year_to` (integer, nullable), `project_url` (text, nullable), `status` enum (`active` | `verified` | `flagged` | `hidden`, default `active`), `flag_reason` enum (`wrong_person` | `never_involved` | `wrong_role` | `other`, nullable), `flag_notes` (text, nullable), `flagged_at` (timestamptz, nullable), `flagged_by_user_id` → profiles (nullable), `added_by_user_id` → profiles (nullable), `display_order` (integer), `created_at`, `updated_at`
- Migrate `building_architects` rows where the referenced architect was `type = 'individual'`: insert into `building_credits` with `person_id` set, `role = 'design_architect'`, `credit_tier = 'primary'`, `is_lead = true`, `status = 'active'`
- Migrate `building_architects` rows where the referenced architect was `type = 'studio'`: insert with `company_id` set instead of `person_id`, same defaults
- Add indexes on `building_id`, `person_id`, `company_id`, `status`
- Add RLS: public read of non-hidden credits; authenticated insert; status updates restricted to admins and relevant entity stewards/owners

**Verify:** Total row count in `building_credits` matches `building_architects`; rows from studio architects have `company_id` set and `person_id` null; rows from individual architects have `person_id` set; CHECK constraint rejects a row with both null.

**Depends on:** Tasks 1.1, 1.2

---

**[x] Task 1.5 — Add credit notification log and signed-token infrastructure**

- Create `credit_notification_log` table: `id`, `credit_id` → building_credits, `sent_at`, `recipient_hash` (SHA-256 of email address — no plaintext stored), `token_hash` (SHA-256 of the issued removal token)
- Create `credit_removal_tokens` table: `id`, `credit_id` → building_credits, `token_hash`, `expires_at` (timestamptz, default now() + 30 days), `used_at` (nullable timestamptz)
- Write Postgres function `generate_credit_removal_token(credit_id uuid)` that inserts a row into `credit_removal_tokens` and returns a URL-safe signed token (use `encode(gen_random_bytes(32), 'hex')`)
- RLS: no public read on either table; edge functions access via service role only
- Add a code comment in the migration documenting the token lifecycle: issued on notification send, validated on removal, single-use (checked via `used_at`), expires after 30 days

**Verify:** `SELECT generate_credit_removal_token('<id>')` returns a hex string; two calls produce different tokens; `credit_removal_tokens` has both rows; no email address appears anywhere in the schema.

**Depends on:** Task 1.4

---

## Phase 2 — TypeScript Types & API Layer

---

**[x] Task 2.1 — TypeScript types for all new entities**

- Create `src/features/credits/types.ts` exporting: `Person`, `PersonSummary` (for cards and search disambiguation), `Company`, `CompanySummary`, `CompanySteward`, `PersonCompanyAffiliation`, `BuildingCredit`, `BuildingCreditWithEntities` (joined view including resolved person and company name/slug), `CreditRole`, `CreditTier`, `CreditStatus`, `FlagReason`
- `PersonSummary` must include enough context for disambiguation in the picker UI: `id`, `name`, `slug`, `claim_status`, `associated_companies` (string array), `known_building` (nullable name string)
- Mark `Architect` and `ArchitectBuilding` in `src/features/architect/types.ts` as `@deprecated` with a JSDoc pointer to the new types; do not delete yet (deletion in Phase 11)
- Regenerate or manually extend Supabase generated types to include all new tables

**Verify:** TypeScript compiles with zero errors; `BuildingCreditWithEntities` covers all fields needed for the building detail page credits section; no `any` introduced.

**Depends on:** Tasks 1.1–1.4

---

**[x] Task 2.2 — API functions for `people`**

- Create `src/features/credits/api/people.ts` with: `getPerson(slug)` (returns person + all credits joined with building summaries; null on miss), `searchPeople(query)` (fuzzy ilike search returning `PersonSummary[]` with associated companies and one known building name for disambiguation), `createPerson(data)` (inserts, generates slug with collision handling), `updatePerson(id, data)` (owner/admin only), `getPersonPortfolio(personId)` (all `building_credits` for the person joined with building name, city, year, hero image, grouped by `credit_tier`)
- Slug collision handling: attempt base slug, then append `-2`, `-3` etc. until unique — implement as a small loop against a `SELECT slug FROM people WHERE slug ILIKE ?` check before insert

**Verify:** `getPerson('unknown-slug')` returns null; `searchPeople('foster')` returns Norman Foster with disambiguation fields; `createPerson` with a colliding name produces a `-2` suffixed slug; `getPersonPortfolio` returns correct buildings.

**Depends on:** Task 2.1

---

**[x] Task 2.3 — API functions for `companies`**

- Create `src/features/credits/api/companies.ts` with: `getCompany(slug)`, `searchCompanies(query)`, `createCompany(data)`, `updateCompany(id, data)`, `getCompanyPortfolio(companyId, roleFilter?)` (filterable by role), `getCompanyStewards(companyId)` (RLS enforces this is only accessible to stewards)
- Mirror the structure and slug collision handling from Task 2.2

**Verify:** `searchCompanies('arup')` returns Arup; `getCompanyPortfolio` with a `role` filter returns only matching credits; `getCompanyStewards` returns empty array for a non-member user.

**Depends on:** Task 2.1

---

**[x] Task 2.4 — API functions for `building_credits`**

- Create `src/features/credits/api/credits.ts` with: `getBuildingCredits(buildingId)` (returns all non-hidden credits ordered by `credit_tier`, `display_order`, `is_lead DESC`, joined with person and company summaries), `addBuildingCredit(data)` (validates at-least-one constraint client-side before insert), `flagCredit(creditId, reason, notes, flaggedByUserId?)` (sets `status = 'flagged'`, records reason and timestamp), `updateCreditStatus(creditId, status)` (admin only), `removeCreditByToken(token)` (validates token against `credit_removal_tokens`, checks `used_at` is null and `expires_at` is in the future, sets `status = 'hidden'`, marks `used_at = now()`)

**Verify:** `getBuildingCredits` excludes hidden credits for non-admins; `flagCredit` with unknown ID returns an error; `removeCreditByToken` with expired token returns an error and does not modify the credit; second call with same token is rejected via `used_at` check.

**Depends on:** Tasks 2.1, 1.5

---

## Phase 3 — People Pages

---

**[x] Task 3.1 — Person detail page (unclaimed state)**

- Create route `/person/:slug` in `app/routes` (not `src/routes.ts` — routes file lives outside `src/`) with loader `PersonDetails.loader.ts` calling `getPerson(slug)`; throw 404 response on null
- Build `PersonDetails.tsx`: name, bio, nationality, years, `location_note`, website link, avatar (fallback to initials avatar if null)
- Show "This profile hasn't been claimed yet" banner with "Claim this profile" CTA (links to claiming flow built in Phase 7)
- Render a `PersonCreditCard` list: building hero thumbnail, building name (link), role badge, company name (linked to `/company/:slug` if company exists), year range if set, contribution notes if set
- Group credits by `credit_tier` with section headings; `primary` first; `ancillary` collapsed behind a toggle
- `MetaHead`: title `[Name] — buildings, projects and credits on Plano`; Schema.org `Person` structured data with `name`, `url`, `image`, `nationality`

**Verify:** `/person/norman-foster` renders correctly; unknown slug returns 404; credits are grouped by tier; ancillary section collapsed on load; Schema.org JSON-LD present in DOM.

**Depends on:** Task 2.2

---

**[x] Task 3.2 — Person detail page (claimed state) + edit controls**

- When `claimed_by_user_id = currentUser.id`, show inline edit controls on the person page
- Build `EditPersonForm` (inline sheet or modal): bio, nationality, birth/death year, `location_note`, avatar upload (reuse existing avatar upload pattern from profiles), website
- On save call `updatePerson`; invalidate the person query via TanStack Query
- Display a verified badge next to the name when `claim_status = 'verified'`; add tooltip "Identity verified by Plano"
- On the user's own profile page (`/user/:username`), add a "Professional profile" section: person name as a link to `/person/:slug`, credit count summary ("Credited on 12 buildings")

**Verify:** Edit controls absent for non-owners; saving bio change persists and re-renders; verified badge visible only on verified profiles; user profile page shows the professional profile section for users with a claimed person profile.

**Depends on:** Task 3.1

---

**[x] Task 3.3 — Retire `/architect/:id` routing and `ArchitectDetails` loader redirect**

- Add a route for `/architect/:id` in `app/routes` that loads the person by UUID (preserved from `architects` migration) and issues `redirect` with `replace: true` to `/person/:slug`; return 404 if no person found with that ID
- In `ArchitectDetails.loader.ts`, remove the existing redirect to `/profile/:username` (which fires for claimed architects) — this logic is now superseded; the loader itself will be deleted in Phase 11 but the redirect must be neutralised now to prevent both firing simultaneously
- Add a `301` redirect note in `LAUNCH_HOSTING.md` for any server-level `/architect/*` → `/person/*` rewrite needed at the edge

**Verify:** Visiting `/architect/[old-uuid]` lands on the correct `/person/[slug]` page; no double-redirect occurs for previously claimed architect profiles; browser history shows the final `/person/` URL, not the intermediate.

**Depends on:** Task 3.1

---

## Phase 4 — Company Pages

---

**[x] Task 4.1 — Company detail page (unclaimed state)**

- Create route `/company/:slug` in `app/routes` with loader calling `getCompany(slug)`; 404 on null
- Build `CompanyDetails.tsx`: name, bio, country, founded/dissolved year, logo (fallback to initial letter), website link
- "Claim this company" banner with CTA (links to claiming flow built in Phase 7)
- Credits list grouped by `credit_tier` then by `role`; a role filter dropdown client-side filters visible credits
- Each credit row: building card (thumbnail, name, city, year) and role badge
- `MetaHead`: title `[Company Name] — architecture and engineering projects on Plano`; Schema.org `Organization` structured data

**Verify:** Unknown slug 404s; role filter for "Structural Engineer" hides non-matching credits; Schema.org `Organization` JSON-LD in DOM.

**Depends on:** Task 2.3

---

**[x] Task 4.2 — Company detail page (claimed state) + steward edit controls**

- When `currentUser` is a steward of the company, show edit controls: bio, country, years, logo upload, website
- Build `EditCompanyForm` (inline sheet); call `updateCompany` on save
- Show a "Stewards" section (visible to stewards only): list all stewards with their role; owners see a "Remove" control per steward; owners see an "Invite a steward" button opening an email input dialog (edge function `invite-company-steward` sends invite; invited user follows link to accept, creating a `company_stewards` row with `role = 'steward'`)
- Display verified badge when `claim_status = 'verified'`

**Verify:** Edit controls hidden from non-stewards; steward list visible to stewards only; owner removes a steward — row deleted and page re-renders; invite email triggers edge function log entry.

**Depends on:** Task 4.1

---

## Phase 5 — Credits on Building Detail Page

---

**[x] Task 5.1 — Replace architect display in `BuildingHeader` and fix downstream queries**

- Update `BuildingHeader.tsx`: replace current architect name display with `primary`-tier credits fetched via `getBuildingCredits`; render each as a link to `/person/:slug` or `/company/:slug`; if a credit has both person and company, render as "Person Name @ Company Name"
- Update `BuildingDetails.loader.ts`: remove the `building_architects` join; add a parallel TanStack Query call for `getBuildingCredits(buildingId)`
- Update `supabaseFallback.ts` `searchBuildingsRpc`: replace `architects:building_architects(architect:architects(id, name))` join with a join on `building_credits` and `people`/`companies`; return the same shape the calling code expects (so callers don't break) or update callers simultaneously
- Update `ArchitectStatement.tsx`: the `architectName` attribution now resolves from the `primary`-tier `is_lead = true` credit entity name rather than a direct architect FK; update the prop source accordingly
- Update `BuildingHeader` tests with new data shape mocks

**Verify:** Building detail page shows primary credits as links; `ArchitectStatement` shows the correct name; map/search still returns buildings with architect names populated; all `BuildingHeader` tests pass.

**Depends on:** Task 2.4

---

**[x] Task 5.2 — Full credits section on building detail page**

- Add `BuildingCredits` component below building metadata; renders all credits grouped by `credit_tier` (`primary`, `contributor`, `ancillary`)
- Within each tier, group by `role`; within each role group, `is_lead = true` entries appear first with a subtle "Lead" label
- Each credit row: entity name (linked), "@ Company" if separate company present (linked), role label, year range if set, contribution notes if set, external link icon for `project_url` if set
- Verified credits show a small verified icon with tooltip
- Ancillary tier collapsed behind "Show all credits" toggle
- "Add a credit" button at section bottom; visible to authenticated users only; opens form built in Phase 6

**Verify:** Credits render in correct tier/role/lead order; ancillary collapsed on load; verified icon present only on verified credits; "Add a credit" button absent for logged-out users.

**Depends on:** Task 5.1

---

**[x] Task 5.3 — Flag a credit UI**

- Add a discreet flag icon button to each credit row in `BuildingCredits`
- Clicking opens a popover (desktop) or bottom sheet (mobile) with: reason selector (`Wrong person`, `Never involved`, `Wrong role`, `Other`) and an optional notes field
- On submit, call `flagCredit`; show toast "Credit reported — we'll review it"
- No login required: submit without `flagged_by_user_id` if unauthenticated
- Rate-limit UI-side: hide the flag button for a given credit for the rest of the session after use; use sessionStorage keyed by credit ID

**Verify:** Submitting sets `status = 'flagged'` in DB; works without login; flag button disappears after use; a second page load restores the flag button (session only).

**Depends on:** Task 5.2

---

## Phase 6 — Credit Submission Form

---

**[ ] Task 6.1 — `CreditEntityPicker` component**

- Build a searchable combobox component that queries `searchPeople` and `searchCompanies` in parallel and merges results into a single list with a type indicator (person vs. company)
- Each result shows name + disambiguation context: associated company names and one known building name for people; country and credit count for companies
- "Create new person" and "Create new company" options at the list bottom when no exact match is found; selecting either opens an inline mini-form capturing name only (slug auto-generated); full details editable later on the entity page
- Before creating, call `searchPeople`/`searchCompanies` with the typed name; if trigram similarity > 0.4 for any result, show a "Did you mean [X]?" prompt and require the user to dismiss it before creating
- Export as a reusable standalone component from `src/features/credits/components/CreditEntityPicker.tsx`

**Verify:** Searching "foster" returns Norman Foster with disambiguation; "Add new person" creates a person and returns their ID; duplicate check fires and blocks creation without dismissal; component works in isolation (Storybook or a simple test page).

**Depends on:** Tasks 2.2, 2.3

---

**[ ] Task 6.2 — Credit submission form (full form + batch)**

- Build `AddCreditForm` in a `Sheet` slide-over, triggered by "Add a credit" on the building detail page
- Per-credit entry fields: person picker (optional, using `CreditEntityPicker`), company picker (optional), role dropdown (full taxonomy + Other with free text), credit tier selector, is_lead checkbox, contribution notes textarea (max 500 chars), year_from / year_to integer inputs, project_url text input
- Client-side validation: at least one of person/company required; if is_lead checked and another credit with the same role already has is_lead, show a warning (non-blocking)
- "Add another" button appends a blank entry row; all rows submit together via sequential `addBuildingCredit` calls; show per-row success/error indicators
- On all rows succeeding, proceed to notification step (Task 6.3)

**Verify:** Form rejects submission with both person and company empty; is_lead warning appears when appropriate; adding two rows and submitting creates two `building_credits` rows; failed row shows inline error without blocking successful rows.

**Depends on:** Tasks 6.1, 5.2

---

**[ ] Task 6.3 — Post-submission notification email flow**

- After successful credit submission, show a notification step within the same `Sheet`: "Notify the people you've credited — paste their email addresses below"
- Free-text email input (comma or newline separated); parse, deduplicate, cap at 15 addresses; show parsed address pills before sending
- On confirm, call edge function `notify-credited-entities`: generate a signed removal token per credit via `generate_credit_removal_token`, send one email per address using `CreditNotificationEmail` template, log `recipient_hash` and `token_hash` to `credit_notification_log`, discard raw addresses
- `CreditNotificationEmail` template: building name and hero image, credit details (role, entity name), "Claim your profile on Plano" CTA, "Remove this credit" button (signed URL to `/remove-credit/:token`)
- Notification step is skippable; skipping closes the sheet with no further action

**Verify:** Edge function logs show emails sent; `credit_notification_log` has rows with hashed values and no plaintext emails; removal URL with a valid token hides the credit (verify in Task 6.4); skipping closes the sheet cleanly.

**Depends on:** Tasks 6.2, 1.5

---

**[ ] Task 6.4 — One-click credit removal via token**

- Create route `/remove-credit/:token` in `app/routes`; minimal full-page layout (no app chrome required)
- Loader calls `removeCreditByToken(token)`; on success render: "Credit removed — thank you" with a CTA back to the building page (use the building name/link from the credit record); on invalid/expired/used token render an appropriate error state with a link to contact support
- Marks `used_at = now()` in `credit_removal_tokens` to prevent replay
- No authentication required

**Verify:** Valid token hides the credit and marks it used; second use of same token shows error; expired token shows error; credit `status` in DB is `hidden` after successful removal; building page no longer shows the credit.

**Depends on:** Tasks 2.4, 6.3

---

## Phase 7 — Claiming Flows

---

**[ ] Task 7.1 — Claim a person profile**

- Build `ClaimPersonDialog` (replaces `ClaimProfileDialog` for the new flow) triggered from the person page CTA
- Form: radio group "This is me" / "I represent this person" — no proof email required (lighter trust model; admin moderation is the backstop)
- On submit: call `claimPerson(personId, reason)` which sets `claimed_by_user_id = currentUser.id` and `claim_status = 'claimed'` in a single update; return the updated person
- The policy change from the old proof-email + admin approval model is intentional — the flagging/moderation queue (Phase 8) substitutes for the upfront gate
- Notify `added_by_user_id` of any active credits that reference this person via edge function `notify-entity-claimed`: "Someone has claimed the profile for [Name] on Plano. If you believe this is incorrect, flag it from the building page."
- Remove the unclaimed banner; redirect to the edit state of the person page

**Verify:** Claim sets `claimed_by_user_id` correctly and `claim_status = 'claimed'`; unclaimed banner disappears post-claim; edit controls appear; re-visiting as a different user no longer shows the claim CTA; notification edge function log shows a call.

**Depends on:** Tasks 3.2, 2.2

---

**[ ] Task 7.2 — Claim a company (first claimant)**

- Build `ClaimCompanyDialog` on the company page: collects a work email address
- On submit: call edge function `verify-company-claim` which sends a verification email with a signed token (same pattern as removal tokens: `gen_random_bytes` stored as hash)
- Create route `/verify-company-claim/:token` in `app/routes`: on valid token, insert `company_stewards` row (`role = 'owner'`), set `claim_status = 'claimed'`, set `verified_domain` to the email's domain, redirect to company page with a success toast
- If `companies.verified_domain` is already set and the submitted email domain does not match, skip the email step and route directly to the dispute flow (Task 7.4)

**Verify:** Submitting a non-matching domain for an already-claimed company routes to dispute; valid token creates owner steward row and sets `claimed`; invalid/expired token shows an error page; company edit controls appear after claiming.

**Depends on:** Tasks 4.2, 2.3

---

**[ ] Task 7.3 — Request steward invite for an already-claimed company**

- On claimed company pages, replace "Claim this company" CTA with "Request access to manage this company"
- Create `company_steward_requests` table (migration): `id`, `company_id`, `requester_user_id`, `message` (text), `status` enum (`pending` | `approved` | `rejected`), `created_at`
- On submit: insert a request row; call edge function `notify-steward-request` which emails all `owner`-role stewards with an approve link (signed token)
- Route `/approve-steward-request/:token`: inserts a `company_stewards` row with `role = 'steward'`, sets request `status = 'approved'`, notifies the requester by email

**Verify:** Request creates a DB row; owner receives email; approval inserts steward row and requester gains edit access to the company page; second approval of same request is a no-op (check `status` before inserting).

**Depends on:** Task 7.2

---

**[ ] Task 7.4 — Dispute a company claim**

- Show "Dispute this claim" link on claimed company pages (below the steward request CTA)
- Create `company_claim_disputes` table (migration): `id`, `company_id`, `disputed_by_user_id`, `reason` (text, required), `evidence_url` (nullable), `status` enum (`open` | `resolved`), `created_at`
- On submit: insert dispute row; call edge function `notify-admin-dispute` which emails the Plano admin address with company name, reason, and evidence URL
- No automatic action; resolution is manual via the admin panel (Phase 8)
- Show a "Dispute under review" notice to the disputing user on the company page (visible to them only, not publicly)

**Verify:** Dispute record created with `status = 'open'`; admin notification email sent; "Dispute under review" notice visible only to the user who submitted it; company page otherwise unaffected.

**Depends on:** Task 7.2

---

## Phase 8 — Admin Panel Extensions

---

**[ ] Task 8.1 — Admin: flagged credits moderation queue**

- Add a "Credits" section to the admin sidebar
- Build `FlaggedCredits.tsx` admin page: list of all `status = 'flagged'` credits showing flag reason, flag notes, who added the credit (`added_by_user_id`), flagged timestamp, building name (link), and credited entity name (link)
- Three actions per row: **Verify** (sets `status = 'verified'`), **Dismiss flag** (sets `status = 'active'`), **Hide** (sets `status = 'hidden'`)
- On Verify or Hide: call edge function `notify-credit-outcome` which emails `added_by_user_id` informing them of the decision
- Show 30-day auto-hide countdown for flagged unclaimed credits based on `flagged_at`
- Note: `verified` credits in this queue should display a warning — they cannot be auto-hidden and require admin action to proceed

**Verify:** All flagged credits appear; Verify action sets status and triggers notification email; Hide sets status to hidden and credit disappears from the building page for non-admins; countdown timer reflects correct time remaining.

**Depends on:** Tasks 5.3, 2.4

---

**[ ] Task 8.2 — Admin: people and companies management + unified entity claims**

- Build `AdminPeople.tsx`: searchable list of all people with claim status, credit count, and person page link; inline `claim_status` edit (admin can manually set `verified`); "Merge" action opens a side-by-side view (modelled on existing `MergeBuildings.tsx`) that transfers all `building_credits` rows from source to target person then deletes the source
- Build `AdminCompanies.tsx`: same pattern for companies; additionally shows steward count with a "View stewards" expandable row
- Replace `ArchitectClaims.tsx` with `EntityClaims.tsx`: unified queue showing pending person claims and open company claim disputes (from Task 7.4) in tabs; dispute rows show reason, evidence URL, and a "Resolved" action that sets `status = 'resolved'`
- Add all three pages to the admin sidebar under the "Credits" section

**Verify:** Admin sets a person to `verified` — verified badge appears on their person page; merge transfers all credits to target and source person is deleted; `EntityClaims` shows disputes in the company tab; resolving a dispute sets `status = 'resolved'`.

**Depends on:** Tasks 7.1, 7.4, 8.1

---

**[ ] Task 8.3 — Extend audit log to cover credit and entity events**

- Extend `admin_audit_logs` using its existing columns: `action_type` (add new values: `credit_added`, `credit_status_changed`, `person_claimed`, `company_claimed`, `steward_added`, `steward_removed`), `target_type` (add: `credit`, `person`, `company`), `target_id`, `details` (JSONB — store `old_value` and `new_value` as keys inside the existing `details` column to avoid schema conflict)
- Log events from the relevant API functions and edge functions: `addBuildingCredit` logs `credit_added`; `updateCreditStatus` logs `credit_status_changed` with before/after; claim functions log `person_claimed` / `company_claimed`
- Surface credit-related audit events on the existing `BuildingAudit.tsx` admin page when viewing a specific building

**Verify:** Adding a credit creates an audit row with `action_type = 'credit_added'`; changing status creates a row with `details.old_value` and `details.new_value`; `BuildingAudit` page shows credit events in the building's history.

**Depends on:** Task 8.1

---

## Phase 9 — Portfolio Dashboard

---

**[ ] Task 9.1 — Generalise architect dashboard into person portfolio dashboard + profile tab**

- Update (or replace) `ArchitectDashboard.tsx` as `PersonDashboard.tsx`: accessible to any user whose `profiles.id` matches a `people.claimed_by_user_id`; route remains authenticated-only
- Dashboard stats: total buildings credited, number of distinct roles, year range of credits
- Portfolio grid: building cards grouped by `credit_tier`, sortable by year or role; each card shows role badge and company name for that credit
- Add "My Portfolio" link to the app sidebar and navigation — visible only to users with a claimed person profile
- Update `Profile.tsx`: the portfolio tab currently renders based on `profiles.verified_architect_id`; update to render based on `people.claimed_by_user_id = currentUser.id` instead; the tab content should link to the full `PersonDashboard` rather than re-implementing the portfolio inline

**Verify:** User with claimed person profile sees portfolio dashboard; "My Portfolio" nav link appears only for them; `Profile.tsx` portfolio tab renders and links to the dashboard; users without a claimed person profile see neither.

**Depends on:** Tasks 3.2, 7.1

---

**[ ] Task 9.2 — Company steward portfolio dashboard**

- Build `CompanyDashboard.tsx`: accessible to any user who is a steward of at least one company
- Shows all buildings credited to the steward's company grouped by role, filterable by role
- Owners see a "Pending access requests" section (from Task 7.3) with approve/reject actions
- "Manage company page" link navigates to the company's public page in edit mode
- Add company name (or "My Company") to the app sidebar for stewards; if the user is steward of multiple companies, show a dropdown

**Verify:** Steward sees only their company's credits; owner sees pending requests; approving a request creates a steward row; non-stewards cannot access the route; multi-company steward sees a dropdown in the sidebar.

**Depends on:** Tasks 4.2, 7.3

---

## Phase 10 — Search Integration

---

**[ ] Task 10.1 — Extend global search to include people and companies; retire architect search components**

- Update global search API to query `people` and `companies` alongside buildings
- Search results page gains "People" and "Companies" tabs with result counts; people results show name, avatar, nationality, credit count; company results show name, logo, country, credit count
- Update main search bar autocomplete to surface top people and company matches with a type icon distinguishing them from buildings
- Update or remove `ArchitectSearchNudge.tsx` in `src/features/search/components/`: replace any `architects` table query with a `people` query; update the nudge copy if it references "architects" specifically
- Remove (or update) `src/features/search/components/ArchitectSelect.tsx` which queries the `architects` table directly — replace with `CreditEntityPicker` (from Task 6.1) or a people-only variant of it

**Verify:** Searching "Foster" returns Norman Foster in the People tab; searching "Arup" returns Arup in Companies; `ArchitectSearchNudge` renders without querying the old table; autocomplete shows type icons for mixed results.

**Depends on:** Tasks 3.1, 4.1, 6.1

---

**[ ] Task 10.2 — Credits filter on building discovery and map**

- Add a "Credits" filter section to the building discovery filter panel
- Two controls: **Company** (searchable combobox via `searchCompanies`) and **Role** (multi-select from role taxonomy enum)
- Company filter adds: `building_id IN (SELECT building_id FROM building_credits WHERE company_id = ? AND status != 'hidden')`
- Role filter adds: `building_id IN (SELECT building_id FROM building_credits WHERE role = ANY(?) AND status != 'hidden')`
- Filters are combinable with all existing filters; filter state persists in URL params

**Verify:** Filtering by "Arup" shows only buildings with an active Arup credit; combining with role "Structural Engineer" further narrows results; clearing filter restores full set; URL reflects filter state and survives a page refresh.

**Depends on:** Tasks 2.3, 2.4

---

## Phase 11 — Cleanup & Polish

---

**[ ] Task 11.1 — Remove all deprecated architect components and tables**

- Confirm zero references to `architects` or `building_architects` remain in TypeScript, SQL, RPC names, or Supabase query strings (run a codebase-wide grep before proceeding)
- Remove: `src/components/ui/architect-select.tsx`, `src/features/search/components/ArchitectSelect.tsx` (both files), `src/features/architect/components/ArchitectPortfolio.tsx`, `src/features/architect/hooks/useArchitectPortfolio.ts`, `src/features/architect/pages/ArchitectDetails.tsx` and its loader, `src/features/architect/pages/ArchitectDashboard.tsx` (replaced by PersonDashboard), `src/features/architect/components/ClaimProfileDialog.tsx` (replaced by ClaimPersonDialog), `FeaturedArchitect.tsx` (update to query `people` and `building_credits` or remove if the feed is no longer used), `DisconnectArchitectDialog.tsx` (replace with a "Remove claimed profile link" action on the person page settings)
- Remove `@deprecated` markers from `Architect` and `ArchitectBuilding` types (the types themselves are now deleted)
- Drop `architects` and `building_architects` tables in a migration after confirming no FK violations
- TypeScript build must pass with zero errors after all removals

**Verify:** `grep -r "architects\|building_architects\|ArchitectSelect\|ClaimProfileDialog" src/` returns zero results; Supabase migration runs cleanly; building detail page, person pages, and portfolio dashboard all render correctly after the drop.

**Depends on:** All prior phases complete

---

**[ ] Task 11.2 — SEO: structured data, meta tags, and sitemap edge function**

- Confirm `PersonDetails.tsx` and `CompanyDetails.tsx` have correct Schema.org JSON-LD (`Person` and `Organization`), canonical URLs, and `MetaHead` titles (covered in Tasks 3.1 and 4.1 — this task audits and fixes any gaps)
- Update the `sitemap` edge function: replace `/architect/:id` URL generation with `/person/:slug` and add `/company/:slug` URL generation; remove the `profiles.verified_architect_id` exclusion logic (no longer relevant); ensure unclaimed person and company pages are included (they are publicly valuable for SEO)
- Verify `robots.txt` does not exclude `/person/` or `/company/` paths
- Update `LAUNCH_HOSTING.md` with the new URL patterns and any server-level redirect rules needed

**Verify:** Structured data validates in Google's Rich Results Test for a sample person and company page; sitemap includes `/person/` and `/company/` URLs; no `/architect/` URLs remain in the sitemap output.

**Depends on:** Tasks 3.1, 4.1, 11.1

---

**[ ] Task 11.3 — Update `DATA_CONTRACT.md`, `PRD.md`, and `ROADMAP.md`**

- Rewrite the building-architect section of `DATA_CONTRACT.md` to document: `people`, `companies`, `company_stewards`, `person_company_affiliations`, `building_credits`, `credit_notification_log`, `credit_removal_tokens`, `company_steward_requests`, `company_claim_disputes`; include all enums, constraints, and RLS policies
- Remove all references to `architects` and `building_architects` from `DATA_CONTRACT.md`
- Update `PRD.md` FR-4.1.8 and FR-4.2.6 to reflect the new credits model; update FR-4.3.5 to reference `CreditEntityPicker` instead of the architect selector
- Add a `docs/SECURITY.md` note (or append to an existing security doc) documenting the signed token pattern used for one-click removal and company claim verification
- Mark "Building Credits" as shipped in `ROADMAP.md`

**Verify:** `DATA_CONTRACT.md` accurately describes all new tables with no references to old tables; `PRD.md` requirements reference the correct components; the signed token pattern is documented.

**Depends on:** Task 11.1