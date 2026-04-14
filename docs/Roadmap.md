# Plano — Events Additions Roadmap

**Feature additions:** Profile events tab (revised) · Event recommendations · Attendance feed cards  
**Prepared:** April 2026  
**Prerequisite:** The original Events feature roadmap (Phases 1–3) has been fully implemented and all migrations applied.  
**Stack:** React 18 SPA · Supabase (Postgres/PostGIS) · TanStack Query · shadcn/ui · Tailwind CSS  
**Conventions:** Vertical slice methodology per `.cursor/rules/05-vertical-slice.mdc`. Migration files only; never apply schema changes via the Supabase Dashboard.

---

## Context & design decisions

### Profile tab segmentation

The profile events section uses three segments based on the viewing user's **relationship to the event**, not their role in creating it:

| Segment | Query condition |
|---|---|
| **Organising** | `events.organiser_user_id = userId` OR user's claimed `people.id` matches `events.organiser_person_id` OR any of user's stewarded `companies.id` matches `events.organiser_company_id` |
| **Attending** | `event_attendances.status = 'going'` for this user |
| **Interested** | `event_attendances.status = 'interested'` for this user |

Whether the user was the person who first submitted an event to Plano is incidental context, not a primary filter. It is surfaced instead as a **"Added by @username" badge** on the event card itself — visible to anyone viewing the card, on any surface (profile, listing, feed, search). This is analogous to the building creator credit shown on building cards.

### Notifications `metadata` column

The `notifications` table does not currently have a `metadata` column. Task 4.1b adds `metadata jsonb` as a nullable column before any task writes contextual payload (event slug, event title) into a notification row. All existing notification inserts that do not set `metadata` are unaffected.

### Event recommendations

The existing `recommendations` table and `RecommendDialog` component are extended to support events. No new recommendation infrastructure is introduced. The `event_id` column is nullable with a check constraint ensuring exactly one of `building_id` or `event_id` is non-null per row. The existing `recommendation` notification type, inbox rendering, and feed card cover event recommendations with only a text-copy branch added.

A sender can optionally indicate their own attendance when recommending — an "I'm going" toggle in the dialog upserts their `event_attendances` row to `going` as a side effect of sending.

### Attendance feed cards

When a followed user RSVPs "going" to an event, a compact activity row appears in the home feed — the same pattern as `FeedActivityRow` for building visits. Only `going` is surfaced (not `interested`, which is too low-signal for the feed). Multiple followed users going to the same event within a time window are clustered into a single card with a facepile: "Alex, Jamie and 1 other are going to [Event Name]". The `get_feed` RPC gains a third union branch for `event_attendance` rows; the feed dispatcher gains a new `row_type = 'event_attendance'` branch rendering `FeedEventAttendanceRow`.

---

## Phase 4 — Profile Tab & Event Recommendations

### [x] Task 4.0 — Tech-debt & stability check

- Read `.ai-status.md` `KNOWN_ISSUES`.
- Run `tsc --noEmit` and confirm a clean pass; note any pre-existing errors without fixing them unless they touch files this phase will modify.
- Confirm `npm run gen-types` reflects the current live schema (all Phase 1–3 migrations applied).
- No code changes in this task.

**Verify:** A clean `tsc` pass (or a documented pre-existing error list) is recorded in `.ai-status.md` before Task 4.1 begins.

---

### [x] Task 4.1 — Migration: extend `recommendations` with `event_id`

Create `supabase/migrations/<timestamp>_recommendations_add_event_id.sql`:

- Add column `event_id uuid REFERENCES events(id) ON DELETE CASCADE` to the `recommendations` table; nullable.
- Add a `CHECK` constraint to `recommendations` ensuring exactly one of `building_id` and `event_id` is non-null:
  ```sql
  ALTER TABLE recommendations
    ADD CONSTRAINT recommendations_single_target_check
    CHECK (
      (building_id IS NOT NULL AND event_id IS NULL) OR
      (building_id IS NULL AND event_id IS NOT NULL)
    );
  ```
- Add an index `idx_recommendations_event_id` on `recommendations(event_id)` WHERE `event_id IS NOT NULL`.
- The existing RLS policies on `recommendations` use predicates on `sender_id` and `recipient_id` — they are target-agnostic and do not need to change.
- No changes to `event_attendances` schema are needed; the "I'm going" side effect in Task 4.3 writes to the existing table.

