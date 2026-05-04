# PLANO — Awards Feature: Implementation Roadmap

**Version:** 1.0 — May 2026
**Status:** Draft — pending review
**Scope:** Four-phase delivery: DB foundation → Admin CRUD → Public display → Discovery & Community

---

## Overview

This document is the authoritative, self-contained implementation plan for the Awards feature in Plano. It covers database schema, Row Level Security policies, TypeScript types and Zod schemas, React Query hooks, UI components, routes, and admin surfaces — from Phase 1 (invisible foundation) through Phase 4 (community submissions and map-level discovery).

Each phase delivers end-to-end vertical value and can be shipped independently before the next begins. An agent implementing any phase should read this document in full, then read the relevant codebase files for that phase only.

| Phase | Title | Deliverable |
|-------|-------|-------------|
| 1 | Foundation | Four new DB tables, RLS, Supabase types, admin CRUD — nothing public-facing yet. |
| 2 | Display | Awards sections on building/person/company pages. Dedicated `/award/*` public routes. |
| 3 | Discovery | Map + search filter for award winners. Leaderboard variant. Notifications to credited parties. |
| 4 | Community | Community suggestion flow with admin approval. Award body claim linkage. |

---

## Conventions & Patterns

All code in this feature follows the existing Plano conventions. Key rules to keep consistent:

- **Framework:** React Router v7. Routes go in `app/routes.ts`.
- **Feature folder:** All new files go under `src/features/awards/`.
- **Supabase client:** Client-side queries use `supabase-js` + TanStack React Query (5-minute stale time, no refetch on window focus).
- **RLS:** Every table has Row Level Security enabled. Policies follow the `is_admin()` + owner-pattern already used throughout the codebase.
- **Types:** After each DB migration, regenerate `src/integrations/supabase/types.ts` via the Supabase CLI.
- **Slugs:** Generated as kebab-case from name, unique within the table. Follow the `check_slug_availability` RPC pattern for awards.
- **Migration naming:** Follow the pattern `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`.
- **Design tokens:** Use existing Tailwind token classes: `surface-card`, `border-border-default`, `rounded-sm`. Cards always use `border border-border-default`. No shadows by default.
- **Buttons:** Primary action = `bg-brand-primary text-text-inverse`. Ghost/secondary for row actions. Text CTAs on editorial surfaces use uppercase tracked text with → arrow.
- **Admin routes:** Protected by `AdminGuard`. Register inside the admin layout block in `app/routes.ts`. Add sidebar link to `src/features/admin/components/AdminSidebar.tsx`.

---

## [x] Phase 1 — Foundation

> DB schema · RLS · TypeScript types · Admin CRUD (no public UI)

Phase 1 is invisible to end users. Its sole purpose is to create a correct, secure data foundation and give admins the ability to curate awards data from day one. No public routes are added.

**Deliverable:** Admins can create, edit, and manage awards, editions, categories, and recipients entirely from the admin panel. Award data can be seeded immediately, ready for Phase 2 display.

---

### 1.1 Database Migration

File: `supabase/migrations/YYYYMMDDHHMMSS_awards_foundation.sql`

#### Table: `awards`

The top-level award entity — the concept itself (e.g. "Stirling Prize", "Pritzker Prize"). Admin-managed, never community-created.

```sql
CREATE TABLE public.awards (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT NOT NULL UNIQUE,
  description               TEXT,
  website                   TEXT,
  country                   TEXT,
  frequency                 TEXT NOT NULL DEFAULT 'annual'
                            CHECK (frequency IN ('annual','biennial','ad_hoc','other')),
  awarding_body_type        TEXT
                            CHECK (awarding_body_type IN ('company','person','organisation')),
  awarding_body_company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  awarding_body_name        TEXT,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one of company FK or free-text name must be set when body type is given
  CONSTRAINT awards_body_set CHECK (
    awarding_body_type IS NULL
    OR awarding_body_company_id IS NOT NULL
    OR awarding_body_name IS NOT NULL
  )
);
```

#### Table: `award_editions`

One row per annual (or ad-hoc) ceremony. Separating editions from the award concept lets you build a full historical record.

```sql
CREATE TABLE public.award_editions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id          UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  year              INTEGER,           -- nullable for ad-hoc awards
  edition_date      DATE,              -- ceremony date when known
  ceremony_location TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT award_editions_year_or_date CHECK (
    year IS NOT NULL OR edition_date IS NOT NULL
  )
);

CREATE INDEX award_editions_award_id_idx ON public.award_editions(award_id);
CREATE INDEX award_editions_year_idx     ON public.award_editions(year DESC);
```

#### Table: `award_categories`

Categories within an award. Awards with no sub-divisions should have a single row named "Main Award". Tracking `valid_from`/`valid_to` editions allows retiring or adding categories over time.

```sql
CREATE TABLE public.award_categories (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id              UUID NOT NULL REFERENCES public.awards(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  valid_from_edition_id UUID REFERENCES public.award_editions(id) ON DELETE SET NULL,
  valid_to_edition_id   UUID REFERENCES public.award_editions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX award_categories_award_id_idx ON public.award_categories(award_id);
```

#### Table: `award_recipients`

The junction table linking an edition + category to a recipient entity (building, person, or company). The `outcome` column captures the full spectrum from longlisted to winner.

