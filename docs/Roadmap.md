# Plano — Events Feature Implementation Roadmap

**Feature:** Community Events  
**Prepared:** April 2026  
**Stack:** React 18 SPA · Supabase (Postgres/PostGIS) · TanStack Query · shadcn/ui · Tailwind CSS  
**Conventions:** Vertical slice methodology per `.cursor/rules/05-vertical-slice.mdc` — every task is end-to-end (DB → hooks → UI). Migration files only; never apply schema changes via the Supabase Dashboard.

---

## Conceptual model (read before starting)

Every event is a single row in `events`. The **submitter** (`submitted_by_user_id`) is whoever added it to Plano. The **organiser** identity is separate and optional — resolved through a claim flow or set at submission time when the poster is the host.

| Scenario | `is_self_hosted` | `claim_status` | Organiser columns |
|---|---|---|---|
| Community share | `false` | `unclaimed` | all null |
| User hosts own event | `true` | `claimed` | `organiser_user_id` = submitter |
| Org claims a shared event | `false` → `false` | `unclaimed` → `claimed` | `organiser_person_id` or `organiser_company_id` |

`event_buildings` is a zero-to-many optional junction. An event does not need to be tied to any catalogued building — it can stand alone with an address and PostGIS point.

---

## Phase 1 — Core Events: Submit & View

### [x] Task 1.0 — Tech-debt & stability check

- Read `.ai-status.md` `KNOWN_ISSUES` section.
- Run `tsc --noEmit`; note any pre-existing errors but do not fix them unless they are in files this phase will touch.
- Confirm `npm run gen-types` has been run recently and `src/integrations/supabase/types.ts` is up to date with the live schema.
- Log any blocking issues as new entries in `KNOWN_ISSUES`; non-blocking issues are noted only.
- No code changes in this task.

**Verify:** A clean pass (or a documented list of pre-existing errors) is recorded in `.ai-status.md` before Task 1.1 begins.

---

### [x] Task 1.1 — Migration: `events`, `event_buildings`, enums, indexes, RLS

Create `supabase/migrations/<timestamp>_add_events.sql` containing:

- Define two enums:
  - `event_claim_status` — values `unclaimed`, `pending`, `claimed`
  - `event_attendance_status` — values `interested`, `going` *(needed in Phase 2 but defining enums early avoids a second migration touching the same enum namespace)*
- Create `events` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `title text NOT NULL`
  - `description text`
  - `slug text UNIQUE NOT NULL`
  - `start_at timestamptz NOT NULL`
  - `end_at timestamptz`
  - `address text`
  - `location geography(Point, 4326)` — PostGIS point, nullable (event may not have a precise coordinate yet)
  - `external_link text` — ticket/registration URL
  - `cover_image_url text`
  - `is_self_hosted boolean NOT NULL DEFAULT false`
  - `claim_status event_claim_status NOT NULL DEFAULT 'unclaimed'`
  - `submitted_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL`
  - `organiser_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL`
  - `organiser_person_id uuid REFERENCES people(id) ON DELETE SET NULL`
  - `organiser_company_id uuid REFERENCES companies(id) ON DELETE SET NULL`
  - `is_deleted boolean NOT NULL DEFAULT false`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `updated_at timestamptz NOT NULL DEFAULT now()`
  - Add a `CHECK` constraint: at most one of `organiser_user_id`, `organiser_person_id`, `organiser_company_id` is non-null.
- Create `event_buildings` junction table:
  - `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`
  - `building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE`
  - `sort_order int NOT NULL DEFAULT 0`
  - `PRIMARY KEY (event_id, building_id)`
- Add indexes:
  - `idx_events_submitted_by` on `events(submitted_by_user_id)`
  - `idx_events_organiser_user` on `events(organiser_user_id)` WHERE `organiser_user_id IS NOT NULL`
  - `idx_events_organiser_person` on `events(organiser_person_id)` WHERE `organiser_person_id IS NOT NULL`
  - `idx_events_organiser_company` on `events(organiser_company_id)` WHERE `organiser_company_id IS NOT NULL`
  - `idx_events_claim_status` on `events(claim_status)`
  - `idx_events_start_at` on `events(start_at)`
  - `idx_events_location` using GIST on `events(location)` WHERE `location IS NOT NULL`
  - `idx_event_buildings_building_id` on `event_buildings(building_id)`
- Enable RLS on both tables (`ALTER TABLE events ENABLE ROW LEVEL SECURITY` etc.).
- Write RLS policies for `events` using `(SELECT auth.uid())` form throughout:
  - SELECT: any authenticated or anonymous user may read events where `is_deleted = false`
  - INSERT: any authenticated user may insert a row where `submitted_by_user_id = (SELECT auth.uid())`; include both `USING` and `WITH CHECK` clauses
  - UPDATE: `submitted_by_user_id = (SELECT auth.uid())` OR caller has admin role (check `profiles.role IN ('admin','app_admin')` via sub-select)
  - DELETE: admin only (soft delete is the app-level convention; hard delete is admin only)
