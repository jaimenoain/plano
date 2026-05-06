# PLANO — Awards Hub: Implementation Roadmap

**Version:** 1.0 — May 2026  
**Scope:** Five phases, each a shippable vertical slice. Phases 1–4 carry forward the existing awards foundation plan; Phase 5 is new and delivers the Awards Hub page designed in this session.

---

## Overview

| Phase | Title | Deliverable | Touches |
|-------|-------|-------------|---------|
| 1 | Foundation | DB schema, RLS, TypeScript types, admin CRUD | DB + admin only |
| 2 | Entity display | Awards sections on building / person / company pages; public `/award/*` routes | Public, SEO |
| 3 | Discovery | Map filter, search filter, leaderboard dialog, award badge on building cards, award-win notifications | Map, search, notifications |
| 4 | Community | Suggestion flow (users), admin review workflow, awarding-body section on company pages | Community, admin |
| 5 | Awards Hub | Standalone `/awards` page: recent feed, leaderboard tab, directory tab, right rail stats | New public surface |

Each phase can be merged and deployed independently. No phase requires the next one to function correctly.

---

## [x] Phase 1 — Foundation

> DB schema · RLS · TypeScript types · Admin CRUD  
> **Audience:** Admins only. Nothing is public-facing.

The sole purpose of this phase is to create a correct, secure data layer and give admins the ability to curate awards data before any user sees it.

### Tasks

**1.1 — Migration: core tables**  
File: `supabase/migrations/YYYYMMDDHHMMSS_awards_foundation.sql`

Create four tables with RLS enabled on all of them:

- `awards` — the award concept (Stirling Prize, Pritzker Prize). Fields: `id`, `name`, `slug`, `description`, `website`, `country`, `frequency` (`annual` | `biennial` | `ad_hoc`), `awarding_body_type`, `awarding_body_company_id` (FK → `companies`), `awarding_body_name`, `is_active`. Admin-write, public-read.
- `award_editions` — one row per ceremony year. Fields: `id`, `award_id`, `year`, `edition_date`, `ceremony_location`, `notes`. Admin-write, public-read.
- `award_categories` — sub-divisions within an award (e.g. "New Building", "Retrofit"). Fields: `id`, `award_id`, `name`, `is_active`, `valid_from_edition_id`, `valid_to_edition_id`. Awards with no sub-divisions get a single "Main Award" row. Admin-write, public-read.
- `award_recipients` — the junction linking edition + category to a building, person, or company. Fields: `id`, `edition_id`, `category_id`, `recipient_type` (`building` | `person` | `company`), `recipient_building_id`, `recipient_person_id`, `recipient_company_id`, `outcome` (enum: `winner` | `highly_commended` | `commended` | `special_mention` | `finalist` | `shortlisted` | `longlisted` | `nominated`), `notes`. Constraint: exactly one of the three recipient FK columns must be non-null. Admin-write, public-read.

Add indexes on all FK columns and on `outcome`, `year DESC`.

**1.2 — TypeScript types and Zod schemas**  
Files: `src/features/awards/types/awards.ts`, `src/features/awards/lib/validations.ts`

- Export `AwardOutcome`, `RecipientType`, `AwardDTO`, `AwardEditionDTO`, `AwardCategoryDTO`, `AwardRecipientDTO`.
- Export Zod schemas: `CreateAwardSchema`, `UpdateAwardSchema`, `CreateEditionSchema`, `CreateCategorySchema`, `CreateRecipientSchema`.
- Regenerate `src/integrations/supabase/types.ts` via the Supabase CLI after running the migration.

**1.3 — API layer and React Query hooks**  
Files: `src/features/awards/api/awards.ts`, `src/features/awards/hooks/useAwards.ts`

Query functions: `getAwards`, `getAwardBySlug`, `getEditionsByAward`, `getCategoriesByAward`, `getRecipientsByEdition`, `getAwardsByBuilding`, `getAwardsByPerson`, `getAwardsByCompany`. All use 5-minute stale time, no refetch on window focus.

**1.4 — Admin routes and sidebar link**

Register inside the admin layout block in `app/routes.ts`:

```
/admin/awards                              → AwardsList.tsx
/admin/awards/new                          → AwardForm.tsx
/admin/awards/:awardId                     → AwardDetail.tsx
/admin/awards/:awardId/edit                → AwardForm.tsx
/admin/awards/:awardId/editions/new        → EditionForm.tsx
/admin/awards/:awardId/editions/:editionId → EditionDetail.tsx
```