```sql
CREATE TABLE public.award_recipients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id            UUID NOT NULL REFERENCES public.award_editions(id) ON DELETE CASCADE,
  category_id           UUID NOT NULL REFERENCES public.award_categories(id) ON DELETE CASCADE,
  recipient_type        TEXT NOT NULL
                        CHECK (recipient_type IN ('building','person','company')),
  recipient_building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  recipient_person_id   UUID REFERENCES public.people(id) ON DELETE CASCADE,
  recipient_company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  outcome               TEXT NOT NULL DEFAULT 'winner'
                        CHECK (outcome IN (
                          'winner','finalist','shortlisted','longlisted',
                          'nominated','commended','highly_commended','special_mention'
                        )),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Exactly one recipient FK must be set
  CONSTRAINT award_recipients_single_target CHECK (
    (recipient_building_id IS NOT NULL)::INT +
    (recipient_person_id   IS NOT NULL)::INT +
    (recipient_company_id  IS NOT NULL)::INT = 1
  ),
  -- recipient_type must agree with the non-null FK
  CONSTRAINT award_recipients_type_fk_agreement CHECK (
    (recipient_type = 'building' AND recipient_building_id IS NOT NULL) OR
    (recipient_type = 'person'   AND recipient_person_id   IS NOT NULL) OR
    (recipient_type = 'company'  AND recipient_company_id  IS NOT NULL)
  )
);

CREATE INDEX award_recipients_edition_id_idx   ON public.award_recipients(edition_id);
CREATE INDEX award_recipients_category_id_idx  ON public.award_recipients(category_id);
CREATE INDEX award_recipients_building_id_idx  ON public.award_recipients(recipient_building_id);
CREATE INDEX award_recipients_person_id_idx    ON public.award_recipients(recipient_person_id);
CREATE INDEX award_recipients_company_id_idx   ON public.award_recipients(recipient_company_id);
CREATE INDEX award_recipients_outcome_idx      ON public.award_recipients(outcome);
```

---

### 1.2 Row Level Security

All four tables are admin-managed for writes. Reads are public (`SELECT = true`) so data can be displayed on public pages without authentication.

#### `awards`

```sql
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "awards_select" ON public.awards
  FOR SELECT USING (true);

CREATE POLICY "awards_insert" ON public.awards
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "awards_update" ON public.awards
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "awards_delete" ON public.awards
  FOR DELETE USING (public.is_admin());
```

#### `award_editions`, `award_categories`, `award_recipients`

Apply the same four policies (select/insert/update/delete) to each table, using `public.is_admin()` for all writes and `USING (true)` for SELECT. Example for `award_editions`:

```sql
ALTER TABLE public.award_editions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "award_editions_select" ON public.award_editions FOR SELECT USING (true);
CREATE POLICY "award_editions_insert" ON public.award_editions FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "award_editions_update" ON public.award_editions FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "award_editions_delete" ON public.award_editions FOR DELETE USING (public.is_admin());
```

Repeat for `award_categories` and `award_recipients`.

---

### 1.3 TypeScript Types & Zod Schemas

File: `src/features/awards/types/awards.ts`

```typescript
export type AwardOutcome =
  | 'winner' | 'finalist' | 'shortlisted' | 'longlisted'
  | 'nominated' | 'commended' | 'highly_commended' | 'special_mention';

export type RecipientType = 'building' | 'person' | 'company';

export interface AwardDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  country: string | null;
  frequency: 'annual' | 'biennial' | 'ad_hoc' | 'other';
  awardingBodyType: 'company' | 'person' | 'organisation' | null;
  awardingBodyCompanyId: string | null;
  awardingBodyName: string | null;
  isActive: boolean;
  createdAt: string;
  // Joined:
  awardingBodyCompany?: { id: string; name: string; slug: string } | null;
  editionCount?: number;
}

export interface AwardEditionDTO {
  id: string;
  awardId: string;
  year: number | null;
  editionDate: string | null;   // ISO date
  ceremonyLocation: string | null;
  notes: string | null;
  createdAt: string;
  // Joined:
  award?: AwardDTO;
  recipientCount?: number;
}

export interface AwardCategoryDTO {
  id: string;
  awardId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  validFromEditionId: string | null;
  validToEditionId: string | null;
  createdAt: string;
}

export interface AwardRecipientDTO {
  id: string;
  editionId: string;
  categoryId: string;
  recipientType: RecipientType;
  recipientBuildingId: string | null;
  recipientPersonId: string | null;
  recipientCompanyId: string | null;
  outcome: AwardOutcome;
  notes: string | null;
  createdAt: string;
  // Joined (populated by queries):
  building?: { id: string; name: string; slug: string; heroImageUrl: string | null } | null;
  person?:   { id: string; name: string; slug: string; avatarUrl: string | null } | null;
  company?:  { id: string; name: string; slug: string } | null;
  edition?:  { year: number | null; editionDate: string | null };
  category?: { name: string };
  award?:    { name: string; slug: string };
}
```

File: `src/features/awards/lib/validations.ts`

