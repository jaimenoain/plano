# QA & Regression Roadmap: Building Credits

**Project:** Plano  
**Feature:** Building Credits  
**Status:** Shipped (implementation complete; this checklist tracks regression verification)  
**Document type:** QA & Regression Roadmap  

---

## Overview

This document is the QA and regression checklist for the Building Credits feature. It covers the full implementation: database migration, API layer, UI surfaces, claiming flows, admin tooling, search integration, and cleanup of all deprecated code.

The feature replaces the existing `architects` and `building_architects` tables with three new first-class entities — `people`, `companies`, and `building_credits` — and introduces claiming flows, a moderation queue, notification emails, and portfolio dashboards.

---

## How to use this document

Work through phases in order. Each task is a self-contained QA run scoped to one implementation task or a closely related group. For each check:

- **"Should"** = a failure is a bug. Fix it and re-run before moving on.
- **"Confirm"** = a failure may be a product decision. Clarify before fixing.
- **"Spot-check"** = sample a representative subset; full enumeration is not required.

Mark each task `[x]` when all its checks pass. Do not proceed to a later phase until all tasks in the current phase are marked complete.

---

## Background: key architectural decisions reflected in these checks

The following decisions were made during spec review and are reflected throughout the QA tasks below:

- `type = 'studio'` rows from `architects` are migrated to `companies`, not `people`. Corresponding `building_architects` rows use `company_id` in `building_credits`.
- `architect_affiliations` data is preserved in a new `person_company_affiliations` table with no UI built yet.
- `profiles.verified_architect_id` is the authoritative source of existing claim linkages, not `architect_claims`.
- The claiming trust model is lighter than the previous system: claims are granted immediately; the admin moderation queue is the backstop rather than upfront approval.
- `verified` status means externally corroborated (by a steward or admin), not merely self-claimed. Verified credits cannot be auto-hidden by a community flag alone.
- All new routes (`/person/:slug`, `/company/:slug`, `/remove-credit/:token`, etc.) must live in `app/routes`, not `src/routes.ts`, which is a re-export shim pointing outside `src/`.

---

## Phase Q1 — Database Integrity

---

**[x] QA 1.1 — Verify `people` migration from `architects` (individuals only)**

- `SELECT count(*) FROM people` equals `SELECT count(*) FROM architects WHERE type = 'individual'`
- `SELECT count(*) FROM people WHERE slug IS NULL OR slug = ''` returns 0
- `SELECT slug, count(*) FROM people GROUP BY slug HAVING count(*) > 1` returns 0 rows (no duplicate slugs)
- No verified architect links were lost: `SELECT p.id FROM people p JOIN profiles pr ON pr.verified_architect_id = p.id WHERE p.claimed_by_user_id IS NULL` returns 0 rows
- Claimed status is consistent: `SELECT count(*) FROM people WHERE claimed_by_user_id IS NOT NULL AND claim_status = 'unclaimed'` returns 0
- No individuals were skipped: `SELECT id FROM architects WHERE type = 'individual' EXCEPT SELECT id FROM people` returns 0 rows
- Spot-check 5 migrated rows: confirm `website` contains what was in `website_url`; `location_note` contains what was in `headquarters`; `avatar_url` is null (there was no avatar on the old table)
- `claim_status = 'claimed'` is set for every person who was previously linked via `profiles.verified_architect_id`; also check `architect_claims WHERE status = 'verified'` as a secondary source for any not covered by the profile join

**Depends on:** Implementation Task 1.1

---

**[x] QA 1.2 — Verify `companies` migration from `architects` (studios only)**

- `SELECT count(*) FROM companies` equals `SELECT count(*) FROM architects WHERE type = 'studio'`
- `SELECT id FROM architects WHERE type = 'studio' EXCEPT SELECT id FROM companies` returns 0 rows (no studios were skipped)
- `SELECT count(*) FROM companies WHERE slug IS NULL OR slug = ''` returns 0
- `SELECT slug, count(*) FROM companies GROUP BY slug HAVING count(*) > 1` returns 0 rows
- For each studio that had a verified claim via `profiles.verified_architect_id`: a corresponding `company_stewards` row exists with `role = 'owner'`
- `SELECT count(*) FROM company_stewards WHERE role = 'owner'` is greater than 0 (confirms at least some studios had verified claims)
- Spot-check `headquarters` → `country` mapping on 3–5 rows; flag any values that are clearly not country names for manual review
- `company_stewards` RLS: as a non-member authenticated user, `SELECT * FROM company_stewards WHERE company_id = '[any company id]'` returns 0 rows

**Depends on:** Implementation Task 1.2

---

**[x] QA 1.3 — Verify `person_company_affiliations` migration from `architect_affiliations`**