- Write RLS policies for `event_buildings`:
  - SELECT: always readable (no deleted check needed here — joins to `events` will filter)
  - INSERT/DELETE: authenticated user whose `submitted_by_user_id` matches the parent event, OR admin

**Verify:** Migration file is syntactically valid SQL. Tables appear in `\dt` output after manual application in the Supabase SQL Editor. `SELECT * FROM events LIMIT 1` returns an empty result set without a permission error for an authenticated test user.

---

### [x] Task 1.2 — TypeScript types, DTOs, and query-key constants

*Depends on Task 1.1 (migration must be applied before running `gen-types`).*

- Run `npm run gen-types` to regenerate `src/integrations/supabase/types.ts`.
- Create `src/features/events/types.ts`:
  - `EventClaimStatus` — `'unclaimed' | 'pending' | 'claimed'`
  - `EventOrganiserKind` — `'user' | 'person' | 'company' | null`
  - `EventBuilding` — `{ buildingId: string; name: string; slug: string | null; city: string | null; mainImageUrl: string | null; sortOrder: number }`
  - `EventOrganiser` — `{ kind: EventOrganiserKind; userId?: string; personId?: string; companyId?: string; displayName: string | null; avatarUrl: string | null; slug: string | null; isVerified: boolean }`
  - `EventDTO` — the full view-model consumed by pages and cards:
    ```
    id, title, description, slug, startAt, endAt,
    address, lat, lng, externalLink, coverImageUrl,
    isSelfHosted, claimStatus,
    submittedBy: { userId, username, avatarUrl },
    organiser: EventOrganiser | null,
    buildings: EventBuilding[],
    isDeleted, createdAt, updatedAt
    ```
  - `EventCardDTO` — a slimmer shape used in listing cards (omits `buildings` array, description truncated to 160 chars)
  - Add inline mapping comments for every computed or renamed field (e.g. `startAt: string; // start_at`)
- Create `src/features/events/queryKeys.ts` exporting a `eventKeys` object following the same pattern as other feature query-key files in the codebase.
- Create `src/features/events/api/eventsApi.ts` with the following functions (all using the `supabase` client from `src/integrations/supabase/client.ts`):
  - `getUpcomingEvents(page: number): Promise<EventCardDTO[]>` — queries `events` where `start_at >= now()` and `is_deleted = false`, ordered by `start_at ASC`, 20 rows per page
  - `getEventBySlug(slug: string): Promise<EventDTO>` — fetches single event with joined `event_buildings` (including building name, slug, city, main image), submitter profile, and organiser identity (one of `profiles`, `people`, or `companies` depending on which FK is set)
  - `getEventsByBuilding(buildingId: string): Promise<EventCardDTO[]>` — for the building detail page sidebar; filters via `event_buildings` join
- All functions must throw a typed error object (`{ code: string; message: string }`) on failure — never expose raw Supabase errors.

**Verify:** `tsc --noEmit` passes with the new types file. Import `EventDTO` from a scratch test file, confirm no type errors. `getUpcomingEvents(0)` returns an empty array (not an error) when called against the live Supabase with no seeded data.

---

### [x] Task 1.3 — Event submission form page

*Depends on Task 1.2.*

Create `src/features/events/pages/SubmitEvent.tsx` and a sibling `src/features/events/hooks/useSubmitEvent.ts`.

- `useSubmitEvent` — a TanStack Query `useMutation` that:
  - Accepts a Zod-validated payload (define `SubmitEventSchema` in `src/features/events/schemas.ts`): `title` (required, 2–120 chars), `description` (optional), `startAt` (required ISO string), `endAt` (optional, must be after `startAt` if present), `address` (optional), `lat`/`lng` (optional floats), `externalLink` (optional URL), `coverImageUrl` (optional URL), `isSelfHosted` (boolean), `buildingIds` (string array, max 20)
  - Derives `slug` client-side as `kebab-case(title) + '-' + nanoid(6)` (reuse the existing `generateSlug` utility or write a minimal equivalent)
  - On `isSelfHosted = true`, inserts `events` with `claim_status = 'claimed'` and sets `organiser_user_id` to the current user's ID (retrieved from `supabase.auth.getUser()` — never from a prop)
  - On `isSelfHosted = false`, inserts with `claim_status = 'unclaimed'`
  - After inserting the event, inserts rows into `event_buildings` for each ID in `buildingIds`
  - On success, calls `queryClient.invalidateQueries({ queryKey: eventKeys.lists() })` and navigates to `/events/:newSlug`
