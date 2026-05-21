# Embassy Events Review — Feature Brief

## 1. Goal & motivation

**The problem.** Plano's `events` table is currently fed by manual submissions — anyone can submit one via `/events/submit`, but the chapter ambassadors who actually know their local scene have no surface that pushes new events at them. Events organised by local universities, galleries, architecture festivals, and lecture series rarely make it onto Plano unless someone happens to know about them and chooses to submit.

**The solution.** Add a recurring, AI-driven "events scout" that runs in the background per chapter:

1. Searches the public web (via serper.dev) for architecture-related events in the chapter's locality.
2. Uses Claude to extract structured event data (title, dates, location, description, source URL) from the SERP results.
3. Deduplicates against the existing `events` table so already-catalogued events aren't re-surfaced.
4. Stages the survivors in a review queue inside the Embassy Contribute page.
5. Lets any active ambassador in the chapter inspect, edit, and **publish** an event (which inserts a real row into `events` with the chapter's locality scope) — or **discard** it.

**Trigger model.** The search runs opportunistically — any ambassador opening any `/embassy/*` page pings a server-side endpoint, which checks the chapter's `last_event_search_at` and either runs the search (if stale by > 4 days) or no-ops. There is no cron; the visit *is* the cron. The 4-day gate is enforced server-side so concurrent ambassador visits collapse to one search call.

**Cost control.** Serper + Claude calls are gated by the 4-day window, so a 50-chapter programme costs at most ~12 searches per chapter per year — bounded, predictable.

**Definition of done.** An ambassador opens `/embassy/contribute`, sees a new "Events" tool card, clicks it, sees a list of AI-discovered events for their chapter, edits one in-line, clicks "Publish", and that event appears on `/architecture/{cc}/{city}/events` (or wherever the locality-scoped events listing renders) within seconds. A second ambassador hitting `/embassy/goals` an hour later does *not* trigger another search.

---

## 2. Background — what already exists

Read these before touching anything; they are the implementation templates.

| File | Why it matters |
|---|---|
| [src/features/embassy/pages/Contribute.tsx](src/features/embassy/pages/Contribute.tsx) | Hosts the tool-card grid and per-tool sub-pages. The new "Events" tool lives here. |
| [src/features/embassy/api/building-research.route.ts](src/features/embassy/api/building-research.route.ts) | The closest template — same shape (resource route, Anthropic call, structured-JSON extraction, RPC for write-back). Mirror its layout. |
| [src/features/embassy/api/taskFeed.ts](src/features/embassy/api/taskFeed.ts) | Reference for the moderation-style fetchers and approve/discard mutations. |
| [src/features/embassy/components/EmbassyLayout.tsx](src/features/embassy/components/EmbassyLayout.tsx) | Where the visit-side trigger hook is added. |
| [src/features/events/pages/SubmitEvent.tsx](src/features/events/pages/SubmitEvent.tsx) | Field-level reference for what an event needs to be a valid `events` row. |
| [supabase/migrations/20270844000000_add_events.sql](supabase/migrations/20270844000000_add_events.sql) | Canonical events schema and RLS — the publish RPC writes into this table. |
| [supabase/migrations/20270855000000_locality_07_events_locality.sql](supabase/migrations/20270855000000_locality_07_events_locality.sql) | `events.locality_id` / `country_code` / `city_slug` denorm pattern — publish must populate these. |
| [supabase/migrations/20271108000000_ambassador_building_research_rpc.sql](supabase/migrations/20271108000000_ambassador_building_research_rpc.sql) | RPC template — SECURITY DEFINER, ambassador scope guard, audit log row. |

### Rules to obey (non-negotiable)

- React 18 SPA + Vite + React Router v6. **Not Next.js** (despite the stale CLAUDE.md hint — the rule files and source are authoritative).
- TanStack Query for all server state; URL params for UI tab state.
- Supabase JS client in components is allowed, but **prefer service-layer functions** in `taskFeed.ts`-style modules.
- Design tokens only (`bg-brand-primary`, `text-text-primary`, `feedback-success`/`feedback-destructive`) — never raw Tailwind palette colors.
- Every new table gets RLS enabled with policies for every operation.
- Identity is derived server-side from `getUser()` — never trust a `user_id` from the client payload.
- Migrations only; **never** `supabase db push`. The user applies them manually in the Supabase SQL Editor.
- After every task that adds a table/column/RPC, log it in `docs/AI_STATUS.md` under `SCHEMA_DRIFT_LOG` or `Completed Tasks` and mark migrations "needs apply".

---

## 3. Slice plan

Five slices, each independently shippable. Slice 0 unblocks 1 and 3. Slice 1 unblocks 2 and 3. Slice 4 is verification.

| Slice | Theme | Touches DB | Touches Backend | Touches UI |
|---|---|---|---|---|
| 0 | Schema foundation | Yes | — | — |
| 1 | Search + dedup backend | RPCs only | Yes (resource route) | — |
| 2 | Visit-driven trigger | — | — | Yes (1 effect) |
| 3 | Events review UI | — | — | Yes (new tool) |
| 4 | Verification & spec sync | — | — | — |

---

## 4. [x] Slice 0 — Schema foundation

### Goal
One migration that creates the staging table, the run-history table, the stale-check column, the indexes, and the RLS policies. After applying, the rest of the feature has a place to live.

### Migration file
`supabase/migrations/20271140000000_embassy_event_discoveries.sql`

(`20271135000000` is the most recent applied; leave a small gap in case of hot-fix migrations in between.)

### Task 0.1 — `embassy_event_discoveries` table

Create the staging/review queue. Fields:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid PK default gen_random_uuid()` | |
| `chapter_id` | `uuid NOT NULL → ambassador_chapters(id) ON DELETE CASCADE` | |
| `locality_id` | `uuid NULL → localities(id) ON DELETE SET NULL` | |
| `title` | `text NOT NULL` | |
| `description` | `text NULL` | |
| `start_at` | `timestamptz NOT NULL` | |
| `end_at` | `timestamptz NULL` | |
| `address` | `text NULL` | |
| `lat` | `double precision NULL` | |
| `lng` | `double precision NULL` | |
| `external_link` | `text NULL` | Event organiser's page (where to RSVP). |
| `cover_image_url` | `text NULL` | If serper returned an image hit. |
| `source_url` | `text NOT NULL` | The SERP result Claude pulled the data from. |
| `snippet` | `text NULL` | Verbatim excerpt for ambassador to sanity-check. |
| `status` | `text NOT NULL CHECK (status IN ('pending','published','discarded'))` default `'pending'` | |
| `duplicate_of_event_id` | `uuid NULL → events(id) ON DELETE SET NULL` | Dedup hint, not authoritative. |
| `published_event_id` | `uuid NULL → events(id) ON DELETE SET NULL` | Set on publish. |
| `reviewed_at` | `timestamptz NULL` | |
| `reviewed_by` | `uuid NULL → profiles(id) ON DELETE SET NULL` | |
| `created_at` | `timestamptz NOT NULL default now()` | |

Add indexes on `(chapter_id, status, created_at DESC)` and `(duplicate_of_event_id) WHERE duplicate_of_event_id IS NOT NULL`.

### Task 0.2 — `embassy_event_search_runs` table

Audit history. Fields: `id`, `chapter_id` (FK CASCADE), `started_at` (default `now()`), `completed_at`, `status text CHECK (status IN ('running','success','failed'))`, `items_found integer`, `error text`. Index on `(chapter_id, started_at DESC)`.

### Task 0.3 — Stale-check column on `ambassador_chapters`

```sql
ALTER TABLE public.ambassador_chapters
  ADD COLUMN IF NOT EXISTS last_event_search_at timestamptz NULL;
```

Used by the visit trigger to decide "do I run the search?" without a join.

### Task 0.4 — RLS policies

Enable RLS on both new tables.

**`embassy_event_discoveries`:**
- `SELECT` — caller is active member of `chapter_id` (use existing `public._ambassador_can_access_chapter(p_chapter_id)` helper) OR caller is admin (`public.is_admin()`).
- `UPDATE` — same predicate. (Publish/discard go through RPCs but RLS must still allow the underlying row write.)
- `INSERT` — only via the search RPC, which runs SECURITY DEFINER. Restrict INSERT to admin only at the policy level so client code can't bypass.
- `DELETE` — admin only.

**`embassy_event_search_runs`:**
- `SELECT` — same active-member-or-admin predicate.
- `INSERT` / `UPDATE` / `DELETE` — admin only (writes happen via SECURITY DEFINER RPCs).

### Task 0.5 — Update `docs/AI_STATUS.md`

Add an entry under `Completed Tasks` and a one-liner under `CURRENT_ARCHITECTURE_SNAPSHOT`. Mark migration `20271140000000` as "needs apply in the Supabase SQL Editor."

### Task 0.6 — Update `docs/DATA_CONTRACT.md`

Add `embassy_event_discoveries` and `embassy_event_search_runs` to the Domain Entity Inventory. Note the new `ambassador_chapters.last_event_search_at` column under the chapters entry.

### Acceptance for Slice 0
- Migration file exists and is syntactically valid.
- Running it on a clean DB creates both tables, the column, all indexes, all policies — no errors.
- `docs/AI_STATUS.md` and `docs/DATA_CONTRACT.md` reflect the new entities.

---

## 5. [x] Slice 1 — Search & dedup backend

### Goal
A single resource route that, when invoked, runs the full pipeline: gate-check → serper → Claude → dedup → insert. Plus the two RPCs the UI will call to publish or discard a discovery.

### Files

- **New:** `src/features/embassy/api/event-search.route.ts`
- **New migration:** `supabase/migrations/20271141000000_embassy_event_search_rpcs.sql`
- **Modify:** `src/features/embassy/api/taskFeed.ts` (add fetch + mutation wrappers)

### Task 1.1 — Manual prereq notice

Output a short, prominent block at the top of the implementation summary instructing the user to add `SERPER_API_KEY` to their `.env.local` and to the Vercel project. The route must degrade gracefully when it's missing (return `503 { error: "Event search not configured" }`, do **not** create a run row).

### Task 1.2 — Build the route handler `event-search.route.ts`

Mirror the structure of `building-research.route.ts`. Action handler with Zod-discriminated body schema. Two actions:

**`{ action: "run", chapter_id, force?: boolean }`** — POST.

Pipeline:

1. `supabase.auth.getUser()` — 401 if missing. Never read `user_id` from the body.
2. SELECT from `ambassador_memberships` to confirm caller is `status='active'` in the given `chapter_id` — 403 if not.
3. SELECT `ambassador_chapters` row by `chapter_id` — read `locality_id`, `country_code`, `last_event_search_at`. If `locality_id IS NULL` (national chapter), return `{ ok: true, skipped: "no_locality" }`.
4. **Stale-check gate.** If `!force` and `last_event_search_at` is within 4 days, return `{ ok: true, skipped: "fresh", last_run_at }`. No serper call, no run row.
5. **`force` gate.** Only allow `force: true` if caller is `role IN ('exco','president')` — 403 otherwise.
6. SELECT locality `name`, `city_slug` for query construction.
7. INSERT a `embassy_event_search_runs` row with `status='running'`. Keep its `id` for later updates.
8. Read `SERPER_API_KEY` from env. If missing, mark run `failed` with `error='serper_not_configured'`, return 503.
9. **Serper call.** POST to `https://google.serper.dev/search` with body `{ q: '"architecture" OR "architectural" events ${locality.name} ${currentYear}', num: 20 }`, header `X-API-KEY`. 30s timeout. On non-2xx, mark run failed, return 502.
10. **Claude extraction.** Read `ANTHROPIC_API_KEY` (same env var as building-research; 503 if missing). Call `claude-sonnet-4-6` with `max_tokens: 4096` and a strict JSON extraction system prompt (template below). User content is the serialised serper response. **Do not** add the `web_search` tool — the SERP itself is the source.
11. Parse the returned JSON. Reject candidates where `start_at` parses to a date in the past relative to `now() - 1 day`.
12. **Dedup.** For each candidate, run a SELECT against `events` with predicates: `is_deleted = false`, `locality_id = chapter.locality_id`, `start_at BETWEEN candidate.start_at - interval '2 days' AND candidate.start_at + interval '2 days'`, and `lower(title) = lower(candidate.title)` OR (if `pg_trgm` is available) `similarity(title, candidate.title) > 0.6`. Attach `duplicate_of_event_id` to candidates that match.
13. **Bulk insert** into `embassy_event_discoveries` with `chapter_id`, `locality_id`, all the candidate fields, `status='pending'`, the `duplicate_of_event_id`. Skip candidates whose normalised (title, start_at) already exists as `status='pending'` for the same chapter.
14. UPDATE `ambassador_chapters.last_event_search_at = now()` for this chapter.
15. UPDATE the run row: `status='success'`, `completed_at=now()`, `items_found=<count inserted>`.
16. Return `{ ok: true, inserted, skipped, duplicates_flagged }`.

Errors are caught and converted into a `failed` row update + a non-200 response. The route is server-only — uses `createSupabaseServerClient(request, headers)`.

### Task 1.3 — System prompt for the Claude extraction

```
You are an architectural-events extractor. You are given a Google search result
payload (organic results, knowledge graph, related searches) and you must
extract ALL clearly described upcoming architecture events.

Return ONLY a JSON object — no markdown, no commentary:
{
  "events": [
    {
      "title": "string",
      "description": "string or null",
      "start_at": "ISO 8601 timestamp with timezone, e.g. 2026-06-04T18:00:00+02:00",
      "end_at":   "ISO 8601 timestamp or null",
      "address":  "street + city or null",
      "external_link": "the event organiser's canonical URL",
      "source_url":    "the SERP result URL where you found the event",
      "snippet":       "verbatim or near-verbatim excerpt (max 280 chars)"
    }
  ]
}

Rules:
- ONLY include events. Skip articles, news, retrospectives, calls for entries,
  podcast episodes, online courses, exhibitions with no end date, and
  permanent installations.
- Skip events older than today.
- If a result mentions multiple events, emit one object per event.
- If you cannot determine a real start_at with at least day precision, omit
  the event.
- If unsure, omit. Do not fabricate dates, addresses, or organisers.
- Return {"events": []} if no qualifying events are found.
```

### Task 1.4 — Register the route

Add the route in `react-router.config.ts` / `app/routes.ts` (whichever this project uses — check existing patterns; `building-research.route.ts` is already registered, mirror it). Path: `/api/embassy/event-search`.

### Task 1.5 — Migration `20271141000000_embassy_event_search_rpcs.sql`

Two `SECURITY DEFINER` functions, both `REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated`.

**`ambassador_publish_event_discovery(p_discovery_id uuid)`**

1. Resolve caller via `auth.uid()`.
2. SELECT discovery row; raise `discovery_not_found` if missing or `status != 'pending'`.
3. Check `_ambassador_can_access_chapter(discovery.chapter_id)`; raise `out_of_scope` otherwise.
4. SELECT locality `country_code`, `city_slug` from `localities`.
5. Generate a unique `slug` from the title (lower, kebab, append short hash if collision on `events.slug`).
6. INSERT into `events`: `title`, `description`, `slug`, `start_at`, `end_at`, `address`, `location` (use `ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` if both non-null), `external_link`, `cover_image_url`, `submitted_by_user_id = auth.uid()`, `is_self_hosted = false`, `claim_status = 'unclaimed'`, `locality_id`, `country_code`, `city_slug`. Capture the new `events.id`.
7. UPDATE discovery: `status='published'`, `published_event_id=<new id>`, `reviewed_at=now()`, `reviewed_by=auth.uid()`.
8. INSERT into `building_audit_logs` (or whatever this project uses for ambassador action audit — check `ambassador_apply_building_research`): `table_name='ambassador_publish_event'`, capture context for telemetry.
9. RETURNS the new `events.id`.

**`ambassador_discard_event_discovery(p_discovery_id uuid)`**

1. Resolve caller, check scope (same as above).
2. UPDATE discovery: `status='discarded'`, `reviewed_at=now()`, `reviewed_by=auth.uid()`.
3. RETURNS `void`.

### Task 1.6 — Service-layer wrappers in `taskFeed.ts`

Three new exports:

```ts
export type EventDiscovery = {
  id: string;
  chapter_id: string;
  locality_id: string | null;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  external_link: string | null;
  cover_image_url: string | null;
  source_url: string;
  snippet: string | null;
  status: 'pending' | 'published' | 'discarded';
  duplicate_of_event_id: string | null;
  duplicate_of_title?: string | null;  // joined on read
  duplicate_of_start_at?: string | null;
  created_at: string;
};

export async function fetchPendingEventDiscoveries(chapterId: string): Promise<EventDiscovery[]>
export async function publishEventDiscovery(discoveryId: string): Promise<string>  // returns new event id
export async function discardEventDiscovery(discoveryId: string): Promise<void>
```

`fetchPendingEventDiscoveries` queries `embassy_event_discoveries` filtered by `chapter_id` and `status='pending'`, ordered by `start_at ASC`, and does a FK-agnostic batched lookup for `duplicate_of_event_id` titles (the same pattern used in `AmbassadorCampaigns.tsx` for `chapter_projects` author usernames).

### Acceptance for Slice 1
- `POST /api/embassy/event-search` with a valid chapter, `force: true`, returns 200 with `inserted > 0` for a known active locality (test with the seed chapter for `London, GB` or similar — agent should pick a chapter that has a populated `locality_id`).
- A second call without `force` within 4 days returns `skipped: "fresh"`.
- Calling either RPC from the JS client with a wrong-chapter discovery returns `out_of_scope`.
- Calling `publish` on a `pending` discovery creates a new `events` row visible at the locality's events page.

---

## 6. [ ] Slice 2 — Visit-driven trigger

### Goal
Any ambassador opening any `/embassy/*` page silently triggers the search; the server's 4-day gate absorbs the storm of concurrent requests.

### Files
- **Modify:** [src/features/embassy/components/EmbassyLayout.tsx](src/features/embassy/components/EmbassyLayout.tsx)

### Task 2.1 — Add the trigger effect

After the membership query resolves, add a `useEffect` that:

1. Returns early if `!membership` or `membership.status !== 'active'` or `!membership.chapter_id`.
2. Returns early if the user is on `/embassy/welcome` (onboarding) — they shouldn't trigger search.
3. Uses a module-level `Set<string>` keyed by `chapter_id` as an in-tab cache so the same SPA session doesn't re-fire on every layout remount.
4. Issues a fire-and-forget `fetch("/api/embassy/event-search", { method: "POST", credentials: "include", body: JSON.stringify({ action: "run", chapter_id }), headers: { "content-type": "application/json" } })`.
5. Swallows all errors. This is a background opportunistic call — failures must be invisible to the UI.

### Task 2.2 — Document the trigger contract in code

Add a short comment above the effect explaining: "Server enforces the 4-day gate. This is opportunistic — never block the layout on it." No multi-line docstrings.

### Acceptance for Slice 2
- Opening `/embassy/contribute` while logged in as an active ambassador causes one network request to `/api/embassy/event-search`.
- Navigating within `/embassy/*` (e.g. to `/embassy/goals`) does not re-fire the request in the same tab.
- A user without an active membership does not fire the request.

---

## 7. [ ] Slice 3 — Events review UI

### Goal
A new tool card on `/embassy/contribute` that opens an "Events" review screen. Same shape as Moderation: tabs disabled for now (could be `Pending | Recently published` in a follow-up), per-row inline edit, Publish / Discard actions.

### Files
- **Modify:** [src/features/embassy/pages/Contribute.tsx](src/features/embassy/pages/Contribute.tsx)

### Task 3.1 — Add the new tool key

Extend `ToolType`:
```ts
type ToolType = "research" | "photography" | "outreach" | "curation" | "community" | "events" | null;
```

Add to `ALL_TOOLS`:
```ts
{
  key: "events",
  title: "Events",
  description: "Review architecture events found by AI in your locality. Edit details, publish, or discard.",
  icon: <CalendarClock className="h-6 w-6" />,
},
```

Import `CalendarClock` from `lucide-react`.

Add the conditional render:
```tsx
if (activeTool === "events" && chapterId) {
  return <EventsTool chapterId={chapterId} onBack={() => setActiveTool(null)} />;
}
```

### Task 3.2 — Build the `EventsTool` component

Inside the same `Contribute.tsx` file (matches the existing pattern — `DataResearchTool`, `CurationTool`, etc. live alongside the page).

Layout:

```
[← Back]  Events                          [Last searched: 3h ago]  [Search now]
                                                                    ↑ leadership only

3 events found · 1 possible duplicate

┌─────────────────────────────────────────────┐
│ [thumb]  Open House London — Battersea Tour │ ←── card
│          Sat 21 Jun 2026 · 10:00            │
│          Battersea Power Station, London    │
│          ⚠ Possible duplicate of            │
│            "Battersea Open House" (19 Jun)  │ ←── amber if duplicate_of_event_id
│          "...guided tour of the renovated   │
│           Boiler House with the lead arch.."│
│          [Source ↗]                         │
│                                             │
│          [Edit] [Discard]  [Publish event]  │
└─────────────────────────────────────────────┘
```

State:
- `useQuery` keyed `["embassy-event-discoveries", chapterId]` calling `fetchPendingEventDiscoveries(chapterId)`.
- `useMutation` for `publishEventDiscovery` — on success: toast.success("Event published"), `queryClient.invalidateQueries(["embassy-event-discoveries", chapterId])`.
- `useMutation` for `discardEventDiscovery` — same shape with `toast("Event discarded")`.
- `useMutation` for "Search now" — POSTs `{ action: "run", chapter_id, force: true }`. Disabled if not leader. On success: invalidate + toast.

Edit drawer: clicking `[Edit]` opens a `Sheet` (right-side) with controlled inputs for `title`, `description` (Textarea), `start_at` (datetime-local), `end_at` (datetime-local, nullable), `address`, `external_link`. Save button calls a new `updateEventDiscovery(id, patch)` service function (a plain `supabase.from('embassy_event_discoveries').update(...)` — UPDATE is allowed by RLS). On save: invalidate + close drawer.

### Task 3.3 — Empty, loading, error states

- Loading: 3× `Skeleton` cards (mirror `CurationTool`).
- Empty + no `last_event_search_at`: "Your first event search will run shortly — check back in a minute." (because Slice 2's trigger may not have completed yet on first visit).
- Empty + `last_event_search_at` present: "No new events found. Plano will check again in {N} days." Calculate N as `4 - daysSince(last_event_search_at)`.
- Error: red banner with `Try again` button calling `refetch`.

### Task 3.4 — "Last searched" pill

Show "Last searched: 3h ago" using `formatDistanceToNow(parseISO(last_event_search_at))`. The chapter's `last_event_search_at` should be returned by extending the existing `ambassador-membership` query in `Contribute.tsx` to also fetch `ambassador_chapters.last_event_search_at` (or by a small dedicated query — agent picks the cleaner option).

### Task 3.5 — Duplicate detection UI

When `duplicate_of_event_id` is non-null:
- Card border: `border-feedback-warning/40`.
- Inline amber banner with the duplicate event's title + start_at (fetched in `fetchPendingEventDiscoveries`'s batched lookup).
- Banner has a link to `/events/{duplicate_of_event_id}` (open in new tab).
- "Publish event" button copy changes to "Publish anyway" and gets a `variant="destructive-outline"` style.

### Task 3.6 — Accessibility & token compliance

- All colors via tokens (`bg-brand-primary`, `text-text-primary`, `feedback-success`, `feedback-warning`, `feedback-destructive`).
- Buttons use the Shadcn `Button` component, never raw `<button className="bg-...">`.
- Cards use `Card` / `CardContent`.
- Source link uses the `ExternalLink` icon from lucide.

### Acceptance for Slice 3
- Tool card appears on `/embassy/contribute` for any active ambassador.
- Clicking it shows the review queue, populated with whatever Slice 1 inserted.
- Editing a discovery, publishing, and discarding all round-trip correctly and update the list.
- A discovery marked as duplicate shows the amber banner with the linked existing event.

---

## 8. [ ] Slice 4 — Verification & spec sync

### Task 4.1 — Build / typecheck / lint
Run:
- `npx turbo run build`
- `npx turbo run typecheck`
- `npx turbo run lint`

Fix every failure before handing off. Do not ask the user to run these.

### Task 4.2 — Manual UAT script (record in summary)
Write a 6-line test plan the user can run on Vercel preview:
1. Log in as a chapter ambassador.
2. Visit `/embassy/contribute` — confirm "Events" card appears.
3. Open the Network panel — confirm one POST to `/api/embassy/event-search`.
4. Click "Events" — confirm pending discoveries render (or empty state if search still running).
5. Click "Edit" on one, change the title, save — confirm change persists.
6. Click "Publish" — confirm the event appears on `/architecture/{cc}/{city}` events listing.

### Task 4.3 — Update `docs/AI_STATUS.md`
- Add to `Completed Tasks`: a 3–4 line summary of what shipped, citing feedback id `bd9ec23f-3568-4d75-a860-d5a91f39f6db`.
- Update `CURRENT_ARCHITECTURE_SNAPSHOT` with the new Embassy Events tool.
- Mark migrations `20271140000000` and `20271141000000` as **needs apply in the Supabase SQL Editor**.

### Task 4.4 — Update `docs/DATA_CONTRACT.md`
Add entries for `embassy_event_discoveries`, `embassy_event_search_runs`, the `ambassador_chapters.last_event_search_at` column, and the two new RPCs (`ambassador_publish_event_discovery`, `ambassador_discard_event_discovery`).

### Task 4.5 — Generated types reminder
Note in the AI_STATUS update that `npm run gen-types` should be run after the migrations are applied. Until then, queries against the two new tables can cast `supabase` to `any`, following the existing precedent recorded in the drift log.

---

## 9. Out of scope (defer to future feedback)

- Cron-based scheduled refresh (current opportunistic trigger is sufficient).
- Event-image fetching/upload — `cover_image_url` is read-only from the SERP for now.
- Bulk publish / bulk discard buttons.
- Showing already-published discoveries in a "Recently published" tab.
- Multi-locality search for chapters whose territory spans several cities — first version uses the single `locality_id` on the chapter.
- Notifications to the wider chapter when a new discovery arrives.
- Localisation of the system prompt — English-only for v1.

---

## 10. Feedback id

This feature originates from user feedback `bd9ec23f-3568-4d75-a860-d5a91f39f6db` (submitted 2026-05-21, reporter @globetrotter_1968). Reference it in the final commit message and in the `Completed Tasks` entry of `docs/AI_STATUS.md`.

---

Ready for the agent to pick up at Slice 0. Want me to start the implementation now, or hold for review?