- `SELECT count(*) FROM person_company_affiliations` equals `SELECT count(*) FROM architect_affiliations`
- No affiliations were lost: `SELECT aa.individual_id, aa.studio_id FROM architect_affiliations aa LEFT JOIN person_company_affiliations pca ON pca.person_id = aa.individual_id AND pca.company_id = aa.studio_id WHERE pca.id IS NULL` returns 0 rows
- All `person_id` FKs resolve: `SELECT count(*) FROM person_company_affiliations WHERE person_id NOT IN (SELECT id FROM people)` returns 0
- All `company_id` FKs resolve: `SELECT count(*) FROM person_company_affiliations WHERE company_id NOT IN (SELECT id FROM companies)` returns 0
- `year_from` and `year_to` are null for all migrated rows (the old table did not carry this data)

**Depends on:** Implementation Task 1.3

---

**[x] QA 1.4 — Verify `building_credits` migration from `building_architects`**

- `SELECT count(*) FROM building_credits` equals `SELECT count(*) FROM building_architects`
- All migrated rows have `role = 'design_architect'`, `credit_tier = 'primary'`, `is_lead = true`, `status = 'active'`
- No rows were lost: `SELECT ba.building_id, ba.architect_id FROM building_architects ba LEFT JOIN building_credits bc ON bc.building_id = ba.building_id AND (bc.person_id = ba.architect_id OR bc.company_id = ba.architect_id) WHERE bc.id IS NULL` returns 0 rows
- Studio-linked rows correctly use `company_id`: `SELECT count(*) FROM building_credits bc JOIN architects a ON a.id = bc.person_id WHERE a.type = 'studio'` returns 0
- Individual-linked rows correctly use `person_id`: `SELECT count(*) FROM building_credits bc JOIN architects a ON a.id = bc.company_id WHERE a.type = 'individual'` returns 0
- CHECK constraint is enforced: attempt `INSERT INTO building_credits (building_id, role, credit_tier) VALUES (...)` with both `person_id` and `company_id` null — should be rejected with a constraint violation error
- No orphaned credits: `SELECT count(*) FROM building_credits WHERE building_id NOT IN (SELECT id FROM buildings)` returns 0

**Depends on:** Implementation Task 1.4

---

**[x] QA 1.5 — Verify token infrastructure tables**

- `credit_notification_log` table exists with columns: `id`, `credit_id`, `sent_at`, `recipient_hash`, `token_hash`; no column named `email` or similar plaintext address field exists anywhere in the schema
- `credit_removal_tokens` table exists with columns: `id`, `credit_id`, `token_hash`, `expires_at`, `used_at`
- `SELECT generate_credit_removal_token('[valid credit id]')` returns a non-empty hex string
- Calling the function twice with the same credit ID returns two different tokens; both rows appear in `credit_removal_tokens`
- As an anon user: `INSERT INTO credit_notification_log (...)` is rejected; `INSERT INTO credit_removal_tokens (...)` is rejected; `SELECT * FROM credit_notification_log` returns 0 rows; `SELECT * FROM credit_removal_tokens` returns 0 rows

**Depends on:** Implementation Task 1.5

---

**[x] QA 1.6 — Verify RLS policies across all new tables**

- As unauthenticated (anon key): `SELECT * FROM people` returns rows; `SELECT * FROM companies` returns rows; `SELECT * FROM building_credits WHERE status != 'hidden'` returns rows
- As unauthenticated: `SELECT * FROM company_stewards` returns 0 rows; `SELECT * FROM credit_notification_log` returns 0 rows; `SELECT * FROM credit_removal_tokens` returns 0 rows
- As a regular authenticated user who is not a steward of company A: `SELECT * FROM company_stewards WHERE company_id = '[company A id]'` returns 0 rows
- As a steward of company A: `SELECT * FROM company_stewards WHERE company_id = '[company A id]'` returns the stewards list; `SELECT * FROM company_stewards WHERE company_id = '[company B id]'` returns 0 rows
- As a regular user: `SELECT * FROM building_credits WHERE status = 'hidden'` returns 0 rows
- As an admin: `SELECT * FROM building_credits WHERE status = 'hidden'` returns hidden rows
- As a user who is not the owner of a person record: `UPDATE people SET name = 'hacked' WHERE id = '[someone elses id]'` is rejected

**Depends on:** Implementation Tasks 1.1–1.5

---

## Phase Q2 — API Layer

---

**[x] QA 2.1 — `people` API functions**