Add `{ title: "Awards", url: "/admin/awards", icon: Trophy }` to `AdminSidebar.tsx`.

**1.5 — Admin page components**  
All files under `src/features/admin/pages/` and `src/features/admin/components/`:

- `AwardsList.tsx` — searchable table: name, awarding body, frequency, edition count, active toggle, edit action.
- `AwardForm.tsx` — create/edit form: name, slug (live kebab-case preview via `check_slug_availability`), description, website, country, frequency, awarding body (company picker or free-text name), `isActive`.
- `AwardDetail.tsx` — award overview; lists all editions. Button to add new edition. Link to `ManageCategoriesDialog`.
- `EditionForm.tsx` — create/edit edition: year, date, ceremony location, notes.
- `EditionDetail.tsx` — lists recipients by category. Button opens `AddRecipientDialog`.
- `AddRecipientDialog.tsx` — three-step dialog: (1) select category, (2) select outcome, (3) pick entity via tabbed search (building / person / company). Inserts `award_recipients` row on confirm.
- `ManageCategoriesDialog.tsx` — list of categories for an award with add / rename / archive actions.

### Definition of done
An admin can open `/admin/awards`, create an award with editions and categories, add recipients of all three types, and edit or deactivate any record. No public routes exist yet.

---

## [x] Phase 2 — Entity Display

> Public award pages · Awards sections on building / person / company pages · SEO  
> **Audience:** All visitors. Award data becomes publicly crawlable.

### Tasks

**2.1 — Public route registration**  
Add to `app/routes.ts` inside the `MainLayout` block:

```
/award/:slug       → features/awards/pages/AwardPage.tsx
/award/:slug/:year → features/awards/pages/AwardEditionPage.tsx
```

**2.2 — `AwardPage` — `/award/:slug`**  
File: `src/features/awards/pages/AwardPage.tsx`

Header: award name, awarding body (linked to `/company/:slug` if FK exists, else plain text), country, frequency badge, website link. Description block. Edition list newest-first: year/date, ceremony location, recipient count, `VIEW →` link. Data: `useAward(slug)` + `useEditionsByAward(awardId)`. Export `loader` for SSR and `meta()` returning title `"[Award Name] | Plano"`, description, canonical, og tags.

**2.3 — `AwardEditionPage` — `/award/:slug/:year`**  
File: `src/features/awards/pages/AwardEditionPage.tsx`

Header: award name (linked back to `/award/:slug`), year, ceremony location. Breadcrumb: Home / Awards / [Award Name] / [Year]. Recipients grouped by category (skip category heading when only "Main Award" exists). Each recipient rendered by `AwardRecipientCard`. Export `loader` and `meta()` with title `"[Award] [Year] Winners | Plano"`.

**2.4 — `AwardRecipientCard`**  
File: `src/features/awards/components/AwardRecipientCard.tsx`

Shared card for edition pages and entity-page award sections:

- Building: 48×48 hero image thumbnail (`rounded-sm`, fallback to building initial tile), name linked to `/building/:id/:slug`, city/country, year completed.
- Person: 32×32 avatar circle (headshot or initial), name linked to `/person/:slug`, nationality.
- Company: logo (32×32) or initial tile, name linked to `/company/:slug`.
- Outcome badge right-aligned: `winner` gets `border-brand-primary` + black text; all other outcomes get `surface-muted` + `text-secondary`.

**2.5 — Awards section on `BuildingDetails`, `PersonPage`, `CompanyPage`**  
File: `src/features/awards/components/BuildingAwardsSection.tsx` (reused across all three pages)

Section divider label `AWARDS`. Each row: outcome badge + award name linked to `/award/:slug` + category name (omit if "Main Award") + year. Sorted by year DESC. Hidden when the entity has no recipients. Show 5 rows then `"Show all N awards →"` text CTA expanding inline. Add `SuggestAwardButton` below (stub for now, wired in Phase 4).

For `CompanyPage`: if `awarding_body_company_id = companyId`, also show `AWARDS ADMINISTERED` section (full implementation Phase 4; a stub is acceptable here).

**2.6 — SSR and sitemap**

- Add award routes to the Supabase `sitemap` edge function: emit `/award/:slug` for all active awards and `/award/:slug/:year` for all editions.
- Add award routes to the `og-tags` edge function: resolve award + edition data for link preview metadata.