```typescript
import { z } from 'zod';

export const CreateAwardSchema = z.object({
  name:                   z.string().min(1).max(300),
  slug:                   z.string().min(1).max(300).regex(/^[a-z0-9-]+$/),
  description:            z.string().max(5000).optional().nullable(),
  website:                z.string().url().max(2000).optional().nullable(),
  country:                z.string().max(200).optional().nullable(),
  frequency:              z.enum(['annual','biennial','ad_hoc','other']).default('annual'),
  awardingBodyType:       z.enum(['company','person','organisation']).optional().nullable(),
  awardingBodyCompanyId:  z.string().uuid().optional().nullable(),
  awardingBodyName:       z.string().max(500).optional().nullable(),
  isActive:               z.boolean().default(true),
});
export const UpdateAwardSchema = CreateAwardSchema.partial();

export const CreateEditionSchema = z.object({
  awardId:           z.string().uuid(),
  year:              z.number().int().min(1800).max(2100).optional().nullable(),
  editionDate:       z.string().optional().nullable(),   // ISO date
  ceremonyLocation:  z.string().max(500).optional().nullable(),
  notes:             z.string().max(2000).optional().nullable(),
}).refine(d => d.year != null || d.editionDate != null, {
  message: 'Either year or editionDate must be provided',
});

export const CreateCategorySchema = z.object({
  awardId:              z.string().uuid(),
  name:                 z.string().min(1).max(300),
  description:          z.string().max(2000).optional().nullable(),
  isActive:             z.boolean().default(true),
  validFromEditionId:   z.string().uuid().optional().nullable(),
  validToEditionId:     z.string().uuid().optional().nullable(),
});

const OutcomeEnum = z.enum([
  'winner','finalist','shortlisted','longlisted',
  'nominated','commended','highly_commended','special_mention',
]);

export const CreateRecipientSchema = z.object({
  editionId:             z.string().uuid(),
  categoryId:            z.string().uuid(),
  recipientType:         z.enum(['building','person','company']),
  recipientBuildingId:   z.string().uuid().optional().nullable(),
  recipientPersonId:     z.string().uuid().optional().nullable(),
  recipientCompanyId:    z.string().uuid().optional().nullable(),
  outcome:               OutcomeEnum.default('winner'),
  notes:                 z.string().max(2000).optional().nullable(),
}).refine(d => {
  const set = [d.recipientBuildingId, d.recipientPersonId, d.recipientCompanyId]
    .filter(Boolean).length;
  return set === 1;
}, { message: 'Exactly one recipient FK must be set' });
```

---

### 1.4 Admin UI

#### Route Registration

Add to `app/routes.ts` inside the admin layout block:

```typescript
route("/admin/awards",                               "features/admin/pages/AwardsList.tsx"),
route("/admin/awards/new",                           "features/admin/pages/AwardForm.tsx"),
route("/admin/awards/:awardId",                      "features/admin/pages/AwardDetail.tsx"),
route("/admin/awards/:awardId/edit",                 "features/admin/pages/AwardForm.tsx"),
route("/admin/awards/:awardId/editions/new",         "features/admin/pages/EditionForm.tsx"),
route("/admin/awards/:awardId/editions/:editionId",  "features/admin/pages/EditionDetail.tsx"),
```

#### Admin Sidebar

Add to the `managementItems` array in `src/features/admin/components/AdminSidebar.tsx`:

```typescript
{ title: "Awards", url: "/admin/awards", icon: Trophy }
// Import: import { Trophy } from 'lucide-react';
```

#### File Map

| File | Purpose |
|------|---------|
| `features/admin/pages/AwardsList.tsx` | Searchable table of all awards. Columns: name, body, frequency, edition count, active toggle, edit action. |
| `features/admin/pages/AwardForm.tsx` | Create/edit form. Fields: name, slug (live preview), description, website, country, frequency, awarding body (company picker or free-text name), isActive. |
| `features/admin/pages/AwardDetail.tsx` | Award overview page. Shows all editions as a list. Each edition links to EditionDetail. Button to add new edition. |
| `features/admin/pages/EditionForm.tsx` | Create/edit edition. Fields: year, edition_date, ceremony_location, notes. Award is pre-set from parent. |
| `features/admin/pages/EditionDetail.tsx` | Edition overview. Shows all recipients grouped by category. Inline "Add recipient" button opens `AddRecipientDialog`. Row delete per recipient. |
| `features/admin/components/AddRecipientDialog.tsx` | Dialog for adding a recipient to an edition. Step 1: select category. Step 2: select outcome. Step 3: pick entity via tabbed search (building / person / company). On confirm: insert `award_recipients` row. |
| `features/admin/components/ManageCategoriesDialog.tsx` | Dialog for managing the categories of an award (list + add/rename/archive). Called from AwardDetail. |
| `features/awards/api/awards.ts` | All Supabase query functions: `getAwards`, `getAwardBySlug`, `getEditionsByAward`, `getCategoriesByAward`, `getRecipientsByEdition`, `getAwardsByBuilding`, `getAwardsByPerson`, `getAwardsByCompany`. |
| `features/awards/hooks/useAwards.ts` | React Query hooks wrapping all API functions. Cache keys: `['awards']`, `['award', slug]`, `['award-recipients', buildingId]`, etc. |

---

## [x] Phase 2 — Display

> Public award pages · Awards sections on entity detail pages

Phase 2 makes award data visible to the public. It adds awards sections to building, person, and company detail pages, and creates dedicated public routes for browsing awards.

**Deliverable:** Users visiting a building, person, or company page see its full award history. Dedicated `/award/:slug` and `/award/:slug/:year` pages exist and are crawlable by search engines.

---

### 2.1 Route Registration

Add to `app/routes.ts` inside the MainLayout block:

```typescript
route("/award/:slug",        "features/awards/pages/AwardPage.tsx"),
route("/award/:slug/:year",  "features/awards/pages/AwardEditionPage.tsx"),
```

---

### 2.2 New Page Components

#### `AwardPage` — `/award/:slug`

File: `src/features/awards/pages/AwardPage.tsx`

Displays the award's identity and its full edition history.

- **Header:** Award name, awarding body (linked to `/company/:slug` if FK exists, else plain text), country, frequency badge, website link.
- **Description:** Award description text.
- **Edition list:** Chronological list of editions (newest first). Each row: year/date, ceremony location, recipient count, `VIEW →` link to `/award/:slug/:year`.
- **SEO:** Export a `meta()` function with title `"Award Name | Plano"`, description, canonical `/award/:slug`, og tags.
- **Data fetch:** `useAward(slug)` + `useEditionsByAward(awardId)` (React Query, 5-min stale).

#### `AwardEditionPage` — `/award/:slug/:year`

File: `src/features/awards/pages/AwardEditionPage.tsx`

Displays all recipients for a specific award ceremony year, grouped by category.

- **Header:** Award name → links back to `/award/:slug`. Edition year/date. Ceremony location.
- **Recipients by category:** For each category, a section heading followed by recipient cards. If only one category exists ("Main Award"), skip the category heading.
- **Breadcrumb:** Home / Awards / [Award Name] / [Year]
- **SEO:** Title `"Award Name 2024 | Plano"`, canonical `/award/:slug/:year`.

#### `AwardRecipientCard`

File: `src/features/awards/components/AwardRecipientCard.tsx`

Compact card used on edition pages and entity detail page award sections. Props: `recipient: AwardRecipientDTO`.

- **Building recipient:** Hero image thumbnail (48×48, `rounded-sm`), building name linked to `/building/:id/:slug`, city/country, year completed.
- **Person recipient:** Avatar (32×32 circle), name linked to `/person/:slug`, nationality.
- **Company recipient:** Company name linked to `/company/:slug`.
- **Outcome badge:** Right-aligned pill badge. `winner` = `surface-card` + black text + `border-brand-primary`. All other outcomes = `surface-muted` + `text-secondary`.

---

### 2.3 Awards Sections on Entity Detail Pages

#### `BuildingDetails.tsx` — Awards Section

File: `src/features/buildings/pages/BuildingDetails.tsx`

Add a new "Awards" section below the "Nearby Buildings" section. Section is hidden when the building has no award recipients.

- **Data fetch:** `useAwardsByBuilding(buildingId)` — returns `AwardRecipientDTO[]` with joined edition (year), category (name), award (name, slug). Sorted by edition year DESC.
- **Section layout:** Section divider label `AWARDS`. Then a list of award rows: `[outcome badge] [award name linked to /award/:slug] · [category name if not "Main Award"] · [year]`
- If more than 5 awards: show 5 + `"Show all N awards →"` text CTA that expands inline.

#### `PersonPage.tsx` — Awards Section

File: `src/features/people/pages/PersonPage.tsx`

- **Data fetch:** `useAwardsByPerson(personId)`.
- Same section structure as on building pages. Label: `AWARDS`. Each row shows outcome badge, award name, category, year.
- For Phase 2, show only person-type recipients (where `recipient_type = 'person'`). Building-level awards attributed via credits is Phase 3 work.

#### `CompanyPage.tsx` — Awards Section

File: `src/features/companies/pages/CompanyPage.tsx`

- **Data fetch:** `useAwardsByCompany(companyId)`.
- Same section structure. If this company is an awarding body (`awarding_body_company_id = companyId`), also show an "Awards given" section listing the awards they administer (see Phase 4 for full implementation).

---

### 2.4 SSR & SEO

- `/award/:slug` — export a `loader` fetching award data server-side. Export `meta()` returning title, description, canonical, og tags.
- `/award/:slug/:year` — same pattern. Meta title: `"[Award] [Year] Winners | Plano"`.
- Add award routes to the Supabase `sitemap` edge function: emit `/award/:slug` for all active awards, `/award/:slug/:year` for all editions.
- Add award routes to the `og-tags` edge function: resolve award + edition data for link preview metadata.

---

## [x] Phase 3 — Discovery

> Map filter · Search filter · Leaderboard · Notifications

Phase 3 makes awards a discovery surface. Users can filter the map and search results to show only award-winning buildings, see a leaderboard ranked by award prestige, and receive notifications when a building they're credited on wins an award.

**Deliverable:** "Show only Stirling Prize winners" is a usable map filter. Award counts appear on building cards. Verified credited parties are notified of new award wins.

---

### 3.1 Database Additions

File: `supabase/migrations/YYYYMMDDHHMMSS_awards_discovery.sql`

#### RPC: `get_buildings_with_awards`

Returns building IDs for use in map/search filtering. Accepts optional filters.