- `getPerson('unknown-slug')` returns null without throwing
- `getPerson('[valid-slug]')` returns the person object with a credits array; each credit includes building name, city, year, and hero image URL
- `searchPeople('foster')` returns at least one result; each result includes `associated_companies` and `known_building` fields for disambiguation
- `searchPeople('')` returns an empty array or a reasonable default set — not a thrown error
- `createPerson({ name: 'Test Person' })` creates a row and returns a slug of `test-person`; calling again with the same name produces slug `test-person-2`
- `updatePerson(id, { bio: 'updated' })` called as the record owner succeeds and persists; called as a different authenticated user returns an auth error
- `getPersonPortfolio(personId)` returns credits grouped by `credit_tier`; run against a person with credits in multiple tiers and confirm all tiers are present in the response

**Depends on:** Implementation Task 2.2

---

**[x] QA 2.2 — `companies` API functions**

- `getCompany('unknown-slug')` returns null without throwing
- `getCompany('[valid-slug]')` returns the company with a credits array
- `searchCompanies('arup')` returns at least one result with name and country
- `createCompany` slug collision handling works identically to `createPerson` (see QA 2.1)
- `updateCompany(id, data)` as a non-steward returns an auth error; as a steward succeeds
- `getCompanyPortfolio(companyId)` with no role filter returns all credits; with `roleFilter = 'structural_engineer'` returns only structural engineering credits and nothing else
- `getCompanyStewards(companyId)` as a non-steward returns an empty array or an error (not the actual stewards list); as a steward of that company returns the list correctly

**Depends on:** Implementation Task 2.3

---

**[x] QA 2.3 — `building_credits` API functions**

- `getBuildingCredits(buildingId)` for a building with migrated credits returns them ordered: `primary` first, then `contributor`, then `ancillary`; within each tier, `is_lead = true` entries appear before `is_lead = false` entries
- `getBuildingCredits` excludes `status = 'hidden'` credits for non-admin users; admin users see all credits including hidden ones
- `addBuildingCredit` with both `person_id` and `company_id` null is rejected client-side before any network request is made (verify via Network tab — no request fires)
- `flagCredit(creditId, 'wrong_role', null, null)` with no authenticated user sets `status = 'flagged'`, `flag_reason = 'wrong_role'`, and `flagged_by_user_id = null` on the correct row
- `updateCreditStatus(creditId, 'verified')` as a non-admin returns an auth error; as an admin succeeds
- `removeCreditByToken(validToken)` sets `status = 'hidden'` and `used_at = now()` on the credit; the return value indicates success
- Calling `removeCreditByToken` a second time with the same (now used) token returns an error and leaves the credit unchanged
- `removeCreditByToken` with a token where `expires_at` is in the past returns an error and does not modify the credit

**Depends on:** Implementation Tasks 2.4, 1.5

---

## Phase Q3 — People Pages

---

**[x] QA 3.1 — Person detail page: unclaimed state**

- Navigate to `/person/[valid-slug]` — page renders with name, bio (if set), nationality, years, location_note, website link, and avatar (or initials fallback if avatar_url is null)
- Navigate to `/person/nonexistent` — returns a 404 page, not a blank screen or JS error
- "This profile hasn't been claimed yet" banner is visible; "Claim this profile" CTA is present
- Credits section: `primary` tier credits are visible and not collapsed; `ancillary` tier credits are collapsed behind a toggle; clicking the toggle reveals them
- Each credit row shows: entity name as a clickable link, role badge, year range if set, contribution notes if set
- A company name within a credit row links to `/company/[slug]` — follow the link and confirm it resolves
- `<title>` tag reads `[Name] — buildings, projects and credits on Plano` — inspect DOM
- Schema.org `Person` JSON-LD is present in the page `<head>` with `name`, `url`, `image`, `nationality` fields — inspect DOM or paste the URL into Google's Rich Results Test

**Depends on:** Implementation Task 3.1

---

**[x] QA 3.2 — Person detail page: claimed state and edit controls**

- Visit a person page as the user who claimed it — edit controls (bio, nationality, years, avatar, website) are visible
- Visit the same page as a different authenticated user — edit controls are absent
- Visit as a logged-out user — edit controls are absent
- Edit the bio field, save — the change persists on page reload
- Upload an avatar image — the avatar replaces the initials fallback on the person page
- Visit a person with `claim_status = 'verified'` — a verified badge is visible with the tooltip "Identity verified by Plano"; visit a person with `claim_status = 'claimed'` — no verified badge
- Visit `/user/:username` for a user with a claimed person profile — a "Professional profile" section is present with a link to `/person/[slug]` and a credit count (e.g. "Credited on 12 buildings"); visit for a user without a claimed person profile — this section is absent

**Depends on:** Implementation Task 3.2

---

**[x] QA 3.3 — Redirect from deprecated `/architect/:id` URLs**