### Definition of done
Any building, person, or company page with award data shows an `AWARDS` section. `/award/:slug` and `/award/:slug/:year` are publicly crawlable, return correct og tags, and appear in the sitemap.

---

## [ ] Phase 3 — Discovery

> Map filter · Search filter · Building card badge · Leaderboard dialog · Award-win notifications  
> **Audience:** All users. Awards become a discovery surface.

### Tasks

**3.1 — Migration: discovery RPCs and notification type**  
File: `supabase/migrations/YYYYMMDDHHMMSS_awards_discovery.sql`

- Create `get_buildings_with_awards(p_award_id, p_outcome, p_year_from, p_year_to)` — returns `TABLE(building_id UUID)`. Used as a sub-select inside existing map/search RPCs.
- Create `get_award_leaderboard(p_award_id, p_limit)` — returns buildings ranked by weighted award score (winner = 10, highly_commended = 6, commended = 5, special_mention = 4, finalist = 3, shortlisted = 2, longlisted = 1) with `win_count` and `finalist_count` columns.
- Extend `notifications.type` CHECK constraint to include `'award_win'`.
- Create AFTER INSERT trigger on `award_recipients`: when `recipient_type = 'building'`, look up all active `building_credits` rows for that building where the credited person has a `claimed_by_user_id`. Insert a notification row for each: `type = 'award_win'`, metadata `{ award_name, edition_year, building_name, building_slug, outcome }`.

**3.2 — Extend map and search filter schemas**  
File: `src/features/map/lib/validations.ts`

Add to `MapFilterSchema`: `awardId` (UUID), `awardOutcome` (outcome enum), `awardYearFrom` (int), `awardYearTo` (int). Pass through to `get_map_clusters_v2` and `get_buildings_list` RPCs as an additional `b.id IN (SELECT building_id FROM get_buildings_with_awards(...))` clause.

**3.3 — Filter drawer: Awards accordion**  
File: `src/features/map/components/FilterDrawer.tsx`

Add an "Awards" accordion section below "Quality". Contents: searchable award combobox (all active awards via `useAwards()`), minimum outcome dropdown (Winner only / Finalist or better / Shortlisted or better / Any), optional year-from and year-to number inputs.

**3.4 — Award leaderboard dialog**  
File: `src/features/awards/components/AwardLeaderboardDialog.tsx`

Award selector dropdown (all awards or one specific award). Ranked building rows: rank number, 36×36 hero thumbnail, name linked to building page, city, country, win count badge, weighted score. Data: `supabase.rpc('get_award_leaderboard', { p_award_id, p_limit: 50 })`. Add an "Awards" tab to the existing global leaderboard dialog surface.

**3.5 — Award badge on building cards**  
File: `src/features/buildings/components/BuildingCard.tsx`

Add `winnerAwardName: string | null` to `BuildingSummaryDTO` (populated by LEFT JOIN in `search_buildings` RPC — most recent winner award name). If set, render a small `Trophy` icon + award name in `text-2xs text-secondary uppercase tracking-wide` below the city/year line.

**3.6 — Notification rendering**  
In the Notifications page, add a case for `'award_win'`: `"[Building name] won the [Award name] [Year]"`. Link to `/building/:id/:slug`.

### Definition of done
Users can filter the map to "Stirling Prize winners only". Award-winning buildings show a trophy badge on cards. Credited architects receive an in-app notification when a building they are credited on wins an award. The leaderboard dialog has an Awards tab.

---

## [ ] Phase 4 — Community

> User suggestion flow · Admin review · Awarding-body company section  
> **Audience:** Authenticated users (suggestions), admins (review).

### Tasks

**4.1 — Migration: suggestions table and approval RPC**  
File: `supabase/migrations/YYYYMMDDHHMMSS_awards_community.sql`

- Create `award_recipient_suggestions` table: `submitted_by`, `award_id`, `edition_id` (nullable), `category_id` (nullable), `recipient_type`, `recipient_building/person/company_id`, `outcome`, `year`, `source_url` (required), `notes`, `status` (`pending` | `approved` | `rejected`), `reviewed_by`, `reviewer_note`, `reviewed_at`. Constraint: exactly one recipient FK non-null.
- RLS: authenticated users can insert their own rows and read their own rows. Admins can read and update all. No delete.
- Create `approve_award_suggestion(p_suggestion_id)` RPC: resolves or creates the edition, resolves category, inserts `award_recipients`, marks suggestion approved — all in a single transaction.

