# Ambassador Program — Implementation Roadmap

## Overview

Plano is an architecture platform (React Router v7 + Supabase + TypeScript) where users can discover, rate, and contribute data about buildings and architecture firms worldwide. This roadmap describes the implementation of an **Ambassador Program**: a structured volunteer network that helps grow and maintain the platform's data quality, organised by geography.

This document is fully self-contained. An agent implementing any phase should read this document in full before starting, then read the relevant codebase files for the phase being implemented.

---

## Concept

### What is an Ambassador?

Ambassadors are regular platform users who have been accepted into the program. They retain their normal user account and access, but gain access to a private portal (`/embassy`) that surfaces actionable tasks specific to their city or country: buildings missing photos, incomplete metadata, unclaimed architecture firms, etc.

Ambassadors are **volunteers**. Their role is to help Plano grow its data coverage and quality in a specific geographic area.

### What is a Chapter?

A **Chapter** is the geographic unit of the ambassador program. There are two types:

- **Local chapter** — associated with a specific city (`localities` table)
- **National chapter** — associated with a country (`country_code`)

Local chapters belong to a national chapter via `parent_chapter_id`. A country can have one national chapter and multiple local chapters.

### Roles within a Chapter

Each user has exactly one chapter membership (one chapter per user, enforced at DB level). Within that chapter they have one of three roles:

| Role | Description |
|---|---|
| `ambassador` | Volunteer contributor. Sees the task feed for their chapter's geographic area. |
| `exco` | Executive Committee member. Has a specific area of responsibility. Sees everything an ambassador sees plus chapter metrics and ambassador activity. Can approve/reject membership applications. |
| `president` | Chapter leader. Sees everything ExCo sees plus member management tools. Can invite users directly, propose role changes. |

The **national chapter president** additionally has read-only visibility over all local chapters in their country (metrics, member lists).

### ExCo Responsibilities

When a user has `role = 'exco'`, they also have an `exco_responsibility` field:

- `content` — editorial quality, building descriptions
- `marketing` — outreach, social media, events
- `architect_relations` — contacting firms, handling profile claims
- `data_quality` — metadata completeness, photo quality, verifications
- `community` — onboarding new ambassadors, community health

### Access Control Summary

| Feature | Ambassador | ExCo | President (Local) | President (National) | Admin |
|---|:---:|:---:|:---:|:---:|:---:|
| View `/embassy` task feed | ✓ | ✓ | ✓ | ✓ | ✓ |
| Own contribution history | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chapter metrics dashboard | — | ✓ | ✓ | ✓ | ✓ |
| Ambassador activity feed | — | ✓ | ✓ | ✓ | ✓ |
| Member list | — | ✓ | ✓ | ✓ | ✓ |
| Approve/reject applications | — | ✓ | ✓ | ✓ | ✓ |
| Invite members directly | — | — | ✓ | ✓ | ✓ |
| Manage member roles | — | — | ✓ | ✓ | ✓ |
| View all local chapters in country | — | — | — | ✓ | ✓ |
| Full chapter management (CRUD) | — | — | — | — | ✓ |

---

## Data Model

### Tables to Create

#### `ambassador_chapters`

```sql
CREATE TABLE public.ambassador_chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,                        -- e.g. "Madrid", "Spain"
  type            TEXT NOT NULL CHECK (type IN ('local', 'national')),
  locality_id     UUID REFERENCES public.localities(id),  -- only if type = 'local'
  country_code    TEXT NOT NULL,                        -- always present (ISO 3166-1 alpha-2, uppercase)
  parent_chapter_id UUID REFERENCES public.ambassador_chapters(id), -- local → national
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'forming')),
  max_ambassadors INTEGER NOT NULL DEFAULT 20,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE public.ambassador_chapters
  ADD CONSTRAINT local_chapter_requires_locality
    CHECK (type = 'national' OR locality_id IS NOT NULL);

ALTER TABLE public.ambassador_chapters
  ADD CONSTRAINT national_chapter_no_parent
    CHECK (type = 'local' OR parent_chapter_id IS NULL);
```

#### `ambassador_memberships`