- Visit `/architect/[uuid-of-individual-architect]` — the browser is redirected to `/person/[correct-slug]`; the final URL in the address bar is the `/person/` URL, not the intermediate
- Visit `/architect/[uuid-of-studio-architect]` — the browser is redirected to `/company/[correct-slug]`
- Visit `/architect/[nonexistent-uuid]` — a 404 page is returned; no redirect loop occurs
- Visit an old architect URL that was previously claimed (which had the old profile-based redirect in `ArchitectDetails.loader.ts`) — only a single redirect fires to `/person/[slug]`; confirm there is no double-redirect or redirect to `/profile/:username`; browser history shows the final `/person/` URL only
- Open `LAUNCH_HOSTING.md` and confirm server-level redirect rules for `/architect/*` → `/person/*` (or `/company/*`) are documented

**Depends on:** Implementation Task 3.3

---

## Phase Q4 — Company Pages

---

**[x] QA 4.1 — Company detail page: unclaimed state**

- Navigate to `/company/[valid-slug]` — page renders with name, bio, country, founded/dissolved year, logo (or initial-letter fallback), and website link
- Navigate to `/company/nonexistent` — 404 page
- "Claim this company" banner is visible on an unclaimed company; absent on a claimed company
- Role filter dropdown: selecting "Structural Engineer" hides credits with other roles; deselecting (or "All") restores all credits
- Credits are grouped by `credit_tier` with section headings; building cards show thumbnail, name, city, and year
- Schema.org `Organization` JSON-LD is present in `<head>` — inspect DOM

**Depends on:** Implementation Task 4.1

---

**[x] QA 4.2 — Company detail page: claimed state and steward edit controls**

- Visit a claimed company page as an owner steward — edit controls, stewards list, and "Invite a steward" button are all visible
- Visit as a regular steward (not owner) — edit controls and stewards list are visible; "Invite a steward" button is absent; no "Remove" control appears next to other stewards
- Visit as a non-steward authenticated user — none of the above controls are visible
- Visit as a logged-out user — none of the above controls are visible
- Edit the company bio, save — change persists on page reload
- Owner removes a steward — the `company_stewards` row is deleted; the removed user no longer sees edit controls when they visit the company page
- Upload a company logo — logo replaces the initial-letter fallback
- Verified badge appears when `claim_status = 'verified'`; absent otherwise

**Depends on:** Implementation Task 4.2

---

## Phase Q5 — Credits on Building Detail Page

---

**[x] QA 5.1 — Primary credits in `BuildingHeader` and downstream queries**

- Visit a building detail page for a building with migrated credits — architect name(s) in the header link to `/person/[slug]` or `/company/[slug]`, not to `/architect/:id`
- For a credit with both `person_id` and `company_id` set: the header displays "Person Name @ Company Name"
- `ArchitectStatement` component on the building page shows the correct name — verify it is sourcing the name from the `primary`-tier `is_lead = true` credit entity, not from a deprecated architect FK; spot-check against a building with a known architect statement
- Open the Network tab while loading a building detail page — no requests are made to an `architects` or `building_architects` endpoint
- Map/search: search for a building by keyword — returned building cards still include the architect or firm name (confirm `supabaseFallback.ts` `searchBuildingsRpc` was updated to join `building_credits` instead of `building_architects`)
- Run `BuildingHeader.test.tsx` — all tests pass with updated mocks

**Depends on:** Implementation Task 5.1

---

**[x] QA 5.2 — Full credits section on building detail page**

- A building with credits in all three tiers: `primary` and `contributor` tiers are visible and expanded by default; `ancillary` tier is collapsed behind a "Show all credits" toggle; clicking the toggle reveals the ancillary credits
- Within a role group, the `is_lead = true` entry carries a subtle "Lead" label and appears before non-lead entries in the same role
- A verified credit displays a small verified icon; hovering over it shows the tooltip text; a non-verified credit has no icon
- A credit with `contribution_notes` set shows the notes text inline; a credit without shows nothing in that position
- A credit with `project_url` set shows an external link icon; clicking it opens the URL in a new tab
- A credit with `year_from` and `year_to` set displays the range (e.g. "2018–2023"); a credit with neither shows nothing in that position
- "Add a credit" button is visible when logged in; invisible when logged out
- A `status = 'flagged'` credit is not visible to regular users; is visible to admins with a visual flag indicator

**Depends on:** Implementation Task 5.2

---

**[x] QA 5.3 — Flag a credit**

- Click the flag icon on a credit — a popover (desktop) or bottom sheet (mobile) opens with a reason selector and an optional notes field
- Submit without selecting a reason — a validation error is shown; no API call is made
- Submit with reason "Wrong role" and no notes while logged out — `building_credits` row has `status = 'flagged'`, `flag_reason = 'wrong_role'`, `flag_notes = null`, `flagged_by_user_id = null`
- Submit while logged in — `flagged_by_user_id` is populated with the current user's ID
- After flagging, the flag icon disappears for that credit in the current session; refreshing the page restores it (the session-level suppression uses `sessionStorage` keyed by credit ID)
- Flag a `verified` credit — the UI allows it; the DB row moves to `status = 'flagged'`; but the credit does NOT automatically move to `hidden` (it stays `flagged` pending admin review)