```sql
CREATE OR REPLACE FUNCTION public.get_buildings_with_awards(
  p_award_id    UUID DEFAULT NULL,
  p_outcome     TEXT DEFAULT NULL,   -- e.g. 'winner'
  p_year_from   INT  DEFAULT NULL,
  p_year_to     INT  DEFAULT NULL
)
RETURNS TABLE(building_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT DISTINCT ar.recipient_building_id
  FROM public.award_recipients ar
  JOIN public.award_editions   ae ON ae.id = ar.edition_id
  WHERE ar.recipient_type = 'building'
    AND ar.recipient_building_id IS NOT NULL
    AND (p_award_id   IS NULL OR ae.award_id = p_award_id)
    AND (p_outcome    IS NULL OR ar.outcome  = p_outcome)
    AND (p_year_from  IS NULL OR ae.year    >= p_year_from)
    AND (p_year_to    IS NULL OR ae.year    <= p_year_to);
$$;
```

#### RPC: `get_award_leaderboard`

Returns buildings ranked by a weighted award score. Winners score highest; used by the leaderboard dialog.

```sql
CREATE OR REPLACE FUNCTION public.get_award_leaderboard(
  p_award_id UUID DEFAULT NULL,
  p_limit    INT  DEFAULT 50
)
RETURNS TABLE(
  building_id    UUID,   building_name TEXT,  building_slug TEXT,
  hero_image_url TEXT,   city TEXT,           country TEXT,
  award_score    INT,    win_count INT,        finalist_count INT
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    b.id, b.name, b.slug, b.hero_image_url, b.city, b.country,
    SUM(CASE ar.outcome
      WHEN 'winner'           THEN 10
      WHEN 'highly_commended' THEN  6
      WHEN 'commended'        THEN  5
      WHEN 'special_mention'  THEN  4
      WHEN 'finalist'         THEN  3
      WHEN 'shortlisted'      THEN  2
      WHEN 'longlisted'       THEN  1
      ELSE 0 END
    )::INT AS award_score,
    COUNT(*) FILTER (WHERE ar.outcome = 'winner')::INT   AS win_count,
    COUNT(*) FILTER (WHERE ar.outcome = 'finalist')::INT AS finalist_count
  FROM public.award_recipients ar
  JOIN public.award_editions   ae ON ae.id = ar.edition_id
  JOIN public.buildings         b ON  b.id = ar.recipient_building_id
  WHERE ar.recipient_type = 'building'
    AND (p_award_id IS NULL OR ae.award_id = p_award_id)
  GROUP BY b.id, b.name, b.slug, b.hero_image_url, b.city, b.country
  ORDER BY award_score DESC
  LIMIT p_limit;
$$;
```

---

### 3.2 Map Filter Integration

The existing `get_map_clusters_v2` and `get_buildings_list` RPCs already accept filter parameters. Extend the filter schema and both RPCs to support award filtering.

#### 3.2a Extend `MapFilterSchema`

File: `src/features/map/lib/validations.ts` (or equivalent filter schema)

```typescript
// Add to MapFilterSchema:
awardId:       z.string().uuid().optional(),   // filter to buildings with any recipient row for this award
awardOutcome:  z.enum([                        // filter by minimum outcome tier
  'winner','finalist','shortlisted','longlisted',
  'nominated','commended','highly_commended','special_mention'
]).optional(),
awardYearFrom: z.number().int().optional(),
awardYearTo:   z.number().int().optional(),
```

#### 3.2b Extend `get_map_clusters_v2` and `get_buildings_list`

Add the same four optional params to both RPCs. Inside each function, apply an additional WHERE clause:

```sql
AND (p_award_id IS NULL OR b.id IN (
  SELECT building_id FROM public.get_buildings_with_awards(
    p_award_id, p_award_outcome, p_award_year_from, p_award_year_to
  )
))
```

#### 3.2c Filter Drawer UI

File: `src/features/map/components/FilterDrawer.tsx` (or equivalent)

Add an "Awards" accordion section below the "Quality" section. Contents:

- **Award selector:** Searchable combobox of all active awards, fetched via `useAwards()`. Selecting an award sets `awardId`. Clears when user selects "Any".
- **Outcome selector:** Dropdown "Minimum outcome": Winner only / Finalist or better / Shortlisted or better / Any. Maps to `awardOutcome` filter value.
- **Year range:** Two number inputs: "From year" / "To year". Optional.

---

### 3.3 Award Leaderboard

File: `src/features/awards/components/AwardLeaderboardDialog.tsx`

A dialog accessible from the Awards index page (`/award`) and from the global leaderboard. Shows buildings ranked by award score.

- **Award selector:** Dropdown to filter to a specific award, or show all awards combined.
- **Building rows:** Rank number, building image thumbnail, name (linked), city, country, win count badge, `award_score`.
- **Data fetch:** `supabase.rpc('get_award_leaderboard', { p_award_id, p_limit: 50 })`

Also add an "Awards" tab to the existing leaderboard dialog (`get_building_leaderboards` surface) that switches to this award-ranked view.

---

### 3.4 Notifications — Award Win

Extend the notifications system. Add `'award_win'` to the `type` CHECK constraint on the `notifications` table:

```sql
-- In a new migration file:
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'follow', 'like', 'comment', 'recommendation',
    'friend_joined', 'suggest_follow', 'visit_request',
    'architect_verification',
    'award_win'   -- new
  ));
```

When an admin inserts an `award_recipients` row, the system sends notifications to all users who are verified credited parties on the recipient building. Implementation:

1. **DB trigger (preferred):** Create an AFTER INSERT trigger on `award_recipients`. When `recipient_type = 'building'`, look up all active, non-hidden `building_credits` rows for `recipient_building_id`. For each credit where the credited entity is a person with `claimed_by_user_id`, insert a `notifications` row: `type = 'award_win'`, `user_id = claimed_by_user_id`, `actor_id = inserting user`, `metadata = { award_id, edition_id, building_id, outcome }`.
2. **`metadata` JSON shape:** `{ "award_name": string, "edition_year": number|null, "building_name": string, "building_slug": string, "outcome": string }`
3. **Notification rendering:** In the Notifications page, add a case for `'award_win'`. Display: `"[Building name] won the [Award name] [Year]"`. Link to `/building/:id/:slug`.

---

### 3.5 Building Card Award Badge

Optionally add a subtle "award winner" indicator to building cards in search and map sidebar results. Only show when the building has at least one `'winner'` outcome.

- Add a `winnerAwardName: string | null` field to `BuildingSummaryDTO`, populated by a LEFT JOIN to `award_recipients` in the `search_buildings` RPC. Returns the name of the most recent winner award.
- In `BuildingCard.tsx`: if `winnerAwardName` is set, render a small `Trophy` icon (lucide-react) + award name text in a `text-2xs text-secondary uppercase tracking-wide` label below the city/year line.

---

## [x] Phase 4 — Community

> Suggestion flow · Admin approval · Award body profile linkage

Phase 4 opens award data contribution to the community while keeping admin control over what gets published. It also deepens the integration between awards and the existing entity graph.

**Deliverable:** Any authenticated user can suggest a new award recipient. Admins review and approve or reject suggestions. Companies that are awarding bodies show their administered awards on their profile page.

---

### 4.1 Database Additions

File: `supabase/migrations/YYYYMMDDHHMMSS_awards_community.sql`

#### Table: `award_recipient_suggestions`

```sql
CREATE TABLE public.award_recipient_suggestions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by          UUID NOT NULL REFERENCES public.profiles(id),
  award_id              UUID NOT NULL REFERENCES public.awards(id),
  edition_id            UUID REFERENCES public.award_editions(id),
  category_id           UUID REFERENCES public.award_categories(id),
  recipient_type        TEXT NOT NULL
                        CHECK (recipient_type IN ('building','person','company')),
  recipient_building_id UUID REFERENCES public.buildings(id),
  recipient_person_id   UUID REFERENCES public.people(id),
  recipient_company_id  UUID REFERENCES public.companies(id),
  outcome               TEXT NOT NULL
                        CHECK (outcome IN (
                          'winner','finalist','shortlisted','longlisted',
                          'nominated','commended','highly_commended','special_mention'
                        )),
  year                  INTEGER,   -- suggested year (creates edition if not exists)
  source_url            TEXT,      -- link to verifiable source (required)
  notes                 TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected')),
  reviewed_by           UUID REFERENCES auth.users(id),
  reviewer_note         TEXT,
  reviewed_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT suggestions_single_target CHECK (
    (recipient_building_id IS NOT NULL)::INT +
    (recipient_person_id   IS NOT NULL)::INT +
    (recipient_company_id  IS NOT NULL)::INT = 1
  )
);

CREATE INDEX suggestions_status_idx       ON public.award_recipient_suggestions(status);
CREATE INDEX suggestions_submitted_by_idx ON public.award_recipient_suggestions(submitted_by);
CREATE INDEX suggestions_award_id_idx     ON public.award_recipient_suggestions(award_id);
```

#### RLS: `award_recipient_suggestions`

```sql
ALTER TABLE public.award_recipient_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can see their own submissions; admins can see all.
CREATE POLICY "suggestions_select" ON public.award_recipient_suggestions
  FOR SELECT USING (
    submitted_by = (SELECT auth.uid()) OR public.is_admin()
  );

-- Any authenticated user can submit a suggestion.
CREATE POLICY "suggestions_insert" ON public.award_recipient_suggestions
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND submitted_by = (SELECT auth.uid())
  );

-- Only admins can update (to approve/reject).
CREATE POLICY "suggestions_update" ON public.award_recipient_suggestions
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- No delete policy: suggestions are never deleted, only rejected.
```

#### RPC: `approve_award_suggestion`

Approves a suggestion and atomically creates the necessary `award_editions` and `award_recipients` rows.

```sql
CREATE OR REPLACE FUNCTION public.approve_award_suggestion(p_suggestion_id UUID)
RETURNS UUID  -- returns the created award_recipients.id
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_suggestion  public.award_recipient_suggestions%ROWTYPE;
  v_edition_id  UUID;
  v_category_id UUID;
  v_recipient_id UUID;
BEGIN
  SELECT * INTO v_suggestion
  FROM public.award_recipient_suggestions
  WHERE id = p_suggestion_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found or not pending';
  END IF;

  -- Resolve or create edition
  IF v_suggestion.edition_id IS NOT NULL THEN
    v_edition_id := v_suggestion.edition_id;
  ELSE
    SELECT id INTO v_edition_id FROM public.award_editions
    WHERE award_id = v_suggestion.award_id AND year = v_suggestion.year
    LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.award_editions(award_id, year)
      VALUES (v_suggestion.award_id, v_suggestion.year)
      RETURNING id INTO v_edition_id;
    END IF;
  END IF;

  -- Resolve category (default to first active category for this award)
  IF v_suggestion.category_id IS NOT NULL THEN
    v_category_id := v_suggestion.category_id;
  ELSE
    SELECT id INTO v_category_id FROM public.award_categories
    WHERE award_id = v_suggestion.award_id AND is_active = true
    ORDER BY created_at LIMIT 1;
  END IF;

  -- Insert recipient
  INSERT INTO public.award_recipients(
    edition_id, category_id, recipient_type,
    recipient_building_id, recipient_person_id, recipient_company_id,
    outcome, notes
  ) VALUES (
    v_edition_id, v_category_id, v_suggestion.recipient_type,
    v_suggestion.recipient_building_id,
    v_suggestion.recipient_person_id,
    v_suggestion.recipient_company_id,
    v_suggestion.outcome, v_suggestion.notes
  ) RETURNING id INTO v_recipient_id;

  -- Mark suggestion approved
  UPDATE public.award_recipient_suggestions
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_suggestion_id;

  RETURN v_recipient_id;
END;
$$;
```