```sql
CREATE TABLE public.ambassador_memberships (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id           UUID NOT NULL REFERENCES public.ambassador_chapters(id),
  user_id              UUID NOT NULL REFERENCES public.profiles(id),
  role                 TEXT NOT NULL CHECK (role IN ('president', 'exco', 'ambassador')),
  exco_responsibility  TEXT CHECK (exco_responsibility IN (
                         'content', 'marketing', 'architect_relations', 'data_quality', 'community'
                       )),                              -- only set when role = 'exco'
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
                         'active', 'inactive', 'pending_review'
                       )),
  joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by           UUID REFERENCES public.profiles(id),  -- who invited or approved this user
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_chapter_per_user UNIQUE (user_id),   -- enforces single chapter per user
  CONSTRAINT exco_requires_responsibility
    CHECK (role != 'exco' OR exco_responsibility IS NOT NULL)
);
```

#### `ambassador_applications`

```sql
CREATE TABLE public.ambassador_applications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id),
  chapter_id       UUID NOT NULL REFERENCES public.ambassador_chapters(id),
  motivation_text  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                     'pending', 'approved', 'rejected'
                   )),
  reviewed_by      UUID REFERENCES public.profiles(id),  -- president or ExCo who acted
  reviewer_note    TEXT,
  reviewed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT one_pending_application_per_user
    UNIQUE (user_id, status) WHERE (status = 'pending')  -- one pending at a time
);
```

### Helper Functions (SECURITY DEFINER)

Follow the same pattern as the existing `is_admin()` function in `supabase/migrations/20260424000000_add_admin_role.sql`.

```sql
-- Returns the user's active membership row, or NULL
CREATE OR REPLACE FUNCTION public.get_user_ambassador_membership()
RETURNS ambassador_memberships
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT * FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
    LIMIT 1
  );
END;
$$;

-- Returns true if the current user is an active ambassador (any role) in any chapter
CREATE OR REPLACE FUNCTION public.is_ambassador()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  );
END;
$$;

-- Returns true if the current user is president or ExCo of the given chapter
CREATE OR REPLACE FUNCTION public.is_chapter_leader(p_chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role IN ('president', 'exco')
      AND status = 'active'
  );
END;
$$;

-- Returns true if the current user is president of the given chapter
CREATE OR REPLACE FUNCTION public.is_chapter_president(p_chapter_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ambassador_memberships
    WHERE user_id = auth.uid()
      AND chapter_id = p_chapter_id
      AND role = 'president'
      AND status = 'active'
  );
END;
$$;
```

### RLS Policies

**`ambassador_chapters`:**
- SELECT: all authenticated users (chapters are not secret)
- INSERT / UPDATE / DELETE: admins only (`public.is_admin()`)

**`ambassador_memberships`:**
- SELECT: own row always; chapter leaders can select all memberships for their chapter; national presidents can select memberships for all local chapters under their national chapter; admins can select all
- INSERT: admins only (memberships are created by admin or via the application approval flow, not directly by users)
- UPDATE: chapter leaders can update memberships within their chapter (for status changes); admins can update all
- DELETE: admins only

**`ambassador_applications`:**
- SELECT: own applications always; chapter leaders (president or ExCo) can select applications for their chapter; admins can select all
- INSERT: any authenticated user (public application)
- UPDATE: chapter leaders of the target chapter can update `status`, `reviewed_by`, `reviewer_note`, `reviewed_at`; admins can update all
- DELETE: admins only

---

## Codebase Reference

Understanding these patterns is essential before writing any code.

### Framework & Structure
- **React Router v7** (not Next.js). Routes are defined in `app/routes.ts`.
- Feature-based folder structure: `src/features/<feature-name>/`
- UI: Radix UI components + Tailwind CSS. Icon library: `lucide-react`.
- Data fetching: Supabase JS client + TanStack React Query for client-side caching.

### Adding a New Admin Section
1. Create page component: `src/features/admin/pages/MyPage.tsx`
2. Add route in `app/routes.ts` inside the `layout("features/admin/components/AdminLayout.tsx", [...])` block:
   ```ts
   route("/admin/mypage", "features/admin/pages/MyPage.tsx"),
   ```
3. Add sidebar link in `src/features/admin/components/AdminSidebar.tsx` to the `managementItems` array.

### Adding a New Protected User-Facing Route
The `MainLayout` wraps user-facing routes. For the `/embassy` route, it needs its own access guard (not `AdminGuard`). Create an `AmbassadorGuard` component that checks `is_ambassador()` and redirects to `/become-ambassador` if not active.