**Depends on:** Implementation Task 5.3

---

## Phase Q6 — Credit Submission Form

---

**[x] QA 6.1 — `CreditEntityPicker` component**

- Type "foster" — results include Norman Foster with disambiguation fields (associated companies, at least one known building name); results include both people and companies in a single merged list with a type icon distinguishing them
- Type a name that matches no existing record — "Create new person" and "Create new company" options appear at the bottom of the list
- Select "Create new person", type a name with trigram similarity > 0.4 to an existing person — a "Did you mean [X]?" prompt appears; accepting the suggestion selects the existing person; dismissing it allows creation to proceed
- Select "Create new person", type a completely novel name — the person is created without a duplicate prompt; the returned ID resolves in the DB (`SELECT id FROM people WHERE id = '[returned-id]'`)
- Verify the component renders correctly on a mobile viewport — the result list should not overflow or be inaccessible

**Depends on:** Implementation Task 6.1

---

**[x] QA 6.2 — Credit submission form: validation and batch submission**

- Click "Add a credit" on a building detail page — the sheet slides in
- Attempt to submit with both person and company fields empty — an inline validation error appears; no API call is made (confirm via Network tab)
- Fill in person only + role, submit — one `building_credits` row is created with `person_id` populated and `company_id` null
- Fill in company only + role, submit — `company_id` populated, `person_id` null
- Fill in both person and company — both fields are populated on the created row
- Select role "Other" — a free-text input appears; submitting populates `role_custom`; `role` is set to `other`
- Check is_lead when another credit with the same role already has `is_lead = true` — a non-blocking warning appears; the form is not prevented from submitting
- Click "Add another" — a second blank entry row appends below the first; fill both and submit — two `building_credits` rows are created
- Simulate the first row succeeding and the second failing (temporarily break the API for the second call) — the first row shows a success indicator; the second shows an error; the sheet does not auto-close

**Depends on:** Implementation Task 6.2

---

**[x] QA 6.3 — Post-submission notification email flow**

- After a successful credit submission, the notification step appears in the same sheet
- Paste a comma-separated list of 3 valid email addresses — they are parsed into pills
- Paste 16 addresses — only 15 are accepted; a count warning or truncation message is shown
- Paste an invalid email address mixed with valid ones — the invalid address is highlighted or an error is shown; the form blocks submission until it is resolved
- Click "Skip" — the sheet closes; the `notify-credited-entities` edge function is NOT called (check Supabase function logs)
- Click "Send notifications" — the edge function is called; `credit_notification_log` has new rows with `recipient_hash` populated and no plaintext email address anywhere; no raw addresses appear in any DB table
- Check one of the received notification emails: building name and hero image are present; credit details (role, entity name) are correct; "Claim your profile" CTA links to `/person/[slug]` or `/company/[slug]`; "Remove this credit" button has a `/remove-credit/[token]` URL

**Depends on:** Implementation Task 6.3

---

**[x] QA 6.4 — One-click credit removal via token**

- Click a removal link from a notification email — browser navigates to `/remove-credit/[token]`; success page shows the building name with a link back to the building page; `building_credits` row has `status = 'hidden'`; `credit_removal_tokens` row has `used_at` populated
- Visit the building page — the removed credit is no longer visible to regular users
- Click the same removal link again — an error page is shown ("This link has already been used" or similar); the credit status remains `hidden` and is not toggled back
- Manually set `expires_at` to the past on a token; visit the removal URL — error page is shown; credit status is unchanged
- Visit `/remove-credit/completely-invalid-token` — error page is shown; no DB changes occur
- The `/remove-credit/:token` route requires no authentication — confirm it loads correctly when logged out

**Depends on:** Implementation Task 6.4

---

## Phase Q7 — Claiming Flows

---

**[x] QA 7.1 — Claim a person profile**

- Visit an unclaimed person page as a logged-in user — "Claim this profile" CTA is visible
- Visit the same page as a logged-out user — CTA is visible but clicking should prompt login before the claim form is shown
- Submit the claim form (selecting "This is me") — `claimed_by_user_id` is set to the current user's ID; `claim_status = 'claimed'`; the unclaimed banner disappears; edit controls appear
- Visit the same person page as a different logged-in user — the claim CTA is no longer visible; no edit controls are present
- Confirm the `notify-entity-claimed` edge function was triggered (check Supabase function logs) — it should have fired for any active credits that reference this person
- The old `ClaimProfileDialog` component is no longer rendered anywhere — grep `src/` and `app/` for `ClaimProfileDialog` and confirm zero results
- Note: the claim is granted immediately without admin approval. This is the intended lighter trust model; the admin moderation queue (Phase Q8) is the backstop.