**Verify:** After applying the migration, inserting a recommendations row with only `event_id` set succeeds. Inserting with both `building_id` and `event_id` set raises a constraint violation. Inserting with neither raises a constraint violation. The existing building recommendation flow is unaffected (confirm one existing recommendation row can still be read back).

---

### [x] Task 4.1b — Migration: add `metadata jsonb` to `notifications`

Create `supabase/migrations/<timestamp>_notifications_add_metadata.sql`:

- Add column `metadata jsonb` to the `notifications` table; nullable, no default.
- No existing rows are affected — a `null` `metadata` value is valid and the notification renderers in `Notifications.tsx` already guard with optional chaining (`notification.metadata?.key`).
- No RLS changes needed; the existing policies on `notifications` are predicated on `recipient_id` and are column-agnostic.
- No index is needed on `metadata` — it is read by looking up a specific notification row by `id`, never filtered across rows.
- Regenerate types with `npm run gen-types` after applying.

**Verify:** After applying the migration, inserting a notification row with `metadata: { event_slug: 'test-event', event_title: 'Test Event' }` succeeds. Inserting with `metadata: null` also succeeds. Reading an existing notification row that pre-dates the migration returns `metadata: null` without error.

*Dependencies: none — can be applied immediately after Task 4.0, in parallel with Task 4.1.*

---

### [x] Task 4.2 — `useProfileEvents` hook and profile tab data layer

*Depends on Task 4.0 (schema confirmed current).*

> **Note:** This task replaces the `useProfileEvents` hook implemented in Task 2.5 of the original roadmap. Delete the old hook file before writing the new one.

- Delete `src/features/events/hooks/useProfileEvents.ts`.
- Create a new `src/features/events/hooks/useProfileEvents.ts` exporting three hooks:

  **`useOrganisingEvents(userId: string)`**
  - Queries `events` where `is_deleted = false` using three OR conditions joined by `.or()`:
    - `organiser_user_id.eq.${userId}`
    - `organiser_person_id.in.(${personIds})` — `personIds` derived from the existing `useClaimedPersonForNav` hook result; pass an empty array if no claimed person, which produces a no-op IN clause
    - `organiser_company_id.in.(${companyIds})` — derived from `useStewardCompaniesForNav`; same fallback
  - Ordered `start_at DESC`; limit 20
  - `staleTime: 60_000`

  **`useAttendingEvents(userId: string)`**
  - Joins `event_attendances` filtered by `user_id = userId` and `status = 'going'` to `events`
  - Only upcoming events (`start_at >= now()`) in the default result; past events fetched separately when the user expands a "Past events" section (see Task 4.3)
  - Ordered `start_at ASC`; limit 20
  - `staleTime: 0` (attendance changes should reflect immediately)

  **`useInterestedEvents(userId: string)`**
  - Same as `useAttendingEvents` but filters `status = 'interested'`
  - `staleTime: 0`

- All three hooks accept a `userId` param (not derived from auth inside the hook) so they work for viewing other users' profiles.
- Export a `useProfileEventsCountBadges(userId: string)` helper that calls all three hooks and returns `{ organisingCount, attendingCount, interestedCount }` for the tab count badges.
- Add `eventKeys.profile(userId, segment)` to `src/features/events/queryKeys.ts` for all three query key variants.

**Verify:** `tsc --noEmit` passes. Calling `useOrganisingEvents` with a userId that has an organising event returns that event. Calling `useAttendingEvents` with a userId that has RSVPed "Going" returns the correct event. Calling `useInterestedEvents` with a userId that has RSVPed "Interested" returns the correct event.

---

### [x] Task 4.3 — Profile events tab UI

*Depends on Task 4.2.*

> **Note:** This task replaces the Events sub-section implemented in Task 2.5 of the original roadmap. Remove the old Events block from `Profile.tsx` before adding the new one.