- `SubmitEvent` page:
  - Wrap in `AppLayout`
  - Standard form inputs for title, description, dates (use the existing `Calendar` component from `src/components/ui/calendar.tsx` for date selection)
  - Reuse `LocationInput` from `src/components/ui/LocationInput.tsx` for the address and coordinate fields
  - A "Link buildings" multi-select: a search input that calls `search_buildings` RPC (reuse the existing `useSearchBuildings` hook or its equivalent), showing results as selectable chips with a remove button; display selected buildings below the input
  - An "I'm the organiser" toggle (maps to `isSelfHosted`)
  - An "External link" text input (tickets, registration)
  - Submit button shows a `Loader2` spinner while pending; on error renders the error message inline below the form
  - Redirect unauthenticated users to `/login`

**Verify:** Submitting a valid form with a title and start date inserts a row into `events` in Supabase and navigates to the detail page. Submitting with `isSelfHosted = true` shows the event's `claim_status` as `claimed` in the database. Linking two buildings inserts two rows into `event_buildings`.

---

### [x] Task 1.4 — Events listing page (`/events`)

*Depends on Task 1.2.*

Create `src/features/events/pages/Events.tsx` and `src/features/events/components/EventCard.tsx`.

- `Events` page:
  - Fetches upcoming events via `useInfiniteQuery` backed by `getUpcomingEvents`; uses intersection-observer pagination (same pattern as the home feed)
  - Shows a heading "Upcoming events" and a "Share an event" button linking to `/events/new`
  - Renders a list of `EventCard` components
  - Empty state: a centred illustration placeholder and a CTA to submit the first event
  - Loading state: three `EventCard` skeleton variants using `animate-pulse`
  - Wrap in `AppLayout` with a `MetaHead` title of "Events · Plano"
- `EventCard` component — a list card showing:
  - Cover image (or a grey placeholder at a fixed `h-[180px]`) on the left at `w-[120px]` fixed width
  - Right column: event title (`16px font-black` truncated to 2 lines), date/time formatted as "Sat 3 May · 14:00", address (one line truncated), organiser line ("Hosted by @username" if claimed and `is_self_hosted`, "Community shared" otherwise), a "Claim" badge if `claim_status = 'unclaimed'`
  - Entire card is a `<Link to="/events/{slug}">` — no nested interactive elements inside the link
  - No bookmark, no like — those come in Phase 2

**Verify:** Navigating to `/events` renders the empty state with no console errors when the table is empty. After seeding one event, a card appears with the correct title, date, and organiser line.

---

### [x] Task 1.5 — Event detail page (`/events/:slug`)

*Depends on Tasks 1.2, 1.4.*

Create `src/features/events/pages/EventDetail.tsx` and `src/features/events/hooks/useEvent.ts`.

- `useEvent(slug: string)` — `useQuery` backed by `getEventBySlug`; `staleTime: 0` (event details are time-sensitive)
- `EventDetail` page:
  - Loading: full-page skeleton
  - Not found / deleted: `RouteErrorBoundary`-compatible 404 message
  - Cover image hero at `h-[260px]` full-width with `object-cover`, falls back to a grey placeholder
  - Header section: title (`32px font-black`), date range formatted as "Saturday 3 May 2025, 14:00–17:00", address with a small map-pin icon
  - Organiser section: avatar + name; if `organiser_person_id` or `organiser_company_id` is set, name links to `/person/:slug` or `/company/:slug`; if `claim_status = 'unclaimed'`, show a muted "Shared by @submitter · Claim this event →" link (the claim flow is wired in Phase 2 — for now the link is a no-op `<span>`)
  - Buildings section: only rendered if `buildings.length > 0`; displays a horizontal scroll of small building chips (image + name) each linking to `/building/:id/:slug`
  - Description section: full description text with a "Read more" expand if > 300 chars
  - External link: a "Get tickets / Register →" button if `externalLink` is set
  - Edit button: visible only if `user.id === event.submittedBy.userId`; links to `/events/:slug/edit`
  - Wrap in `AppLayout` with `MetaHead` using the event title and a truncated description
- Register the route `/events/:slug` in `src/App.tsx` using `React.lazy` for code-splitting.
- Register the static route `/events/new` **before** the dynamic `/events/:slug` route to prevent collision.

**Verify:** Navigating to `/events/<slug>` of a seeded event renders all sections without console errors. The buildings section is absent when the event has no linked buildings. The "Edit" button is visible for the submitter and hidden for other users.

---

### [x] Task 1.6 — Navigation wiring

*Depends on Task 1.4.*

- Add an "Events" entry to `AppSidebar.tsx` nav items using the `CalendarDays` icon from `lucide-react`, path `/events`, appearing between the Feed and Explore entries.
- Add the same entry to `BottomNav.tsx` in the equivalent position.
- Add two route registrations to `src/App.tsx`:
  - `/events` → `React.lazy(() => import('./features/events/pages/Events'))`
  - `/events/new` → `React.lazy(() => import('./features/events/pages/SubmitEvent'))` — **must be declared before** `/events/:slug`
  - `/events/:slug` → `React.lazy(() => import('./features/events/pages/EventDetail'))`
  - `/events/:slug/edit` → `React.lazy(() => import('./features/events/pages/SubmitEvent'))` (the same form page, which checks for an existing slug param to enter edit mode)