### Profile Badges
Existing pattern in `src/features/profile/pages/Profile.tsx` (around lines 808–810):
```tsx
{verifiedArchitectId && (
  <BadgeCheck className="w-3.5 h-3.5 text-text-primary shrink-0" />
)}
```
Add an ambassador badge following the same pattern, using the `Shield` or `Star` icon from lucide-react. Display text: `Ambassador · [city]` or `President · [country]`.

### Notifications
Existing notification types are in `src/features/notifications/pages/Notifications.tsx`. New notification types to add: `ambassador_application_received` (to president/ExCo), `ambassador_application_approved`, `ambassador_application_rejected` (to applicant).

### Existing Relevant Queries
- Buildings by locality: `supabase.from("buildings").select(...).eq("locality_id", localityId).eq("is_deleted", false)`
- Buildings by country: `supabase.from("buildings").select(...).eq("country", countryName).eq("is_deleted", false)` — note: `country` is a string field (country name, not code), `country_code` may need to be derived from the `localities` table join
- Buildings without photos: existing admin RPC `get_zero_photo_buildings(p_limit)` in `src/features/admin/api/admin.ts` — the ambassador version should filter by `locality_id` or `country_code`
- Audit log: `building_audit_logs` table with `user_id`, `table_name`, `operation`, `new_data`, `created_at`

### Migration File Naming
Follow the existing pattern: `supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql`. Each phase that touches the DB gets its own migration file.

---

## Roadmap: Vertical phases

Each phase delivers end-to-end value (DB → backend → UI) and can be shipped independently before starting the next.

---

### [x] Phase 1 — Foundation: Chapters + Admin Management

**Goal:** Admins can create chapters, assign founding members manually, and those members see a badge on their public profile.

#### DB Migration (`..._ambassador_foundation.sql`)
- Create `ambassador_chapters`, `ambassador_memberships` tables with all constraints
- Create helper functions: `get_user_ambassador_membership()`, `is_ambassador()`, `is_chapter_leader()`, `is_chapter_president()`
- Apply RLS policies for both tables (as described above)

#### Admin: Chapter List (`/admin/ambassadors`)
New page `src/features/admin/pages/AmbassadorChapters.tsx`:
- Table of all chapters: name, type, country, status, member count vs max, actions
- "New chapter" button → inline form or modal: name, type (local/national), country_code, locality (if local, searchable dropdown from `localities` table), parent chapter (if local, dropdown of national chapters for that country), max_ambassadors, status
- Edit and activate/deactivate actions per row

#### Admin: Chapter Detail (`/admin/ambassadors/:chapterId`)
New page `src/features/admin/pages/AmbassadorChapterDetail.tsx`:
- Chapter info (editable)
- Member list: username, role, exco_responsibility, status, joined_at, invited_by — with edit and remove actions
- "Add member" form: user search by username/email, role selector, exco_responsibility (if exco)
- "Pending applications" section (preview, links to full applications view)

#### Admin Sidebar
Add to `managementItems` in `src/features/admin/components/AdminSidebar.tsx`:
```ts
{ title: "Ambassadors", url: "/admin/ambassadors", icon: Shield }
```

#### Admin Route Registration
Add to `app/routes.ts` inside the admin layout block:
```ts
route("/admin/ambassadors", "features/admin/pages/AmbassadorChapters.tsx"),
route("/admin/ambassadors/:chapterId", "features/admin/pages/AmbassadorChapterDetail.tsx"),
```

#### Profile Badge
In `src/features/profile/pages/Profile.tsx`, after the verified architect badge:
- Query the user's active membership on profile load (add to existing profile data fetch or as a separate lightweight query)
- If membership exists and is active, display badge: `Shield` icon + `Ambassador · [chapter name]` (or `President · [chapter name]`, `ExCo · [chapter name]`)
- Badge is shown on both own profile and other users' profiles

**Deliverable:** Admins can bootstrap the entire chapter structure and assign founding members. Their public profiles show the ambassador badge.

---

### [x] Phase 2 — Application Flow (Public Form + Approval Workflow)

**Goal:** Anyone can apply to join a chapter. Presidents and ExCo can approve or reject from the Embassy portal. The full recruitment loop is live end-to-end.

#### DB Migration (`..._ambassador_applications.sql`)
- Create `ambassador_applications` table with all constraints
- Apply RLS policies
- Add new notification types to the notifications system