**`EventProfileCard` component** — create `src/features/events/components/EventProfileCard.tsx`:
- A compact card used exclusively within profile tabs (not the same as `EventCard` used in the listings page)
- Layout: cover image thumbnail at `w-[72px] h-[72px] object-cover rounded-md` flex-shrink-0, right column with event title (`15px font-black` truncated to 2 lines), date formatted as "Sat 3 May · 14:00", address (1 line truncated, muted), attendance pill (only shown when viewing own profile: a small `going` or `interested` chip in the appropriate design-token colour)
- **"Added by" badge:** if `event.submittedBy.userId === viewingUserId` (i.e. the person viewing the profile is the one who submitted the event — shown on any profile), render a small pill "Added to Plano by you" in gray; if `event.submittedBy.userId === profileUserId` and the viewer is someone else, render "Added by @{username}" — use the same ghost badge style as building creator credits. This badge is shown in all three tab segments, not just Sharing.
- Entire card is a `<Link to="/events/{slug}">`.

**Profile events section** — update `src/features/profile/pages/Profile.tsx`:
- Remove the previous Events block (two-tab Hosting/Attending from Task 2.5).
- Add a new "Events" section below the Collections grid.
- Only render the section if at least one of `organisingCount`, `attendingCount`, `interestedCount` is > 0.
- Use `SegmentedControl` (from `src/components/ui/segmented-control.tsx`) with three segments: **Organising** · **Attending** · **Interested**, each with a numeric count badge.
- Default active segment: Organising if `organisingCount > 0`, else Attending, else Interested.
- Each segment renders a vertical list of `EventProfileCard` components from the corresponding hook.
- **Past events accordion:** below the active events list (in the Attending and Interested segments only), a collapsed `<Accordion>` item labelled "Past events (N)". Expanding it triggers a secondary query: same hooks but with an additional `start_at.lt.${now}` filter and `start_at DESC` ordering. Only shown when viewing your own profile.
- Loading state: two `EventProfileCard` skeletons using `animate-pulse`.
- Empty state per segment: one line of muted text ("Nothing here yet") — no CTA, to keep the profile uncluttered.

**Verify:** A user with one organising event, one "going" RSVP, and one "interested" RSVP sees counts of 1 / 1 / 1 on the three tabs. Switching tabs shows the correct event in each. The "Added by" badge appears on cards where the submitter matches. The Past events accordion is absent when viewing another user's profile.

---

### [x] Task 4.4 — `RecommendDialog` event mode

*Depends on Tasks 4.1 and 4.1b (both migrations applied, types regenerated).*

- Regenerate types (`npm run gen-types`) if not already done after 4.1b.
- Update `src/components/common/RecommendDialog.tsx`:
  - Add a `mode` prop: `'building' | 'event'`; add an `event` prop of type `EventCardDTO | null` (import from `src/features/events/types.ts`) alongside the existing `building` prop
  - When `mode = 'event'`, the dialog title becomes "Recommend an event"; the preview card shows event cover image, title, and date instead of building image/name/year; the existing building rating input is hidden
  - Add an **"I'm going"** `Checkbox` (shadcn/ui) below the recipient picker, labelled "Mark me as going too"; default unchecked; hidden when `mode = 'building'`
  - In the submit handler, when `mode = 'event'`:
    - Insert a `recommendations` row with `event_id` set, `building_id: null`, and a `notifications` row (or trigger — match the existing pattern) with `metadata: { event_slug: event.slug, event_title: event.title }` so the notification renderer in Task 4.5 has the context it needs without a secondary fetch
    - If "I'm going" is checked, upsert `event_attendances` with `{ event_id, user_id: currentUser.id, status: 'going' }` in the same async block (not a transaction — failure of the upsert should not roll back the recommendation; log the error silently and show no user-facing error)
    - Invalidate `eventKeys.detail(event.slug)` and `eventKeys.profile(currentUser.id, 'attending')` on success
  - The existing building recommendation flow is unchanged — the new props are additive.

- Add a **"Recommend"** button to `src/features/events/pages/EventDetail.tsx`:
  - Positioned alongside the RSVP buttons
  - Opens `RecommendDialog` in `mode='event'`
  - Unauthenticated users see the button but clicking prompts sign-in (same guard pattern as RSVP buttons)

**Verify:** Opening the recommend dialog from an event detail page shows event data (not building data). Submitting a recommendation inserts a row in `recommendations` with `event_id` set and `building_id` null. The corresponding notification row has `metadata.event_slug` and `metadata.event_title` set. With "I'm going" checked, an `event_attendances` row is also inserted or updated. The existing building recommendation dialog is unaffected — opening it from a building page still sends a building recommendation.