---

### 4.2 Community Suggestion UI

#### `SuggestAwardButton`

File: `src/features/awards/components/SuggestAwardButton.tsx`

A `"Suggest an award →"` text CTA rendered at the bottom of the awards section on building, person, and company detail pages. Only visible to authenticated users. Opens `SuggestAwardDialog`.

#### `SuggestAwardDialog`

File: `src/features/awards/components/SuggestAwardDialog.tsx`

Multi-step dialog for submitting an award recipient suggestion.

- **Step 1 — Award & Year:** Searchable award combobox. Year input. If the award has a known edition for that year, show "Existing edition found". If not, note "A new edition will be created for year X".
- **Step 2 — Category & Outcome:** Category dropdown (fetched for the selected award). Outcome dropdown with all 8 values, ordered by prestige. Outcome descriptions shown on hover (e.g. "Winner — the top prize in this category").
- **Step 3 — Recipient:** Pre-filled with the page's entity (building/person/company) if opened from a detail page. Otherwise, tabbed search: building / person / company tabs each with a search input.
- **Step 4 — Source & Notes:** URL input for a verifiable source link (required — e.g. official award announcement, press release). Optional notes textarea.
- **Confirmation:** Show summary of the suggestion. On submit: insert into `award_recipient_suggestions`. Success toast: `"Thank you — your suggestion is under review."`

---

### 4.3 Admin Review Workflow

#### Route Registration

```typescript
route("/admin/awards/suggestions",                      "features/admin/pages/AwardSuggestions.tsx"),
route("/admin/awards/suggestions/:suggestionId",        "features/admin/pages/AwardSuggestionDetail.tsx"),
```

Add a badge count to the "Awards" sidebar link showing pending suggestion count:

```typescript
{ title: "Awards", url: "/admin/awards", icon: Trophy, badge: pendingSuggestionCount }
```

#### `AwardSuggestions.tsx`

Table of all award recipient suggestions. Columns: submitted by, award, year, recipient, outcome, source URL, status, date. Default filter: `status = 'pending'`. Filterable by status. Clicking a row navigates to `AwardSuggestionDetail`.

#### `AwardSuggestionDetail.tsx`

Full detail view of a suggestion. Shows all fields. Two actions:

- **Approve:** Calls `supabase.rpc('approve_award_suggestion', { p_suggestion_id })`. On success: shows the created `award_recipients` row ID and a link to the edition page.
- **Reject:** Opens a small modal with an optional "Reason" textarea. Sets `status = 'rejected'`, `reviewer_note`, `reviewed_by`, `reviewed_at`.

---

### 4.4 Awarding Body Section on Company Pages

File: `src/features/companies/pages/CompanyPage.tsx`

If a company has awards where `awarding_body_company_id = companyId`, show an "Awards Administered" section on their company page.

- **Data fetch:** `useAwardsByBody(companyId)` — `supabase.from('awards').select('*, award_editions(count)').eq('awarding_body_company_id', companyId).eq('is_active', true)`
- **Section layout:** Section divider label `AWARDS ADMINISTERED`. List of award rows: award name (linked to `/award/:slug`), frequency badge, edition count.

---

## RPC Inventory

All new RPCs introduced by the Awards feature. Add these to the RPC table in `docs/DATA_CONTRACT.md`.

| Phase | Function | Purpose |
|-------|----------|---------|
| 3 | `get_buildings_with_awards(award_id, outcome, year_from, year_to)` | Returns building IDs matching award filters. Used by map/search RPCs. |
| 3 | `get_award_leaderboard(award_id, limit)` | Buildings ranked by weighted award score. Used by leaderboard dialog. |
| 4 | `approve_award_suggestion(suggestion_id)` | Atomically approves a community suggestion: creates edition if needed, inserts `award_recipients` row, marks suggestion approved. |

---

## Route Registry

All new routes introduced by the Awards feature. Add these to `app/routes.ts`.

| Phase | Route | File | Type |
|-------|-------|------|------|
| 1 | `/admin/awards` | `features/admin/pages/AwardsList.tsx` | Admin |
| 1 | `/admin/awards/new` | `features/admin/pages/AwardForm.tsx` | Admin |
| 1 | `/admin/awards/:awardId` | `features/admin/pages/AwardDetail.tsx` | Admin |
| 1 | `/admin/awards/:awardId/edit` | `features/admin/pages/AwardForm.tsx` | Admin |
| 1 | `/admin/awards/:awardId/editions/new` | `features/admin/pages/EditionForm.tsx` | Admin |
| 1 | `/admin/awards/:awardId/editions/:editionId` | `features/admin/pages/EditionDetail.tsx` | Admin |
| 2 | `/award/:slug` | `features/awards/pages/AwardPage.tsx` | Public |
| 2 | `/award/:slug/:year` | `features/awards/pages/AwardEditionPage.tsx` | Public |
| 4 | `/admin/awards/suggestions` | `features/admin/pages/AwardSuggestions.tsx` | Admin |
| 4 | `/admin/awards/suggestions/:suggestionId` | `features/admin/pages/AwardSuggestionDetail.tsx` | Admin |