- In `SubmitEvent`, detect the `:slug` route param: if present, fetch the existing event and pre-populate the form; restrict editing to `submitted_by_user_id` (redirect others away).
- Add `events` to the navigation items inside `MainLayout` breadcrumb logic if applicable.

**Verify:** Clicking "Events" in the sidebar and bottom nav navigates to `/events`. Typing `/events/new` directly loads the submission form. Typing `/events/some-slug` loads the detail page and not the submission form.

---

### [x] Task 1.97 — Autonomous build & integrity check (Phase 1)

- Run `tsc --noEmit` — fix all type errors before proceeding.
- Run `npm run lint` — fix all lint errors and warnings.
- Run `vite build` — confirm zero build errors and that the `events` chunk appears in the output.
- Verify no `console.log` statements exist in any new or modified file.
- Verify no raw Tailwind palette colors (e.g. `bg-blue-500`) appear in new files — only design token aliases.
- Verify no `auth.uid()` (unparenthesised) appears in any new SQL.
- Update `.ai-status.md` with the Phase 1 architecture snapshot.

**Verify:** All three commands exit with code 0.

---

### [ ] Task 1.98 — User acceptance testing (Phase 1)

Manual test plan — run against the live Supabase + Vercel deployment (or localhost):

- Navigate to `/events` while logged out → page renders with no authentication error; "Share an event" button redirects to `/login`.
- Log in as a test user. Navigate to `/events/new`. Fill in title, start date, description. Submit → redirected to the new event's detail page. Event appears in `/events` listing.
- Create another event with `isSelfHosted = true`. Confirm the detail page shows "Hosted by @username" and the database row has `claim_status = 'claimed'`.
- Create an event and link two buildings. Confirm the buildings chips appear on the detail page. Confirm two rows in `event_buildings` in Supabase.
- Navigate to the detail page as a different user. Confirm the "Edit" button is not visible.
- Attempt to navigate to `/events/nonexistent-slug` → confirm a graceful not-found state.

---

### [ ] Task 1.99 — Phase 1 review & spec sync

- Append the event data model to `docs/DATA_CONTRACT.md` under a new `## Events` section: list `events` and `event_buildings` with column names, types, and relationships.
- Add an `## Events` section to `docs/PRD.md` describing the submit, list, and detail requirements implemented in this phase.
- Update the RPC inventory table in `docs/PRD.md` with `get_upcoming_events` and `get_event_by_slug` (even though these are currently direct queries, document them here for future RPC promotion).
- Append a `## Phase 1 Summary` block to `docs/ROADMAP.md`.
- Mark Phase 1 complete in `.ai-status.md`.

---

## Phase 2 — Social & Attendance

### [ ] Task 2.0 — Tech-debt & stability check (Phase 2)

- Read `.ai-status.md` `KNOWN_ISSUES` from Phase 1.
- Run `tsc --noEmit`; resolve any errors introduced since Task 1.97.
- Confirm the Phase 1 migration was applied and `npm run gen-types` reflects the current schema.

---

### [ ] Task 2.1 — Migration: `event_attendances`, `event_claims`, notification type

Create `supabase/migrations/<timestamp>_add_event_social.sql`:

- Create `event_attendances` table:
  - `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`
  - `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `status event_attendance_status NOT NULL DEFAULT 'interested'` (enum defined in Task 1.1)
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `PRIMARY KEY (event_id, user_id)`
- Create `event_claims` table:
  - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
  - `event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE`
  - `claimed_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `organiser_person_id uuid REFERENCES people(id) ON DELETE SET NULL`
  - `organiser_company_id uuid REFERENCES companies(id) ON DELETE SET NULL`
  - `proof_text text` — free-text justification from the claimant
  - `status text NOT NULL DEFAULT 'pending'` — values: `pending`, `approved`, `rejected`
  - `resolved_at timestamptz`
  - `resolved_by uuid REFERENCES auth.users(id)`
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `CHECK` constraint: at most one of `organiser_person_id`, `organiser_company_id` is non-null
- Add indexes on `event_attendances(user_id)` and `event_claims(event_id)`, `event_claims(claimed_by_user_id)`, `event_claims(status)`.
- Enable RLS on both tables. Write policies:
  - `event_attendances` SELECT: user can read their own rows (`user_id = (SELECT auth.uid())`); also allow reading the count aggregate via a separate anon-accessible view or RPC in Task 2.2
  - `event_attendances` INSERT/UPDATE/DELETE: `user_id = (SELECT auth.uid())`
  - `event_claims` SELECT: `claimed_by_user_id = (SELECT auth.uid())` OR admin role
  - `event_claims` INSERT: `claimed_by_user_id = (SELECT auth.uid())` with CHECK that the event's `claim_status = 'unclaimed'`
  - `event_claims` UPDATE: admin only (resolving claims is an admin action)