#### Public Application Page (`/become-ambassador`)
New page `src/features/ambassadors/pages/BecomeAmbassador.tsx`:
- Publicly accessible (no login required to view)
- Explain the ambassador program: what it is, what ambassadors do, what the commitment looks like
- If user is not logged in: show CTA to register or log in before applying
- If user already has an active membership: show their current role and chapter; no form
- If user has a pending application: show status message
- Application form (shown to authenticated users with no membership/pending application):
  - Chapter selector: default to the chapter matching the user's `country` or `location` profile fields; allow changing
  - Show chapter info (city/country, current member count vs max, status)
  - Textarea: "Why do you want to be an ambassador?" (required, min 100 chars)
  - Submit button → creates `ambassador_applications` row with `status = 'pending'`
  - On submit: send notification to all `president` and `exco` members of the target chapter

#### Embassy Portal — Stub + Application Review (`/embassy`)
This is the first appearance of the Embassy portal. Create:
- `src/features/embassy/pages/Embassy.tsx` — the main portal page (will be expanded in phases 3 and 4)
- `src/features/embassy/components/AmbassadorGuard.tsx` — checks `is_ambassador()`; if not, redirects to `/become-ambassador` with a message

Register route in `app/routes.ts` inside the MainLayout block:
```ts
route("/embassy", "features/embassy/pages/Embassy.tsx"),
```

For this phase, the Embassy page shows (for all roles):
- Welcome message with the user's role and chapter name
- **Applications tab** (visible only to ExCo and presidents): list of pending applications for their chapter
  - Each application: applicant username, avatar, motivation text, date applied
  - Approve button → sets `status = 'approved'`, creates `ambassador_memberships` row, records `reviewed_by = auth.uid()`, sends notification to applicant
  - Reject button → opens small modal for optional reviewer note → sets `status = 'rejected'`, records `reviewed_by`, sends notification to applicant

#### Admin: Global Applications View (`/admin/ambassadors/applications`)
New page `src/features/admin/pages/AmbassadorApplications.tsx`:
- All applications across all chapters, filterable by status and chapter
- Admins can approve/reject any application
- Add route to `app/routes.ts` and link from the Ambassador admin section

**Deliverable:** The full recruitment pipeline is operational. Users apply publicly, chapter leaders process applications from the Embassy, admins have full oversight.

---

### [x] Phase 3 — Embassy Portal: Task Feed (Core Value)

**Goal:** Every ambassador opens `/embassy` and immediately knows where they can have the most impact in their city or country.

#### New RPC Functions

Create these as Postgres functions (SECURITY DEFINER, callable from the client via `supabase.rpc()`). All accept a `p_chapter_id UUID` parameter and resolve the geographic scope (locality_id or country_code) internally.

```sql
-- Buildings in the chapter's area with no photos (ordered by popularity_score DESC)
get_ambassador_buildings_without_photos(p_chapter_id UUID, p_limit INT DEFAULT 20)
-- Returns: id, short_id, slug, name, city, country, popularity_score, hero_image_url

-- Buildings with incomplete metadata (ordered by popularity_score DESC)
-- "Incomplete" means: year_completed IS NULL OR no entries in building_styles OR no primary architect credit
get_ambassador_buildings_missing_metadata(p_chapter_id UUID, p_limit INT DEFAULT 20)
-- Returns: id, short_id, slug, name, city, country, popularity_score,
--          year_completed, has_styles (bool), has_architect_credit (bool)

-- Architecture firms (companies) in the chapter's area that are unclaimed,
-- ordered by number of buildings with high popularity
get_ambassador_unclaimed_firms(p_chapter_id UUID, p_limit INT DEFAULT 20)
-- Returns: id, slug, name, country, building_count, claim_status

-- Recently added buildings in the chapter's area (last 30 days, ordered by created_at DESC)
get_ambassador_recent_buildings(p_chapter_id UUID, p_limit INT DEFAULT 20)
-- Returns: id, short_id, slug, name, city, country, created_at, hero_image_url
```

Also add a migration if `building_styles` or `building_credits` join queries need helper views.

#### Embassy — Task Feed UI

Expand `src/features/embassy/pages/Embassy.tsx` with a task feed section (shown to all ambassador roles):

**Section: "Buildings without photos"**
- Card list showing building name, city, popularity score, a CTA button "Add photos" linking to the building's edit page
- Sorted by popularity (highest traffic = highest impact)