---

## Complete File Map

### `src/features/awards/`

| File | Description |
|------|-------------|
| `types/awards.ts` | `AwardDTO`, `AwardEditionDTO`, `AwardCategoryDTO`, `AwardRecipientDTO`, `AwardOutcome`, `RecipientType`. |
| `lib/validations.ts` | Zod schemas: `CreateAwardSchema`, `CreateEditionSchema`, `CreateCategorySchema`, `CreateRecipientSchema`, `CreateSuggestionSchema`. |
| `api/awards.ts` | All Supabase query functions for the domain. |
| `hooks/useAwards.ts` | React Query hooks wrapping all API functions. |
| `pages/AwardPage.tsx` | Public `/award/:slug` page. |
| `pages/AwardEditionPage.tsx` | Public `/award/:slug/:year` page. |
| `components/AwardRecipientCard.tsx` | Compact recipient card (building/person/company + outcome badge). |
| `components/BuildingAwardsSection.tsx` | Awards section component for use on `BuildingDetails`, `PersonPage`, `CompanyPage`. |
| `components/AwardLeaderboardDialog.tsx` | Dialog showing buildings ranked by award score. |
| `components/SuggestAwardButton.tsx` | Text CTA button to open suggestion dialog. |
| `components/SuggestAwardDialog.tsx` | Multi-step suggestion submission dialog. |

### `src/features/admin/pages/` (new files)

| File | Description |
|------|-------------|
| `AwardsList.tsx` | Searchable table of all awards. |
| `AwardForm.tsx` | Create/edit award form (shared by `/new` and `/edit`). |
| `AwardDetail.tsx` | Award overview with edition list. |
| `EditionForm.tsx` | Create/edit edition form. |
| `EditionDetail.tsx` | Edition overview with recipients by category. |
| `AwardSuggestions.tsx` | Table of community suggestions (Phase 4). |
| `AwardSuggestionDetail.tsx` | Full suggestion detail with approve/reject actions (Phase 4). |

### `src/features/admin/components/` (new files)

| File | Description |
|------|-------------|
| `AddRecipientDialog.tsx` | Dialog for adding a recipient to an edition from admin context. |
| `ManageCategoriesDialog.tsx` | Dialog for managing award categories (add/rename/archive). |

### `supabase/migrations/`

| File | Phase | Contents |
|------|-------|----------|
| `YYYYMMDDHHMMSS_awards_foundation.sql` | 1 | `awards`, `award_editions`, `award_categories`, `award_recipients` tables + RLS + indexes. |
| `YYYYMMDDHHMMSS_awards_discovery.sql` | 3 | `get_buildings_with_awards` RPC, `get_award_leaderboard` RPC, notifications type constraint update, `award_win` notification trigger. |
| `YYYYMMDDHHMMSS_awards_community.sql` | 4 | `award_recipient_suggestions` table + RLS, `approve_award_suggestion` RPC. |

---

## Appendix: Key Design Decisions

### Why four tables and not a flat awards table?

Real-world awards have a natural hierarchy: a prize exists as a concept (`awards`), runs annually (`award_editions`), has sub-divisions (`award_categories`), and recognises specific entities each time (`award_recipients`). Collapsing this into fewer tables would require repeating award metadata on every recipient row, make historical queries harder, and prevent features like "show all editions of the Stirling Prize". The four-table design mirrors how existing taxonomy tables (`functional_categories` → `functional_typologies`) and credit tables (`building_credits`) work in Plano.

### Why are awards admin-only for writes in Phases 1–3?

Award data is factual and verifiable — a building either won the Stirling Prize or it did not. Allowing community writes without a review step would introduce noise and potential misinformation. The Phase 4 suggestion flow adds community participation while keeping admin approval as the gate, exactly the same model as architect claims and building credits.

### Why require a source URL in suggestions?

This is the single most important guard against incorrect community submissions. Every major award maintains a public record of winners (official website, press release, ArchDaily announcement). Requiring a verifiable source makes admin review fast (one click to verify) and deters unsourced submissions.

### Why a weighted award score in `get_award_leaderboard` and not the existing `popularity_score`?

`popularity_score` is driven by user engagement (visits, ratings). Award score is a distinct editorial quality signal — a building can have a very high `popularity_score` but no awards, and vice versa. Keeping them separate lets you offer two different leaderboard perspectives, which is genuinely interesting to architecture enthusiasts.

### Awarding body: FK to `companies` vs. free text?

Both are supported. `awarding_body_company_id` is a nullable FK to `companies` — use it when the awarding body (e.g. RIBA, AIA) has a `companies` row. `awarding_body_name` is free text — use it for bodies that are not and may never be catalogued entities (e.g. a regional prize awarded by a municipality). Admins can upgrade a free-text body to a FK later by creating the `companies` row and updating the award record.

---

*End of document. Last updated May 2026.*