**Depends on:** Implementation Task 7.1

---

**[x] QA 7.2 — Claim a company: first claimant**

- Visit an unclaimed company page — "Claim this company" CTA is visible
- Submit with a work email whose domain is consistent with the company — a verification email is sent (check edge function logs); the company still shows as unclaimed until the token is used
- Click the verification link in the email — a `company_stewards` row is created with `role = 'owner'`; `claim_status = 'claimed'`; `verified_domain` is set to the email's domain; browser redirects to the company page with a success toast; edit controls are now visible
- Click an expired verification link — an error page is shown; the company is not claimed
- Attempt to claim an already-claimed company using an email whose domain does not match `verified_domain` — the flow routes to the dispute dialog (Task 7.4), not the email verification flow

**Depends on:** Implementation Task 7.2

---

**[x] QA 7.3 — Request steward invite for an already-claimed company**

- Visit a claimed company page as a non-steward — "Request access to manage this company" CTA is visible; "Claim this company" CTA is absent
- Submit a request — a `company_steward_requests` row is created with `status = 'pending'`; the existing owner receives a notification email
- Owner clicks the approve link in the email — a `company_stewards` row is created with `role = 'steward'`; the request `status` is set to `'approved'`; the requester receives a confirmation email
- The requester visits the company page — edit controls are now visible
- Owner clicks the same approval link a second time — no duplicate `company_stewards` row is created (the operation is idempotent; confirm by checking the row count)

**Depends on:** Implementation Task 7.3

---

**[x] QA 7.4 — Dispute a company claim**

- Visit a claimed company page as a logged-in non-steward — "Dispute this claim" link is visible below the steward request CTA
- Submit a dispute with a reason and an optional evidence URL — a `company_claim_disputes` row is created with `status = 'open'`; the admin notification edge function fires (check function logs)
- The disputing user sees a "Dispute under review" notice on the company page — other users (including logged-out visitors) do not see this notice
- The company page is otherwise unaffected: credits are still visible, the company name is unchanged, and the steward request CTA is still present for other users

**Depends on:** Implementation Task 7.4

---

## Phase Q8 — Admin Panel

---

**[x] QA 8.1 — Flagged credits moderation queue**

- Flag a credit (see QA 5.3), then visit the admin panel Credits section — the flagged credit appears in the queue showing: flag reason, flag notes (if any), who added the credit (`added_by_user_id` display name), flagged timestamp, building name (as a link), and credited entity name (as a link)
- Click "Dismiss flag" — the credit's `status` returns to `active`; the credit disappears from the queue; the credit reappears on the building page for regular users
- Flag the credit again; click "Verify" — `status` becomes `verified`; the verified icon appears on the building page; the `added_by_user_id` user receives a notification email
- Flag the credit again; click "Hide" — `status` becomes `hidden`; the credit disappears from the building page for non-admins; the `added_by_user_id` user receives a notification email
- Flag a `verified` credit (e.g. one set to verified in the step above) — it appears in the queue but does NOT auto-hide; it remains `verified` in the DB until an admin manually acts on it
- The 30-day countdown timer for each flagged credit reflects the correct time remaining based on `flagged_at`

**Depends on:** Implementation Task 8.1

---

**[x] QA 8.2 — Admin: people and companies management; entity claims queue**

- `AdminPeople` page: search for a known person by name — the result appears; manually set `claim_status = 'verified'` — the verified badge appears on the person's public page
- Merge two people in the admin panel: all `building_credits` rows that had `person_id = source.id` now have `person_id = target.id`; the source person row is deleted; no orphaned credits remain (`SELECT count(*) FROM building_credits WHERE person_id = '[source id]'` returns 0)
- `AdminCompanies` page: expand the steward count for a company — the steward list renders correctly; spot-check that only actual stewards are shown
- `EntityClaims` page: shows person claims in one tab and open company claim disputes in another; resolving a dispute sets its `status = 'resolved'` and removes it from the open queue
- The old `ArchitectClaims.tsx` page no longer appears in the admin sidebar and the route no longer resolves

**Depends on:** Implementation Task 8.2

---

**[x] QA 8.3 — Audit log coverage**

- Add a credit to a building — query `admin_audit_logs` for `action_type = 'credit_added'` and `target_id = [credit id]` — a row exists; `target_type = 'credit'`
- Change a credit's status (e.g. flag it) — an audit row exists with `details` JSONB containing `old_value` and `new_value` keys (e.g. `{"old_value": "active", "new_value": "flagged"}`)
- Claim a person profile — an audit row exists with `action_type = 'person_claimed'`
- Open `BuildingAudit` in the admin panel for the building used above — credit-related audit events appear in the history list alongside other building changes
- Confirm no new columns were added to `admin_audit_logs` schema — all credit audit data fits into the existing `details` JSONB column; `action_type`, `target_type`, `target_id` reuse existing columns with new enum values