---

### [x] Task 4.5 — Notification and feed copy for event recommendations

*Depends on Task 4.4.*

- Update `src/features/notifications/pages/Notifications.tsx`:
  - In the `getText` function, extend the `'recommendation'` case: if `notification.metadata?.event_slug` is present, render "**@{actor}** recommended an event to you" with a `<Link to="/events/{event_slug}">` wrapping the event title (fetched from `notification.metadata.event_title`, which should be stored in the notification `metadata` JSON when the recommendation is inserted — add this to the insert in `RecommendDialog`)
  - If `metadata.event_slug` is absent, the existing building recommendation text renders unchanged.
  - The `recommendation` icon mapping is already handled — no icon change needed.

- Update the `recommendations` insert in `RecommendDialog` (Task 4.4) to write `metadata: { event_slug: event.slug, event_title: event.title }` on event recommendations so the notification renderer has what it needs without a secondary fetch.

- Update `src/features/notifications/components/NotificationSettingsDialog.tsx`: the existing "Recommendations" toggle label is generic enough to cover both buildings and events — no change needed; add a clarifying note in the label if the current text says "Building recommendations" (change to "Recommendations").

- Inspect the existing feed card used for building recommendations (likely `FeedResolvedEntry` or similar): if recommendation feed rows are rendered, confirm the existing card can display an event recommendation gracefully. If the card tries to render a building image/name and gets null because the recommendation references an event instead, add a fallback branch that renders the event cover image and title. Keep this change minimal — if it requires significant restructuring of the feed card, scope it as a follow-up and leave a `// TODO` comment.

**Verify:** User A recommends an event to User B. User B sees a notification: "@usera recommended an event to you" with a link to the event. Clicking the notification navigates to the correct event detail page. The existing building recommendation notification text is unchanged. The "Recommendations" toggle in notification settings controls both building and event recommendation notifications.

---

### [x] Task 4.6 — Attendance feed cards: client-side query and `FeedEventAttendanceRow`

*Depends on Task 4.0 (schema confirmed current). Independent of Tasks 4.1–4.5; can run in parallel.*

**No RPC changes.** The `get_feed` function's return shape was last defined in `20270812000000_remove_groups_feature.sql` (and kept stable by subsequent migrations such as `20270843000000_feed_user_data_followers_count.sql`). It has a fixed column list with no `row_type` discriminator and no `group_id`. Extending it requires `DROP FUNCTION` followed by `CREATE`, which is a high-risk change to a critical path. Attendance rows are instead fetched as a **separate direct query** in `useFeed.ts` and merged into the feed array client-side. This is the same pattern used by the existing `FeedCollection` and `FeedEvent` card types, which are also fetched independently and interleaved with the review rows.

**TypeScript — feed types**

Update `src/types/feed.ts`:
- Add `FeedEventAttendance` interface:
  ```typescript
  export interface FeedEventAttendance {
    id: string;            // synthetic: 'attendance-{eventId}'
    rowType: 'event_attendance';
    eventId: string;
    title: string;
    slug: string;
    startAt: string;
    endAt: string | null;
    address: string | null;
    coverImageUrl: string | null;
    claimStatus: string;
    actors: ReviewUser[];  // all followed users going — merged during aggregation
    createdAt: string;     // earliest created_at among the clustered actors
  }
  ```
- Extend the feed array union type to include `FeedEventAttendance` alongside the existing `FeedReview` and `FeedEvent` types.

**Hook — `useFeed.ts`**

Update `src/features/feed/hooks/useFeed.ts`:
- After the existing `get_feed` RPC call resolves, fire a **second direct query** against `event_attendances` joined to `events` and `profiles`:
  ```typescript
  supabase
    .from('event_attendances')
    .select(`
      user_id,
      created_at,
      events ( id, title, slug, start_at, end_at, address, cover_image_url, claim_status ),
      profiles ( username, avatar_url, followers_count )
    `)
    .in('user_id', followedUserIds)   // followedUserIds already fetched for the main feed
    .eq('status', 'going')
    .eq('events.is_deleted', false)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(50)
  ```
  `followedUserIds` is the same array already used to construct the `get_feed` RPC call — reuse it; do not make an extra contacts query.