**Section: "Incomplete building data"**
- Card list showing building name + which specific fields are missing (year, style, architect)
- CTA "Complete data" linking to building edit page
- Each missing field shown as a small tag: `Missing: year` `Missing: style` `Missing: architect`

**Section: "Unclaimed architecture firms"**
- Firm name, country, number of buildings in the platform, current `claim_status`
- CTA "View firm" linking to the firm's profile page
- Context: these are firms with significant presence but no account on Plano

**Section: "Recently added buildings"**
- Compact list of buildings added in the last 30 days in the chapter's area
- Subtext: "Be the first to add photos or complete the data"

**Section: "Your contributions"**
- Timeline of the current user's recent actions from `building_audit_logs` (filtered by `user_id = auth.uid()`)
- Shows: action type (photo added, metadata edited, etc.), building name, date
- Limited to last 20 entries

All sections use loading skeletons while data is fetching (React Query).

**Deliverable:** The core reason to use the portal exists. Ambassadors open `/embassy` and get an actionable list of where they can help most.

---

### [x] Phase 4 — Embassy Portal: Leadership Layer (ExCo + President)

**Goal:** Chapter leaders can monitor chapter health, see ambassador activity, and manage memberships — all from the Embassy portal without needing admin access.

#### New RPC Functions

```sql
-- Chapter-level metrics for a time window
get_chapter_metrics(p_chapter_id UUID, p_days INT DEFAULT 30)
-- Returns: total_edits, total_photos_added, total_building_visits,
--          period_start, period_end
-- Sources: building_audit_logs for edits/photos; buildings.popularity_score delta for visits

-- Per-ambassador activity breakdown
get_chapter_ambassador_activity(p_chapter_id UUID, p_days INT DEFAULT 30)
-- Returns one row per active member:
--   user_id, username, avatar_url, role, edits_count, photos_added, last_active_at
-- Sources: building_audit_logs filtered to buildings in the chapter's area
```

#### Embassy — Leadership Sections (visible only to ExCo and presidents)

**Chapter Metrics Panel:**
- Summary cards: total edits (last 30d), photos added (last 30d), building visits (last 30d)
- Toggle between 7-day and 30-day windows
- Simple trend indicator (up/down vs previous period)

**Ambassador Activity Feed:**
- Table or card list: member name, role, edits count, photos count, last active
- Sorted by last_active_at DESC
- Members who haven't contributed in 30 days shown with a subtle indicator

**Member List (visible to ExCo and presidents):**
- Full list of chapter members with: username, avatar, role, exco_responsibility (if set), status, joined_at
- ExCo and presidents can see contact info (email) of members

**Member Management (visible to presidents only):**
- "Invite user" button: search by username or email → select role → send invitation (creates a `pending` membership with `status = 'pending_review'` or a direct active one, TBD with product)
- Edit role button on each member row: change role or exco_responsibility (president only)
- Deactivate button: sets membership `status = 'inactive'`
- All changes record `updated_at`; role changes also record who made the change (add `updated_by` column to `ambassador_memberships` if not present)

**Application Review (accessible to ExCo and presidents from Embassy):**
- Move the applications tab built in phase 2 into a proper "Applications" sub-section in the Embassy navigation
- Show count badge on the nav item when there are pending applications

**Deliverable:** Chapter leaders have all the tools they need to run their chapter without admin involvement in day-to-day operations.

---

### [x] Phase 5 — National Chapter Hierarchy + Admin Coverage Stats

**Goal:** National presidents can see the health of all local chapters in their country. Admins can see which cities have activity but no chapter yet.

#### National President View in Embassy

Detect if the current user is the president of a **national** chapter (i.e., `chapter.type = 'national'`). If so, show an additional "National Overview" section:

**Local Chapter Cards:**
- One card per active local chapter in the country
- Each card: chapter name (city), president name, member count, key metrics (edits last 30d, photos last 30d)
- Click → expanded view (read-only) of that local chapter's metrics and member list
- The national president cannot manage local chapter memberships directly — they can only view

**New RPC:**
```sql
get_national_chapter_overview(p_national_chapter_id UUID)
-- Returns one row per local chapter (linked via parent_chapter_id):
--   chapter_id, chapter_name, locality_id, member_count, president_name,
--   edits_last_30d, photos_last_30d, last_activity_at
```

#### Admin: Coverage Statistics (`/admin/ambassadors/coverage`)