**4.2 — `SuggestAwardButton` and `SuggestAwardDialog`**  
Files: `src/features/awards/components/SuggestAwardButton.tsx`, `SuggestAwardDialog.tsx`

- `SuggestAwardButton`: `"Suggest an award →"` text CTA, auth-gated, opens dialog.
- `SuggestAwardDialog`: four-step flow: (1) award combobox + year input (shows "existing edition found" or "new edition will be created"), (2) category dropdown + outcome dropdown with prestige descriptions on hover, (3) recipient (pre-filled from page entity or tabbed search), (4) source URL (required) + notes textarea. Confirmation summary on submit. Success toast: `"Thank you — your suggestion is under review."` Wire `SuggestAwardButton` into the stub added in Phase 2.

**4.3 — Admin suggestion review**

Register routes:
```
/admin/awards/suggestions              → AwardSuggestions.tsx
/admin/awards/suggestions/:suggestionId → AwardSuggestionDetail.tsx
```

- Add pending suggestion count badge to the Awards sidebar link: `{ title: "Awards", url: "/admin/awards", icon: Trophy, badge: pendingSuggestionCount }`.
- `AwardSuggestions.tsx` — table: submitted by, award, year, recipient, outcome, source URL, status, date. Default filter: pending. Filterable by status. Row click → detail page.
- `AwardSuggestionDetail.tsx` — full suggestion fields. Approve button calls `approve_award_suggestion` RPC and shows link to created edition. Reject button opens confirm modal with optional reason textarea; sets `status = 'rejected'`.

**4.4 — Awarding-body section on `CompanyPage`**

Complete the stub from Phase 2. Data: `useAwardsByBody(companyId)` — `awards` where `awarding_body_company_id = companyId` and `is_active = true`, with edition count. Section label `AWARDS ADMINISTERED`. Rows: award name linked to `/award/:slug`, frequency badge, edition count.

### Definition of done
Any authenticated user can submit a suggestion from a building, person, or company page. Admins see a badge count of pending suggestions and can approve or reject from a detail view. Approving atomically creates the edition (if needed) and recipient rows. Companies that administer awards show a dedicated section.

---

## [ ] Phase 5 — Awards Hub

> Standalone `/awards` page: recent feed, leaderboard tab, directory tab, right rail  
> **Audience:** All visitors. The first destination a curious user would navigate to.

This phase delivers the page designed in this session. It depends on Phases 1–3 being live (it needs recipients, leaderboard RPC, and the awards list). Phase 4 (suggestions) is a progressive enhancement — the "Suggest a recipient →" CTA can be present as a stub before Phase 4 ships.

### Tasks

**5.1 — Route registration**  
Add to `app/routes.ts`:
```
/awards → features/awards/pages/AwardsIndex.tsx
```

Add "Awards" to the main top navigation bar.

**5.2 — Page shell and tabs**  
File: `src/features/awards/pages/AwardsIndex.tsx`

Two-column layout: fluid centre feed (same pattern as the home feed) + 280px sticky right rail. Three tabs in the page header: Recent, Leaderboard, Directory. Tab state managed via URL search param (`?tab=recent` | `leaderboard` | `directory`) so tabs are deep-linkable. SSR-safe via `loader`.

Export `meta()`: title `"Awards | Plano"`, description `"Architecture's most recognised buildings, architects, and practices."`, canonical `/awards`.

**5.3 — Recent tab**

The default tab. Shows the latest `award_recipients` rows across all awards, newest edition year first.

- **Filter bar:** pill chips — All / Buildings / People / Companies / Winners only / This year. These map to client-side filter params appended to the existing query.
- **Query:** new API function `getRecentRecipients({ recipientType?, outcomeFilter?, year? }, limit)` — joins `award_recipients → award_editions → awards` and the appropriate entity table, ordered by `award_editions.year DESC`, then `award_recipients.created_at DESC`. Paginated with a "Show more →" text CTA (cursor-based, 20 per page).
- **Recipient rows:** use `AwardRecipientCard` (already built in Phase 2) — 72×72 thumbnail for buildings, 48×48 avatar for people, 48×48 logo tile for companies. Visual priority rule: prefer community hero image for buildings, headshot for people, logo for companies; fall back to initial tile.
- **Empty state:** `"No recipients match these filters."` with a prompt to adjust filters.
- **Suggest CTA:** `"Know of a missing award? Suggest a recipient →"` at the bottom (stub if Phase 4 not yet live).