- **Client-side clustering:** after fetching, group rows by `event_id`. For each group:
  - If only one actor: produce one `FeedEventAttendance` with `actors = [thatUser]`.
  - If multiple actors: produce one `FeedEventAttendance` with all actors merged into `actors[]`, `createdAt` set to the earliest `created_at` in the group.
  - Discard any group where every actor is the current user themselves (edge case: user follows themselves via some path).
- **Merging into the feed array:** after both the review rows and attendance rows are parsed, concatenate them into a single array and sort by `createdAt` descending. This produces the interleaved feed. Use the same `useMemo` or derivation pattern already in place for `FeedCollection` and `FeedEvent` merging — do not duplicate the sort logic.
- Both queries run in parallel (`Promise.all`) to avoid waterfall latency. If the attendance query fails, log the error and return an empty array for that slice — do not let it break the main review feed.
- `staleTime` for the attendance query: `0` (attendance changes should reflect promptly).

**Component — `FeedEventAttendanceRow`**

Create `src/features/feed/components/FeedEventAttendanceRow.tsx`:
- Props: `entry: FeedEventAttendance`
- Layout: a compact horizontal activity row — identical in height and structure to the existing `FeedActivityRow` used for building visits.
- Left: event cover image thumbnail at `48×48px object-cover rounded-md`; fall back to a `CalendarDays` icon placeholder in the same dimensions.
- Text block:
  - Actor line constructed from `entry.actors`: one actor → "@username is going to"; two → "@a and @b are going to"; three or more → "@a, @b and N others are going to". Each `@username` is a `<Link to="/profile/{username}">`.
  - Event name at `21px font-black` truncated to one line, wrapped in `<Link to="/events/{slug}">`.
  - Date line: formatted as "Sat 3 May · 14:00", muted.
- No bookmark icon on the right (no equivalent save action for events in this context).
- Row separator: `border-b border-border-default`, `py-3`.

**Dispatcher — `ReviewCardFeed.tsx`**

Update `src/features/feed/components/ReviewCardFeed.tsx` (the feed dispatcher):
- Add a branch for `entry.rowType === 'event_attendance'` that renders `<FeedEventAttendanceRow entry={entry} />`.

**Verify:** After User A (whom the test user follows) RSVPs "going" to an event, a `FeedEventAttendanceRow` appears in the test user's home feed. The actor name and event title are correct. The row links to the event detail page. If Users A and B both RSVP "going" to the same event within 30 days, a single clustered row appears reading "@usera and @userb are going to [Event Name]". The `get_feed` RPC is called with its existing signature and returns the same shape as before — no migration was needed. Existing review cards and `FeedEventCard` cards are unaffected.

---

### [x] Task 4.97 — Autonomous build & integrity check (Phase 4)

- Run `tsc --noEmit` — fix all type errors before proceeding.
- Run `npm run lint` — fix all warnings.
- Run `vite build` — confirm zero errors.
- Run `grep -r "auth\.uid()" supabase/` — confirm zero unparenthesised hits in any new migration.
- Confirm no `console.log` in any new or modified file.
- Confirm no raw Tailwind palette colours in new files.
- Update `.ai-status.md` with the Phase 4 architecture snapshot.

**Verify:** All three commands exit with code 0.

---

### [ ] Task 4.98 — User acceptance testing (Phase 4)

Manual test plan — run against the live Supabase + Vercel deployment (or localhost):

**Profile tab:**
- Log in as a user who organises one event, has RSVPed "Going" to a second, and "Interested" to a third. Navigate to their profile. Confirm the Events section shows tabs with counts 1 / 1 / 1. Switch tabs — confirm the correct event appears in each.
- On the Organising tab, confirm the event card does **not** show an attendance pill.
- On the Attending and Interested tabs, confirm the past events accordion is visible (even if empty). Expand it — confirm it loads without error.
- Navigate to another user's profile. Confirm the Past events accordion is absent.
- Create an event as User A. View User B's profile (who has no connection to the event). Confirm the "Added by @usera" badge appears on any event card where User A was the submitter, regardless of which tab it appears in.