New page `src/features/admin/pages/AmbassadorCoverage.tsx`:

**Chapter coverage map/table:**
- List of all localities (from `localities` table, ordered by `buildings_count` DESC)
- For each locality: building count, chapter exists (yes/no), chapter status if exists, member count
- Highlight localities with many buildings but no chapter → opportunities for expansion

**Global stats panel:**
- Total active ambassadors worldwide
- Breakdown by country
- Pending applications count
- Chapters by status (active / forming / inactive)

Add route: `route("/admin/ambassadors/coverage", "features/admin/pages/AmbassadorCoverage.tsx")`
Add sidebar sub-link or tab within the Ambassadors section.

**Deliverable:** National coordination is possible. Admins can strategically decide where to open new chapters based on activity data.

---

### [x] Phase 6 — Profile Location Change Trigger + Polish

**Goal:** Data integrity is maintained automatically when ambassadors move. The end-to-end experience is complete and polished.

#### Location Change → Membership Review Trigger

When a user updates their `country` or `location` field in their profile (`src/features/profile/` profile edit flow):

1. After save, check if the user has an active `ambassador_memberships` row
2. If yes, and the new location does not match the chapter's `country_code` (or `locality_id`):
   - Set `ambassador_memberships.status = 'pending_review'`
   - Send a notification to all presidents and ExCo of the chapter: "Ambassador [username] has updated their location. Please review their membership."
   - The user sees a banner in `/embassy`: "Your membership is under review following a location change. The chapter leadership has been notified."
3. The chapter president or ExCo can then reactivate or deactivate the membership from the member management UI (built in phase 4)
4. Admins also see flagged memberships in `/admin/ambassadors/:chapterId`

This logic can be implemented as a Supabase database trigger or in the profile update API function — prefer the application layer (profile update function) for easier debugging and testability.

#### Polish Items

**`/become-ambassador` page:**
- If the user's `country` or `location` profile fields are not set, prompt them to complete their profile first for a better chapter suggestion
- Add basic meta tags for SEO (the page is public and indexable)

**`/embassy` error and empty states:**
- If a user somehow lands on `/embassy` without an active membership: clear message explaining why, CTA to `/become-ambassador`
- Each task feed section has an empty state when there are no items (e.g., "No buildings without photos in your area — great work!")

**Notification cleanup:**
- Ensure all ambassador-related notifications (`ambassador_application_received`, `ambassador_application_approved`, `ambassador_application_rejected`, `ambassador_membership_review`) are properly rendered in the existing Notifications page (`src/features/notifications/pages/Notifications.tsx`)
- Add their types to the notification type union and add appropriate display copy and icons

**Deliverable:** The system self-corrects when ambassador data changes, and the full user experience — from discovery to contribution — is complete and polished.

---

## Implementation Order & Dependencies

```
phase 1 (Foundation: DB + Admin)
  └── phase 2 (Application flow + Embassy stub)
        └── phase 3 (Embassy task feed — core value)
              └── phase 4 (Leadership layer)
                    └── phase 5 (National hierarchy + coverage stats)
                          └── phase 6 (Location trigger + polish)
```

Each phase depends on the previous. Do not start a phase until the previous one is complete and working.

phases 5 and 6 can be partially developed in parallel with phase 4, but both require phase 3 to be complete first.

---

## Key Design Decisions (do not change without discussion)

- **One chapter per user.** Enforced via `UNIQUE (user_id)` on `ambassador_memberships`. A user's chapter reflects where they live.
- **Applications are public.** The `/become-ambassador` page is accessible without login, but submitting requires an account.
- **ExCo can also approve applications.** Not just presidents. The `reviewed_by` field records who approved/rejected every application — this must always be populated on approval or rejection.
- **National chapter president has read-only visibility over local chapters.** They cannot manage local chapter memberships. Only local chapter presidents and admins can do that.
- **Ambassador memberships are separate from the existing `role` field on `profiles`.** The `profiles.role` field (`user`, `admin`, `app_admin`) is not changed. Ambassador status lives entirely in the `ambassador_memberships` table.
- **Chapters are configured with `max_ambassadors`.** This is the maximum number of `ambassador`-role members (does not count ExCo or president toward the limit — clarify this in the UI).
- **Location change flags membership for review.** It does not automatically deactivate the membership. A human (president, ExCo, or admin) must confirm or deactivate.