- Extend the `notifications` table's type constraint (or the TypeScript union — depending on how type is enforced in the project) to include `event_invite`. *(If the column is a plain `text` field with no DB-level enum, this is a TypeScript-only change — update the `Notification` interface in `src/features/notifications/pages/Notifications.tsx` and the settings list.)*

**Verify:** Both tables are created. An authenticated test user can insert a row into `event_attendances` and read it back. A different user cannot read that row. An unauthenticated request returns an empty result set (not an error) on `event_attendances`.

---

### [ ] Task 2.2 — RSVP hooks, attendance counts, and RSVP UI on detail page

*Depends on Tasks 2.1, 1.5.*

- Regenerate types (`npm run gen-types`).
- Create `src/features/events/hooks/useEventAttendance.ts`:
  - `useAttendanceStatus(eventId: string)` — `useQuery` that returns the current user's attendance `status` for the event, or `null` if not attending; `staleTime: 0`
  - `useAttendanceCounts(eventId: string)` — `useQuery` fetching the count of `interested` and `going` rows for the event; uses a `select('status, count').eq('event_id', eventId)` aggregate pattern; results are public (no auth required)
  - `useToggleAttendance()` — `useMutation` that upserts or deletes the current user's `event_attendances` row; on success, invalidates both `useAttendanceStatus` and `useAttendanceCounts` for the event
- Create `src/features/events/components/RsvpButtons.tsx`:
  - Two buttons: "Interested" and "Going", each with an icon (`Bookmark` and `CalendarCheck` from lucide-react)
  - Active state uses design-token colour for a filled/selected appearance; inactive state uses the ghost variant
  - Clicking an already-active button removes the attendance (toggles off)
  - Unauthenticated users see the buttons but clicking opens a sign-in prompt (reuse the existing pattern for this guard in the codebase)
  - Displays counts next to each button: "12 interested · 5 going"
- Wire `RsvpButtons` into `EventDetail.tsx` below the organiser section.

**Verify:** Clicking "Interested" on an event inserts a row in `event_attendances`. Clicking again removes it. The count updates after toggle without a full page refresh. Clicking while logged out prompts sign-in.

---

### [ ] Task 2.3 — Claim flow: `ClaimEventDialog`, `useClaimEvent`, and admin resolution

*Depends on Task 2.1.*

- Create `src/features/events/hooks/useClaimEvent.ts` — a `useMutation` that inserts into `event_claims`, sets the event's `claim_status` to `'pending'` via a subsequent update (or a single RPC — see below), and invalidates `eventKeys.detail(slug)`.
- Create a Supabase SQL function (add to the migration or a new migration file) `submit_event_claim(p_event_id uuid, p_person_id uuid, p_company_id uuid, p_proof text)` that:
  - Verifies the event's current `claim_status = 'unclaimed'`; raises an exception otherwise
  - Inserts a row into `event_claims`
  - Updates `events.claim_status = 'pending'`
  - Returns the new `event_claims.id`
  - Must be `SECURITY DEFINER` since it writes to `event_claims` on behalf of the caller