**5.4 — Leaderboard tab**

Reuses `get_award_leaderboard` RPC from Phase 3.

- **Award selector:** searchable combobox — "All awards" (default) or a specific award. Changing selection re-fetches.
- **Ranked rows:** rank number (gold tint for #1), 36×36 building thumbnail, name linked to building page, city/country, win count pill, weighted score. Rows are the same structure as `AwardLeaderboardDialog` from Phase 3 — extract the row component so both surfaces share it.
- **People leaderboard:** a second ranked list (below or as a sub-tab) showing people by recipient count. Useful because the Pritzker and RIBA Gold Medal are person awards.
- **Data:** `supabase.rpc('get_award_leaderboard', { p_award_id, p_limit: 50 })` for buildings; a companion `get_person_award_leaderboard` RPC (simple COUNT on `award_recipients WHERE recipient_type = 'person'`) for people.

New migration needed if `get_person_award_leaderboard` is not already covered: add to `supabase/migrations/YYYYMMDDHHMMSS_awards_hub.sql`.

**5.5 — Directory tab**

Lists all active awards, grouped by prestige tier or alphabetically (toggle).

- **Row structure:** 32×32 awarding body logo (from linked company) or initial tile, award name linked to `/award/:slug`, awarding body name, frequency badge, edition count, most recent edition year.
- **Search input:** client-side filter across award name and awarding body name.
- **Data:** `useAwards()` hook from Phase 1 — already fetches all active awards.

**5.6 — Right rail**

Always-visible regardless of active tab. Three sections:

- **Stats row:** two metric tiles — "N awards tracked" and "N recipients". Counts from a lightweight `getAwardsStats()` query (single SQL row: `COUNT` on `awards WHERE is_active` and `COUNT` on `award_recipients`).
- **Most-awarded buildings:** top 3 from `get_award_leaderboard` with thumbnails. "Full leaderboard →" text CTA switches to Leaderboard tab.
- **Most-awarded people:** top 3 people by recipient count with avatar circles. "See all →" text CTA.
- **Prestigious awards:** top 5 awards by edition count (a proxy for longevity and prestige). Each row: initial tile, award name linked to `/award/:slug`, edition count, frequency badge. "All N awards →" text CTA switches to Directory tab.

**5.7 — SEO and sitemap**

- Add `/awards` to the sitemap edge function.
- Add `/awards` to the `og-tags` edge function with a static description and a computed `og:description` showing the current winner count.

### Definition of done
`/awards` is live, linked from the top nav, and renders all three tabs. The Recent tab is the default and shows paginated recipients with visual thumbnails. Leaderboard and Directory tabs are navigable via URL param. The right rail loads independently and does not block the feed. The page is crawlable with correct og tags.

---

## Dependency Map

```
Phase 1 (Foundation)
  └── Phase 2 (Entity Display)         — needs: tables, types, hooks
        └── Phase 5 (Awards Hub)       — needs: AwardRecipientCard, public routes, data
  └── Phase 3 (Discovery)              — needs: tables, types
        └── Phase 5 (Awards Hub)       — needs: get_award_leaderboard RPC
  └── Phase 4 (Community)              — needs: tables, types
        └── Phase 5 (Awards Hub)       — needs: SuggestAwardButton (progressive enhancement)
```

Phase 5 can begin once Phases 1, 2, and 3 are merged. The `SuggestAwardButton` at the bottom of the Recent tab is a stub until Phase 4 ships.

---

## Open Questions

**On images for awards themselves.** The current schema has no image field on `awards` or `award_editions`. Two options: (a) add an optional `ceremony_image_url` to `award_editions` — a photo of the venue or ceremony — which would let the `/award/:slug` page have a visual hero without depending on recipient images; (b) rely entirely on recipient images (which is what the current design does). Recommended: add `ceremony_image_url` to `award_editions` in Phase 1 so admins can populate it from day one, even if the UI for it only lands in Phase 2.

**On `get_person_award_leaderboard`.** The Phase 3 migration creates `get_award_leaderboard` for buildings only. Phase 5 needs a companion function for people. Options: (a) add it to the Phase 3 migration now (cheapest), (b) create a small dedicated migration in Phase 5. If Phase 3 hasn't shipped yet, add it there.

**On the Awards Hub route name.** `/awards` (plural) is the natural home-page URL. Confirm it doesn't conflict with any planned route before Phase 5 begins — the current route registry only defines `/award/:slug` (singular).