**Depends on:** Implementation Task 8.3

---

## Phase Q9 — Portfolio Dashboards

---

**[x] QA 9.1 — Person portfolio dashboard and profile page portfolio tab**

- Log in as a user with a claimed person profile — "My Portfolio" appears in the sidebar nav; clicking it navigates to the portfolio dashboard
- Dashboard stats are correct: total buildings credited, number of distinct roles, year range — cross-check totals against a direct DB query (`SELECT count(DISTINCT building_id) FROM building_credits WHERE person_id = '[id]'`)
- Portfolio grid: buildings are grouped by `credit_tier`; sorting by year reorders the grid correctly; sorting by role reorders correctly
- Each building card shows the role badge and the company name (if present) for that specific credit
- Visit `/user/:username` (the social profile page) for this user — the portfolio tab is present and links to the person dashboard; the tab does NOT re-implement the full portfolio inline; it must not still render based on `profiles.verified_architect_id`
- Log in as a user without a claimed person profile — "My Portfolio" nav link is absent; the portfolio tab is absent from their user profile page

**Depends on:** Implementation Task 9.1

---

**[x] QA 9.2 — Company steward dashboard**

- Log in as an owner steward — the company name appears in the sidebar nav; clicking it navigates to the company dashboard
- Dashboard shows all buildings credited to the company, grouped by role; the role filter works correctly
- "Pending access requests" section is visible to the owner; approve a pending request — the `company_stewards` row is created; the request disappears from the pending list
- Log in as a regular steward (not owner) — "Pending access requests" section is absent
- Log in as a user who is steward of two companies — the sidebar shows a dropdown listing both company names; selecting each navigates to the correct dashboard
- Log in as a non-steward — the company dashboard route is inaccessible (redirect or 403); no company name appears in the sidebar

**Depends on:** Implementation Task 9.2

---

## Phase Q10 — Search & Discovery

---

**[x] QA 10.1 — Global search: people and companies; deprecated architect search components**

- Search for a known individual's name — a "People" tab appears in results with at least one result; the result shows name, credit count, and nationality or avatar
- Search for a known firm name — a "Companies" tab shows the result with name, country, and credit count
- Main search bar autocomplete: type a partial name — people and company matches appear alongside building matches with distinct type icons differentiating entity types
- `ArchitectSearchNudge` component: renders without errors; open the Network tab while it renders — confirm no request is made to an `architects` table endpoint
- Both `ArchitectSelect` files are gone: run `find src/ app/ -name "ArchitectSelect*"` — zero results; the functionality has been replaced by `CreditEntityPicker` or a people-only variant
- `FeaturedArchitect` component (if it was retained rather than removed): confirm it queries `people` and `building_credits`, not `architects` or `building_architects`; confirm all links it renders point to `/person/[slug]`, not `/architect/:id`

**Depends on:** Implementation Task 10.1

---

**[x] QA 10.2 — Credits filter on building discovery and map**

- Open the building discovery filter panel — a "Credits" section is present with a Company combobox and a Role multi-select
- Search for a company in the Company combobox (e.g. "Arup") — the building results update to show only buildings with an active (non-hidden) credit for that company
- Select a Role filter (e.g. "Structural Engineer") — results are further narrowed; buildings without any non-hidden structural engineering credit are excluded
- Combine company + role filters — only buildings matching both conditions appear
- Clear both filters — the full unfiltered building set is restored
- Apply filters, copy the URL, open it in a new tab — the filters are restored from URL params and results match the original filtered view

**Depends on:** Implementation Tasks 2.3, 2.4

---

## Phase Q11 — Cleanup & Regression

---

**[x] QA 11.1 — Routes: confirm all new routes are in `app/routes`, not `src/routes.ts`**

- Open `app/routes` (the canonical routes file, outside `src/`) — confirm the following routes are defined there: `/person/:slug`, `/company/:slug`, `/remove-credit/:token`, `/verify-company-claim/:token`, `/approve-steward-request/:token`
- Open `src/routes.ts` — confirm none of the above routes are defined there (it should remain a re-export shim only)
- Navigate to each new route in the browser — all load correctly with no 404 or white screen
- Navigate to `/architect/[old-uuid]` — the redirect defined in `app/routes` fires correctly (not from `src/routes.ts`)

**Depends on:** Implementation Tasks 3.1, 4.1, 6.4, 7.2, 7.3

---

**[x] QA 11.2 — Complete removal of all deprecated artifacts**

Run each of the following greps from the project root. Each should return zero results:

```bash
# Old tables referenced in code
grep -r "building_architects\|\"architects\"\|\`architects\`\|from architects\|\.architects\b" src/ app/

# Deprecated components
grep -r "ArchitectSelect\|ClaimProfileDialog\|ArchitectPortfolio\|useArchitectPortfolio" src/ app/
grep -r "ArchitectDashboard\|FeaturedArchitect\|DisconnectArchitectDialog" src/ app/
grep -r "ArchitectDetails" src/ app/

# Old route pattern (except in the redirect handler and LAUNCH_HOSTING.md)
grep -r "\/architect\/" src/ app/ | grep -v "redirect\|LAUNCH_HOSTING"
```

- TypeScript build: run `tsc --noEmit` — zero errors; zero `@deprecated` type references remaining
- Supabase migration log confirms `architects` and `building_architects` tables are dropped with no FK constraint violations
- Building detail page, person pages, company pages, and portfolio dashboard all render correctly after the table drop

**Depends on:** Implementation Task 11.1

---

**[x] QA 11.3 — SEO: structured data, sitemap, and meta tags**

- Fetch the sitemap output from the sitemap edge function — it contains `/person/[slug]` URLs; it contains `/company/[slug]` URLs; it contains zero `/architect/` URLs
- Spot-check 3 person pages and 3 company pages with Google's Rich Results Test or the Schema.org validator — structured data validates with no errors for `Person` and `Organization` types
- Inspect `<head>` on a person page: correct `<title>`, `<meta name="description">`, and `<link rel="canonical">` are all present
- Inspect `<head>` on a company page: same checks
- Open `public/robots.txt` — `/person/` and `/company/` paths are not excluded
- Open `LAUNCH_HOSTING.md` — server-level redirect rules for `/architect/*` → `/person/*` (or `/company/*` for studios) are documented

**Depends on:** Implementation Task 11.2

---

**[x] QA 11.4 — Full regression: building detail page end-to-end**

- Visit a building that had an architect before migration: the header shows architect name(s) as links to `/person/` or `/company/`; the credits section shows the migrated credit in the primary tier; no broken links; no console errors
- Visit a building with no credits at all: the credits section shows an empty state with the "Add a credit" CTA; no JS errors
- Add three credits to the same building: one person-only, one company-only, one person + company — all three appear in the credits section with the correct display format for each type
- Flag one of the new credits (as a logged-out user) — it disappears from the section after an admin hides it; the admin panel shows it in the flagged queue
- Open the building edit form — the old architect selector is gone; no reference to `building_architects` appears in the form; the credits interface is present instead
- Run the full existing test suite for the buildings feature: `BuildingDetails.test.tsx`, `BuildingHeader.test.tsx`, `BuildingAttributes.test.tsx`, `BuildingForm.test.tsx` — all pass

**Depends on:** All prior QA phases

---

**[x] QA 11.5 — Full regression: user profile and navigation**

- Log in as a user with a claimed person profile: the "Professional profile" section is present on their `/user/:username` page; the portfolio tab is present and links to the person dashboard; "My Portfolio" appears in the sidebar nav
- Log in as a user without a claimed person profile: the "Professional profile" section is absent; the portfolio tab is absent; "My Portfolio" is absent from the nav
- Visit the settings page as a user who previously had a verified architect identity: `DisconnectLegacyClaimDialog` is rendered instead of the removed architect dialog; no broken UI exists in the legacy-claim section; **Remove claimed profile link** (or equivalent) correctly clears `claimed_by_user_id` when used
- Run `AppSidebar.test.tsx` — all tests pass; presence and absence of the "My Portfolio" link based on claimed profile state is tested
- Log out and log back in as several different users (with and without claimed profiles, with and without steward roles) — the sidebar nav state updates correctly each time with no stale cached items

**Depends on:** All prior QA phases

---

**[x] QA 11.6 — Documentation audit**

- Open `DATA_CONTRACT.md`: every new table (`people`, `companies`, `company_stewards`, `person_company_affiliations`, `building_credits`, `credit_notification_log`, `credit_removal_tokens`, `company_steward_requests`, `company_claim_disputes`) is documented with columns, constraints, and RLS policies; zero references remain to `architects` or `building_architects`
- Open `PRD.md`: FR-4.1.8 references `building_credits` not `building_architects`; FR-4.2.6 reflects the updated `ArchitectStatement` attribution source; FR-4.3.5 references `CreditEntityPicker` not the old architect selector
- Open `ROADMAP.md`: "Building Credits" is marked as shipped
- Open `SECURITY.md` (or equivalent): the signed token pattern for one-click removal and company claim verification is documented, including the token lifecycle: issued on send, stored as a hash, single-use (enforced via `used_at`), 30-day expiry
- Check all doc files for broken internal links to removed components or old routes — none should exist

**Depends on:** Implementation Task 11.3

---

*End of QA & Regression Roadmap*