**Event recommendations:**
- Navigate to any event detail page. Confirm a "Recommend" button is present alongside the RSVP buttons.
- Click "Recommend". Confirm the dialog shows event data (cover image, title, date) and not building data.
- Select a recipient. Check "I'm going". Submit. Confirm:
  - A row in `recommendations` with `event_id` set and `building_id` null.
  - A row in `event_attendances` with `status = 'going'` for the sender.
  - The sender's profile Attending tab now shows the event.
- Log in as the recipient. Confirm a notification appears: "@sender recommended an event to you". Click it — confirm navigation to the event detail page.
- Open the existing building recommend dialog from a building detail page. Confirm it still works correctly — no "I'm going" checkbox, no event data visible.
- Disable "Recommendations" in notification settings. Have another user send an event recommendation. Confirm no notification is received.

**Attendance feed cards:**
- Log in as User A. Follow User B. Have User B RSVP "going" to a published event. Refresh User A's home feed — confirm a `FeedEventAttendanceRow` appears with the correct actor name, event title, and date.
- Have a third User C (also followed by User A) RSVP "going" to the same event. Refresh the feed — confirm the two rows are clustered into a single row reading "@userb and @userc are going to [Event Name]".
- Confirm the row links to the correct event detail page.
- Have User B RSVP "interested" (not "going") to a different event. Confirm this does **not** produce a feed row for User A.
- Confirm existing review cards and shared-event cards (`FeedEventCard`) are unaffected.

---

### [ ] Task 4.99 — Phase 4 review & spec sync

- Update `docs/DATA_CONTRACT.md`:
  - Amend the `recommendations` table entry to document the `event_id` column and the single-target check constraint.
  - Add a `notifications.metadata` column entry noting it is `jsonb`, nullable, and used by event recommendation rows.
  - Update `useProfileEvents` hook documentation to reflect the three new hooks and their query conditions.
  - Add `FeedEventAttendance` to the feed types section; document the `get_feed` RPC extension and the `row_type = 'event_attendance'` discriminator.
- Update `docs/PRD.md`:
  - Amend the Profile section (FR-12) to describe the three-segment Events tab with the "Added by" badge behaviour.
  - Amend the Social section (FR-11) to document event recommendations as an extension of the existing building recommendation flow.
  - Amend the Feed section (FR-10) to document `FeedEventAttendanceRow` and the `going`-only surfacing rule.
- Append a `## Phase 4 Summary` block to `docs/ROADMAP.md`.
- Mark Phase 4 complete in `.ai-status.md`.

---

## Dependency summary

```
4.0
├── 4.1  (recommendations migration — apply manually, then gen-types)
│   └── 4.4  (RecommendDialog event mode)
│       └── 4.5  (notification & feed copy)
├── 4.1b (notifications metadata migration — apply manually, then gen-types)
│   └── 4.4  (also depends here — needs metadata column before writing to it)
├── 4.2  (useProfileEvents hooks — requires confirmed schema)
│   └── 4.3  (profile tab UI — requires hooks)
└── 4.6  (attendance feed cards — independent of 4.1/4.1b chain)
4.97 → 4.98 → 4.99
```

Three independent chains after Task 4.0 and the two migrations are applied:
- **Chain A:** 4.1 + 4.1b → 4.4 → 4.5
- **Chain B:** 4.2 → 4.3
- **Chain C:** 4.6

Chains B and C have no dependencies on Chain A and can be worked concurrently.

---

## Standing conventions (unchanged from original roadmap)

- All new migrations: `supabase/migrations/<YYYYMMDDHHmmss>_<description>.sql`
- All RLS predicates: `(SELECT auth.uid())` — never bare `auth.uid()`
- All write policies: both `USING` and `WITH CHECK` clauses
- All new columns referenced in RLS predicates: must have an index
- All colours: design token aliases only — no raw Tailwind palette colours
- All forms: Zod validation before any DB write
- All mutations: typed `{ success: boolean; error?: string }` result — never throw raw errors to the UI
- All query keys: use `eventKeys` constants from `src/features/events/queryKeys.ts`
- After every migration: regenerate types with `npm run gen-types`
- After every task: update `.ai-status.md` and sync `docs/DATA_CONTRACT.md` if any schema or DTO changed