- Create `src/features/events/components/ClaimEventDialog.tsx`:
  - Triggered by the "Claim this event →" link on `EventDetail` (replace the no-op `<span>` from Task 1.5)
  - A `Dialog` (shadcn/ui) with: a brief explanation, an optional "I'm claiming as" selector (person or company — populated from the user's verified `people`/`companies` associations using hooks already present in `src/features/credits/`), a `proof_text` textarea, and a Submit button
  - On success, shows a toast: "Claim submitted — we'll review it shortly."
  - On error (already claimed, already pending), shows an inline error message
- Create `src/features/events/components/admin/EventClaimsQueue.tsx` — a simple table of pending `event_claims` rows with Approve and Reject buttons; visible only to admins (guard with `SuperadminGuard` pattern). On Approve:
  - Sets `event_claims.status = 'approved'` and `resolved_at = now()`
  - Copies the claim's `organiser_person_id`/`organiser_company_id` onto the `events` row
  - Sets `events.claim_status = 'claimed'`
  - On Reject: sets `event_claims.status = 'rejected'`, resets `events.claim_status = 'unclaimed'`
  - Both actions implemented as a `resolve_event_claim(p_claim_id uuid, p_approved boolean)` SQL function (`SECURITY DEFINER`, admin-only guard inside the function body via `profiles.role` check)
- Wire `EventClaimsQueue` into the existing admin panel (alongside `AdminBuildings`, `EntityClaims`, etc.).

**Verify:** A non-admin user can submit a claim on an unclaimed event. The event's `claim_status` in the database changes to `pending`. An admin can approve the claim; the event's `claim_status` changes to `claimed` and `organiser_person_id` is set correctly. Attempting to claim an already-claimed event returns an error.

---

### [ ] Task 2.4 — Feed integration: `FeedEvent` type and `FeedEventCard` component

*Depends on Tasks 1.2, 2.2.*

- Extend `src/types/feed.ts` with:
  - `FeedEvent` interface: `id, title, slug, startAt, endAt, address, coverImageUrl, claimStatus, isSelfHosted, organiser: EventOrganiser | null, submittedBy: { username, avatarUrl }` — import `EventOrganiser` from `src/features/events/types.ts`
  - `RawFeedEventRow` — the shape returned by the updated `get_feed` RPC (see below)
- Update the `get_feed` Supabase RPC to include a union of event rows from the followed users' submitted events, alongside existing review rows. The RPC should return a `row_type` discriminator column (`'review' | 'event'`). Add a new `event_data` JSON column for event rows (parallel to `building_data` for reviews). *(Write the updated RPC as a new migration file.)*
- Update `useFeed.ts` to parse `row_type = 'event'` rows into `FeedEvent` objects; push them into the aggregated feed array alongside `FeedReview` objects. The feed array type becomes `Array<FeedReview | FeedEvent>`.
- Create `src/features/feed/components/FeedEventCard.tsx`:
  - Props: `event: FeedEvent`
  - Layout: a horizontal card — fixed-height cover image on the left (`h-[100px] w-[90px] object-cover`), right column with actor line ("@username shared an event"), event title (`18px font-black` truncated to 2 lines), date line, organiser pill or "Unclaimed" badge
  - Entire card links to `/events/:slug`
- In `ReviewCardFeed.tsx` (the feed dispatcher), add a branch for `FeedEvent` entries that renders `<FeedEventCard>`.

**Verify:** After a test user submits an event, another user who follows them sees a `FeedEventCard` in their home feed. The card links correctly to the event detail page. Existing review cards are unaffected.

---

### [ ] Task 2.5 — Profile integration: hosting and attending sections

*Depends on Tasks 2.2, 2.4.*

- Create `src/features/events/hooks/useProfileEvents.ts`:
  - `useHostingEvents(userId: string)` — queries events where `organiser_user_id = userId` OR (`submitted_by_user_id = userId` AND `is_self_hosted = true`), ordered by `start_at DESC`, limit 10
  - `useAttendingEvents(userId: string)` — joins `event_attendances` filtered by `user_id = userId` to `events`, ordered by `start_at ASC`, limit 10 (upcoming only)
- Add an "Events" sub-section to the existing `Profile.tsx` page, rendered below the Collections grid:
  - Only shown if the user has any hosting or attending events
  - Two tab-like segments: "Hosting" and "Attending" (use the existing `SegmentedControl` component from `src/components/ui/segmented-control.tsx`)
  - Each tab renders a horizontal scroll of `EventCard` mini-variants (title + date, no description)
- For the current user's own profile, also show past events (where `start_at < now()`) in a "Past events" collapsed accordion.

**Verify:** A user who has submitted a self-hosted event sees it in the "Hosting" tab of their profile. A user who RSVPed "Going" to another event sees it in the "Attending" tab. Viewing another user's profile shows only their public hosting/attending events.

---

### [ ] Task 2.6 — Notification type: `event_invite`

*Depends on Task 2.1.*

- Add `'event_invite'` to the `type` union in the `Notification` interface inside `src/features/notifications/pages/Notifications.tsx`.
- In the `getIcon` function in that file, add a case for `event_invite` returning a `CalendarDays` icon.
- In the `getText` function, add a case: `"@{actor} invited you to an event"` with a link to the event if `metadata.event_slug` is present.
- In `NotificationSettingsDialog.tsx`, add `event_invite` to the settings list with the label "Event invitations".
- Write a Supabase SQL trigger function `notify_event_invite()` that fires `AFTER INSERT ON event_attendances` when `status = 'going'`: if the event has a non-null `organiser_user_id` and that user is not the attendee, insert a notification row for the organiser with `type = 'event_invite'`, `actor_id` = the attendee, and `metadata = { event_slug }`. *(Add as a new migration.)*
- The trigger should respect `profiles.notification_preferences` — read the value for key `event_invite` and skip insertion if it is explicitly `false`.

**Verify:** User A submits a self-hosted event. User B sets their attendance to "Going". User A receives a new notification of type `event_invite` in `/notifications`. If User A has `event_invite: false` in their notification preferences, no notification is created.

---

### [ ] Task 2.97 — Autonomous build & integrity check (Phase 2)

- Run `tsc --noEmit`, `npm run lint`, `vite build` — all must pass.
- Verify no raw `auth.uid()` in any new SQL.
- Verify all new `useMutation` calls handle `onError` and surface the error message to the UI.
- Update `.ai-status.md`.

---

### [ ] Task 2.98 — User acceptance testing (Phase 2)

Manual test plan:

- Log in as User A. Navigate to an unclaimed event. Click "Interesting" and "Going" — counts update. Reload page — RSVP state persists.
- Click "Claim this event →". Submit a claim with proof text. Confirm `event_claims` row exists in Supabase with `status = 'pending'` and `events.claim_status = 'pending'`.
- Log in as an admin. Navigate to the admin events claim queue. Approve the claim. Confirm the event's detail page now shows the organiser identity.
- As the original user, follow User B. User B submits a new event. Verify User A's home feed contains a `FeedEventCard` for that event.
- Navigate to User B's profile. Confirm the "Events" section is visible and shows the event under "Hosting".
- Log in as User C. RSVP "Going" to User B's self-hosted event. Confirm User B receives an `event_invite` notification.

---

### [ ] Task 2.99 — Phase 2 review & spec sync

- Update `docs/DATA_CONTRACT.md`: add `event_attendances`, `event_claims` table schemas; document `submit_event_claim` and `resolve_event_claim` RPCs.
- Update `docs/PRD.md`: add FR entries for attendance, claim flow, feed integration, and notifications.
- Append `## Phase 2 Summary` to `docs/ROADMAP.md`.
- Mark Phase 2 complete in `.ai-status.md`.

---

## Phase 3 — Discovery & Admin

### [ ] Task 3.0 — Tech-debt & stability check (Phase 3)

- Read `.ai-status.md` `KNOWN_ISSUES` from Phase 2.
- Run `tsc --noEmit`; resolve any errors.
- Confirm Phase 2 migrations applied and types regenerated.

---

### [ ] Task 3.1 — `search_events` RPC and search page integration

*Depends on Task 1.2.*

- Write a new Supabase SQL function `search_events(p_query text, p_from timestamptz, p_to timestamptz, p_limit int, p_offset int)` as a migration:
  - Full-text search against `events.title || ' ' || coalesce(events.description, '') || ' ' || coalesce(events.address, '')` using `plainto_tsquery`; fall back to `ILIKE '%' || p_query || '%'` on title if ts rank is zero
  - Filter `is_deleted = false`; filter by date range if `p_from`/`p_to` are provided
  - Return columns: `id, title, slug, start_at, end_at, address, cover_image_url, claim_status, organiser_display_name, organiser_slug, organiser_kind`
  - `SECURITY DEFINER` not needed — uses RLS on `events`; grant EXECUTE to `authenticated` and `anon`
- Add `search_events` to the RPC inventory in `docs/PRD.md`.
- Create `src/features/events/hooks/useSearchEvents.ts` — a `useQuery` wrapper around the RPC; takes `query: string` and optional date range; debounced 300 ms.
- In `src/features/search/` (the existing search page), add a new "Events" mode tab alongside the existing Buildings / People / Companies / Users tabs:
  - Renders when the mode toggle is set to `events`
  - Shows `EventCard` list items from `useSearchEvents` results
  - Adds a date-range filter (two date pickers, "From" and "To") visible only in Events mode
  - Cross-entity nudge: if building search results are sparse and the query looks like a date or place, show "Try searching Events instead →"

**Verify:** Searching for a known event title on the search page returns a matching `EventCard` in the Events tab. Date-range filtering narrows results correctly. An empty query with a date range returns all events in that range.

---

### [ ] Task 3.2 — Map integration: event markers and date filter toggle

*Depends on Task 1.2.*

- Write a new Supabase SQL function `get_map_events(p_bounds_sw_lat float8, p_bounds_sw_lng float8, p_bounds_ne_lat float8, p_bounds_ne_lng float8, p_from timestamptz, p_to timestamptz)` as a migration:
  - Returns `id, title, slug, start_at, lat, lng` for events within the bounding box and date window where `location IS NOT NULL` and `is_deleted = false`
  - Maximum 200 results (no clustering for events — they are sparse by nature)
  - Grant EXECUTE to `authenticated` and `anon`
- Create `src/features/events/hooks/useMapEvents.ts` — a `useQuery` that calls `get_map_events` with the current map bounds; re-runs on map move with a 500 ms debounce; disabled when the events overlay toggle is off.
- Add an "Events" toggle to the map filter drawer (the existing `FilterDrawer` component):
  - An on/off switch labelled "Show events"
  - Two date pickers ("From" / "To") that appear when the toggle is on, defaulting to today → +30 days
  - URL-first state: serialise `showEvents`, `eventsFrom`, and `eventsTo` to URL search params (follow the existing `mapFilters` URL serialisation pattern)
- When the toggle is on, render event markers on the map as distinct `CalendarDays` icon pins (use a custom MapLibre marker with a teal background distinct from building pins):
  - Clicking an event marker opens a small popup with the event title, date, and a "View event →" link
  - Event markers do not participate in the building clustering RPC — they are rendered as a separate layer
- Limit: do not attempt to cluster events in this task; clustering is a future enhancement.

**Verify:** Toggling "Show events" on the map renders teal calendar markers for any events with coordinates that fall in the current viewport and date window. Clicking a marker opens the popup. Toggling off removes the markers. The map URL updates to reflect the toggle state.

---

### [ ] Task 3.3 — Admin events management panel

*Depends on Tasks 2.3, 3.1.*

- Create `src/features/superadmin/pages/AdminEvents.tsx`:
  - Protected by `SuperadminGuard`
  - A searchable, filterable table of all events (including deleted ones): columns are title, submitter, organiser, `claim_status`, `start_at`, created date, deleted badge
  - Filter controls: status filter (all / unclaimed / pending / claimed / deleted), date range
  - Row actions: "View" (links to `/events/:slug`), "Soft delete" (sets `is_deleted = true` with confirmation dialog), "Restore" (for deleted events)
  - Inline `claim_status` badge using design-token colours: unclaimed = gray, pending = amber, claimed = teal
- Wire `AdminEvents` into the admin sidebar navigation alongside other admin sections (Buildings, Users, etc.).
- Add a notification badge on the admin sidebar's Events entry showing the count of `pending` claim rows (reuse the existing badge pattern on the sidebar).
- Move the `EventClaimsQueue` component from Task 2.3 into a tab within `AdminEvents` (Claims tab alongside an All Events tab) rather than keeping it as a standalone panel, to consolidate event admin into one surface.

**Verify:** Navigating to `/admin/events` as an admin shows the events table. Soft-deleting an event sets `is_deleted = true` in the database and the event no longer appears in `/events`. Restoring it makes it visible again. The Claims tab shows pending claims with Approve/Reject actions.

---

### [ ] Task 3.97 — Autonomous build & integrity check (Phase 3)

- Run `tsc --noEmit`, `npm run lint`, `vite build` — all must pass.
- Run `grep -r "auth\.uid()" supabase/` — confirm zero raw (unparenthesised) hits in any new migration.
- Confirm no new npm packages were installed without explicit approval (check `package.json` diff).
- Update `.ai-status.md`.

---

### [ ] Task 3.98 — User acceptance testing (Phase 3)

Manual test plan:

- Navigate to the search page. Select "Events" mode. Search for a known event title — confirm it appears. Set a date range that excludes the event — confirm it disappears.
- Navigate to the map. Toggle "Show events". Confirm teal markers appear for events with coordinates. Change the date range to exclude the event — markers disappear. Click a marker — popup appears with the correct title and link.
- Log in as an admin. Navigate to `/admin/events`. Confirm the events table loads. Soft-delete an event — confirm it disappears from `/events` and the map. Navigate to the Claims tab — confirm pending claims are visible and can be approved or rejected.
- Attempt to navigate to `/admin/events` as a non-admin user — confirm redirect to `/admin/unauthorized`.

---

### [ ] Task 3.99 — Phase 3 review & spec sync

- Update `docs/DATA_CONTRACT.md`: add `get_map_events` and `search_events` to the RPC inventory; document their parameters and return shapes.
- Update `docs/PRD.md`: add FR entries for events search, map markers, and admin management.
- Append `## Phase 3 Summary` to `docs/ROADMAP.md`.
- Mark Phase 3 complete in `.ai-status.md`.

---

## Dependency summary

```
1.0
└── 1.1 (migration applied manually)
    └── 1.2
        ├── 1.3
        ├── 1.4
        │   └── 1.6
        └── 1.5 (depends on 1.4 for EventCard)
            └── 2.3 (wires ClaimEventDialog into EventDetail)
            └── 2.4 (FeedEventCard links to EventDetail)
            └── 2.5 (profile hosting/attending links to EventDetail)
        └── 3.1 (search_events + search page tab)
        └── 3.2 (map events hook)
1.97 → 1.98 → 1.99

2.0
└── 2.1 (migration applied manually)
    └── 2.2 (RSVP hooks + RsvpButtons)
        └── 2.4 (FeedEvent type extends feed.ts)
        └── 2.5 (useAttendingEvents)
    └── 2.3 (claim flow + EventClaimsQueue)
    └── 2.6 (notification trigger + UI)
2.97 → 2.98 → 2.99

3.0
└── 3.1 (search_events RPC + search tab)
└── 3.2 (get_map_events RPC + map layer)
└── 3.3 (AdminEvents panel — consolidates 2.3 EventClaimsQueue)
3.97 → 3.98 → 3.99
```

---

## Standing conventions (apply to every task)

- All new migrations: `supabase/migrations/<YYYYMMDDHHmmss>_<description>.sql`
- All RLS predicates: `(SELECT auth.uid())` — never bare `auth.uid()`
- All write policies: both `USING` and `WITH CHECK` clauses
- All new columns referenced in RLS predicates: must have an index
- All colours: design token aliases only (`bg-brand-primary`, not `bg-teal-500`)
- All forms: Zod validation before any DB write
- All mutations: typed `{ success: boolean; error?: string }` result — never throw raw errors to the UI
- All query keys: use `eventKeys` constants from `src/features/events/queryKeys.ts`
- After every migration: regenerate types with `npm run gen-types`
- After every task: update `.ai-status.md` and sync `docs/DATA_CONTRACT.md` if any schema or DTO changed