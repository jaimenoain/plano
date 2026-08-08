# Roadmap — UX Refinement Round (August 2026)

> Subsequent-mode roadmap generated from the owner's task list of 2026-08-05 (34
> prompts). Scope comes from that list, not the PRD, so tasks carry a `CSV ref:`
> field (prompt number, in list order) instead of a `PRD ref:`. Each prompt maps
> to exactly one task, with two exceptions: prompts #1 and #5 are merged into
> Task 1.1 (the same design change on two surfaces), and prompt #17 is split into
> Tasks 8.3–8.5 (too large for one run to build and verify green).
>
> One task = one branch = one PR. The executor works top to bottom, checks off
> each task's checkbox when its PR is ready to merge, and archives this file at
> close-out per `docs/EXECUTOR_PROMPT.md`.

## Phase 1 — Building detail page & drawer

> **Batch submission:** Submit Tasks 1.1 → 1.2 → 1.3 → 1.4 as a single sequential batch.

[x] Task 1.1 — My Status / My Rating redesign (page + drawer)

  Goal:            On the building detail page, integrate the "My Status" and
                   "My Rating" sections into one prominent, unmistakable block:
                   at a glance it must be clear whether the building is
                   untouched, saved, visited, or hidden, and what mark the user
                   gave it. The points are NOT ratings — they are Michelin-style
                   marks reserved for favourite buildings, so the design must
                   never read one dot as "1 out of 3"; present dots as an honour,
                   not a scale. Apply the same redesigned section to the building
                   detail drawer so both surfaces are visually and behaviourally
                   consistent. Status/mark changes save immediately and the
                   section reflects the new state without a page refresh.
  Scope boundary:  Visual/interaction redesign of the existing status and rating
                   features only — no new statuses, no changes to how marks are
                   stored, no schema changes. Overview-tab changes are Tasks 1.2
                   and 1.3.
  Dependencies:    None
  CSV ref:         #1, #5

[x] Task 1.2 — Overview tab empty-state copy

  Goal:            Replace the building detail Overview tab's "No photos yet"
                   empty state with copy that matches what the section actually
                   aggregates (e.g. "No reviews yet" / "No one has visited yet"
                   — pick the most accurate and inviting option and apply it).
  Scope boundary:  Copy and empty-state presentation only. Showing saved/visited
                   users when data exists is Task 1.3.
  Dependencies:    None
  CSV ref:         #12

[x] Task 1.3 — Overview tab shows saved/visited activity

  Goal:            The building detail Overview tab also surfaces users who
                   merely saved or visited the building (not only reviewers) —
                   design how this activity is shown (avatars, counts, or a
                   compact list) and implement it with real data.
  Scope boundary:  Overview tab only; no changes to the feed or notifications.
                   Respects existing privacy/RLS — only activity already visible
                   to the viewer elsewhere is shown.
  Dependencies:    1.2
  CSV ref:         #28

[x] Task 1.4 — Map tab scroll-vs-zoom fix

  Goal:            On the building detail page's Map tab, page scrolling no
                   longer turns into accidental map zooming. Decide the best UX
                   (e.g. click/tap-to-activate zoom, or Cmd/Ctrl+scroll to zoom
                   with a hint overlay) and implement it, covering both desktop
                   wheel and mobile touch behaviour.
  Scope boundary:  Building detail Map tab only — the main /map page and
                   collection maps keep their current full-interaction
                   behaviour.
  Dependencies:    None
  CSV ref:         #24

## Phase 2 — Credits

> **Batch submission:** Submit Tasks 2.1 → 2.2 → 2.3 → 2.4 → 2.5 as a single sequential batch.

[x] Task 2.1 — Fix person search in the Add credits drawer

  Goal:            The person dropdown in the "Add credits" drawer finds people
                   when typing their name. Investigate why the search returns
                   nothing (query, RPC, or filtering bug), fix it, and ship a
                   regression test.
  Scope boundary:  Search behaviour of the existing dropdown only — no form
                   redesign (that is Task 2.3).
  Dependencies:    None
  CSV ref:         #21

[x] Task 2.2 — Add and edit credits from the Credits tab

  Goal:            On the building detail page's Credits tab, an "Add credit"
                   button is available even when credits already exist, and each
                   existing credit can be edited. After a successful add or
                   edit, the drawer closes, a success toast appears, and the
                   credits list refreshes without a manual page reload.
  Scope boundary:  Entry points and edit capability only — the form's field
                   layout is Task 2.3, its defaults Task 2.4. Uses existing
                   credit mutations/permissions; no schema changes.
  Dependencies:    2.1
  CSV ref:         #20

[x] Task 2.3 — Simplified credits form (Person + Company first)

  Goal:            The credits form initially shows only the Person and Company
                   fields, with a "show more details" disclosure for the
                   remaining fields, to raise completion rates. Applies wherever
                   the form is used (add and edit).
  Scope boundary:  Form layout/progressive disclosure only — no changes to
                   which fields exist or how credits are stored. Pre-population
                   logic is Task 2.4.
  Dependencies:    2.2
  CSV ref:         #13

[x] Task 2.4 — Smart defaults for Credit tier and lead checkbox

  Goal:            When adding the first credit for a given Role on a building,
                   the form pre-populates Credit tier = "Primary" and ticks
                   "Lead for this role on this building"; when a primary lead
                   already exists for that role, it pre-populates
                   tier = "Contributor" with the checkbox unticked. Refine this
                   logic if a more intuitive behaviour emerges during
                   implementation — the goal is that the common
                   add-the-architect case needs no extra clicks.
  Scope boundary:  Default values only — users can always override them. No
                   changes to validation or storage.
  Dependencies:    2.3
  CSV ref:         #22

[x] Task 2.5 — Credits section on the Edit building page

  Goal:            The "Edit building" page gains a credits section (reusing
                   the simplified form/flow from Tasks 2.2–2.4), so users who
                   click "Edit" to add an architect find it there. Changes made
                   in this section save via the existing credit mutations and
                   reflect immediately on the page.
  Scope boundary:  Adds the section and wires the existing flow — does not
                   redesign the rest of the Edit building page (that is
                   Task 3.2).
  Dependencies:    2.3, 2.4
  CSV ref:         #14

## Phase 3 — Edit building

> **Batch submission:** Submit Tasks 3.1 → 3.2 as a single sequential batch.

[x] Task 3.1 — Address-only edits enable "Update building"

  Goal:            On the Edit building page, editing only the address (e.g.
                   toggling "approximate location" or moving the pin) enables
                   the "Update building" button. Investigate the dirty-state
                   tracking, fix it, and add a regression test.
  Scope boundary:  Dirty-state/enable logic only — no visual redesign (that is
                   Task 3.2).
  Dependencies:    None
  CSV ref:         #23

[x] Task 3.2 — Edit Building design refresh + responsive pass

  Goal:            Refresh the Edit building page so its sections are clearly
                   distinguishable (e.g. larger sub-headers, clearer grouping)
                   and the page is optimised for all screen sizes — desktop
                   first (its primary context) but fully usable on mobile.
  Scope boundary:  Layout, hierarchy, and responsiveness of the existing page
                   (including the credits section from Task 2.5) — no new
                   fields or behaviour changes.
  Dependencies:    2.5, 3.1
  CSV ref:         #15

## Phase 4 — Map & search

> **Batch submission:** Submit Tasks 4.1 → 4.2 → 4.3 as a single sequential batch.

[x] Task 4.1 — SERP list matches the visible map

  Goal:            On the search page and the collection detail page, the SERP
                   list shows exactly the items within the visible map viewport.
                   Investigate the mismatch (bbox vs. list query drift,
                   padding/debounce, or clustering differences), fix it on both
                   surfaces, and add tests covering the viewport↔list contract.
  Scope boundary:  List/viewport consistency only — no ranking or filter
                   changes. Cluster visuals are Task 4.3.
  Dependencies:    None
  CSV ref:         #2

[x] Task 4.2 — "No buildings in this area" notice refinement

  Goal:            The empty-area notice on the map no longer nags while
                   panning: it appears only after a short settle delay (~1s),
                   gains a dismiss "X" that suppresses it for 24 hours
                   (persisted client-side), and clicking "Zoom out" keeps the
                   notice mounted while zooming — it must not flash away and
                   reappear when the wider view is still empty. Use best
                   judgement on the final UX details.
  Scope boundary:  The notice component and its show/hide logic only — no
                   changes to the underlying data fetching.
  Dependencies:    None
  CSV ref:         #3

[x] Task 4.3 — Cluster colour reflects its highest-rated pin

  Goal:            On the collection detail map, a cluster circle takes its
                   colour from the highest-rated pin it contains (e.g. a cluster
                   holding a black pin renders black), so cluster design
                   reflects its content. Behaviour is fully consistent with the
                   search page map, implemented via shared components so the two
                   surfaces cannot drift.
  Scope boundary:  Cluster visual derivation only — clustering algorithm,
                   counts, and click behaviour unchanged. Individual marker
                   colour/size customisation is Task 5.8.
  Dependencies:    4.1
  CSV ref:         #18

## Phase 5 — Collections

> **Batch submission:** Submit Tasks 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 → 5.8 → 5.9 as a single sequential batch.

[x] Task 5.1 — "Open collection" link after adding a building

  Goal:            When a building is added to a collection from any surface
                   other than that collection's own page, the confirmation shows
                   an "Open collection" link (e.g. below the collection name)
                   that navigates to the collection detail page.
  Scope boundary:  The add-to-collection confirmation UI only; no change to the
                   add flow itself.
  Dependencies:    None
  CSV ref:         #4

[x] Task 5.2 — Undo for collaboration requests

  Goal:            After requesting to collaborate on a collection, the user can
                   undo for a few seconds (e.g. the button becomes "Requested —
                   Undo" or a toast with Undo appears). Undo withdraws the
                   request cleanly: the owner receives no notification for an
                   undone request, or any already-created notification is
                   removed.
  Scope boundary:  The request/undo interaction only — the owner's
                   approve/decline flow is unchanged.
  Dependencies:    None
  CSV ref:         #8

[x] Task 5.3 — Collaborators tab shows the owner

  Goal:            In the Collection Settings drawer's Collaborators tab, the
                   collection owner appears in the list, labelled "Owner" (or
                   "Creator"), above the collaborators.
  Scope boundary:  Display only — no permission changes; the owner row exposes
                   no remove/demote actions.
  Dependencies:    None
  CSV ref:         #11

[x] Task 5.4 — Collection detail defaults to List on mobile

  Goal:            Opening a collection detail page on a mobile viewport shows
                   the List view by default (desktop default unchanged). An
                   explicit view choice in the URL or by user interaction still
                   wins.
  Scope boundary:  Default-view selection only — no changes to the views
                   themselves.
  Dependencies:    None
  CSV ref:         #16

[x] Task 5.5 — Member Ratings: creator in filter + top-rating display

  Goal:            In the Collection Settings drawer's Markers tab, with "Member
                   Ratings" selected: (1) the Member Filter includes the
                   creator, not just collaborators; (2) a new toggle
                   "show the building's top rating" makes SERP results display
                   the top rating with the rater's name (e.g. "jaimenoain:
                   Masterpiece ●●●"). Settings persist with the collection's
                   existing map-settings storage.
  Scope boundary:  Member Ratings mode only — other categorization methods are
                   Task 5.8.
  Dependencies:    None
  CSV ref:         #19

[x] Task 5.6 — Map View: obvious selected state for Show-by options

  Goal:            In the Collection Settings drawer's Map View tab, with "Show
                   Saved Places" active, the selected "Show by list" / "Show by
                   rating" option is unmistakably distinct from the unselected
                   one (per design tokens — stronger fill/ring, not a subtle
                   tint).
  Scope boundary:  Selected-state styling only; no behaviour changes.
  Dependencies:    None
  CSV ref:         #30

[x] Task 5.7 — Map View: filters for "Show All Buildings"

  Goal:            In the Map View tab, activating "Show All Buildings" offers
                   filters analogous to the Saved Places ones: a quantity filter
                   (All / Top 20 / Top 10 …), a century/era filter, and — if it
                   fits cleanly — access to the standard building filters.
                   Decide the best UX, design it, and build it; filters persist
                   with the collection's map settings.
  Scope boundary:  Show All Buildings mode only. Reuses existing map-data RPCs
                   and the standard filter model where possible; any RPC
                   extension needed ships in this task's migration with no new
                   tables (so no new RLS).
  Dependencies:    5.6
  CSV ref:         #31

[x] Task 5.8 — Markers: colour and size per categorization method

  Goal:            In the Markers tab, every Categorization Method lets the user
                   set marker colour and size — Uniform gets one colour+size;
                   Personal Status gets colour+size per Visited/Pending/
                   Unvisited; and so on for each method — with sensible
                   pre-set defaults so nothing is required. Settings persist and
                   the map re-renders live as they change.
  Scope boundary:  Extends the existing custom-colour mechanism to all methods
                   and adds size. Cluster colour derivation (Task 4.3) picks up
                   these colours automatically; no other map behaviour changes.
  Dependencies:    5.5
  CSV ref:         #32

[x] Task 5.9 — Better icons for "Other markers"

  Goal:            Review how "Other markers" (non-building places, e.g. an
                   airport currently shown as a bus) get their icon; improve the
                   place-type→icon mapping so common types (airport, station,
                   park, museum, hotel, restaurant…) get an apt icon, with a
                   sensible fallback.
  Scope boundary:  Icon mapping only — no changes to how other markers are
                   added or stored.
  Dependencies:    None
  CSV ref:         #34

## Phase 6 — Feed, notifications & social

> **Batch submission:** Submit Tasks 6.1 → 6.2 → 6.3 as a single sequential batch.

[x] Task 6.1 — "My map" feed-sidebar widget redesign

  Goal:            Replace the pixelated, hard-to-read "My map" widget in the
                   feed's right sidebar with a design people understand at a
                   glance — e.g. a lightweight labelled world/continent map used
                   as a heatmap of the user's buildings, or a clearer
                   alternative. Rethink the feature, pick the best low-cost
                   approach, and implement it with real user data.
  Scope boundary:  The sidebar widget only — the full /map experience is
                   untouched. No new heavy map dependency without an ADR.
  Dependencies:    None
  CSV ref:         #6

[x] Task 6.2 — "People to follow" design refinement

  Goal:            Refine the design of the "People to follow" section in the
                   feed's right sidebar: cleaner layout, clear follow action and
                   followed-state feedback, consistent with the entity
                   primitives used elsewhere.
  Scope boundary:  Presentation and interaction polish only — the suggestion
                   logic/data source is unchanged.
  Dependencies:    None
  CSV ref:         #7

[x] Task 6.3 — Notifications bell indicator fix

  Goal:            The bell reliably indicates unread notifications. Audit the
                   unread count/badge pipeline (query, realtime/refresh
                   triggers, read-marking), fix whatever prevents the indicator
                   from showing, and add a regression test. If the feature turns
                   out to work correctly, document the conditions and improve
                   the indicator's visibility instead.
  Scope boundary:  The bell/unread indicator only — notification generation and
                   the notifications list page are unchanged.
  Dependencies:    None
  CSV ref:         #25

## Phase 7 — Embassy, admin & data

> **Batch submission:** Submit Tasks 7.1 → 7.2 → 7.3 → 7.4 as a single sequential batch.

[ ] Task 7.1 — embassy/goals dashboard actionability redesign

  Goal:            Resolve the disconnect on the embassy/goals dashboard where
                   items look actionable but aren't. Choose the stronger model —
                   (a) fully actionable items that open/edit directly from the
                   dashboard, or (b) an honest summary of nudges (open tasks,
                   start-here, …) with clear CTAs into the right section — or a
                   better third option, and implement it consistently across the
                   dashboard.
  Scope boundary:  The dashboard surface only — the underlying sections
                   (tasks, start-here, etc.) keep their own behaviour; the task
                   drawer itself is Task 7.2.
  Dependencies:    None
  CSV ref:         #27

[ ] Task 7.2 — embassy/tasks Task detail drawer refinement

  Goal:            Refine the Task detail drawer on the embassy/tasks page:
                   clearer hierarchy, obvious primary action, consistent tokens
                   and spacing, mobile-friendly.
  Scope boundary:  The drawer only — task data model and list unchanged.
  Dependencies:    7.1
  CSV ref:         #33

[ ] Task 7.3 — "Review & unify" merge page: field-level selection

  Goal:            The duplicate-building "Review & unify" page lets the admin
                   compose the merged record field by field (name from one
                   entry, address or year from the other…), instead of choosing
                   one whole entry. When a field is empty on one side and filled
                   on the other, the filled value is pre-selected. On merge, the
                   composed record is what survives, and the existing merge
                   invariants (ADR 0022: no circular merges, losing building
                   redirects everywhere) still hold.
  Scope boundary:  Field-level selection UI + passing the composed field set
                   through the existing merge flow. Extends `merge_buildings`
                   only as needed to accept chosen field values; no new tables
                   (so no new RLS).
  Dependencies:    None
  CSV ref:         #29

[ ] Task 7.4 — Reclassify imported people out of the companies table

  Goal:            The bulk architect/firm import put every entry into
                   companies. Run a one-off review of the companies database
                   using the Haiku model with batch processing (cost-efficient),
                   classify which entries are actually people, and update those
                   entries from company to person. Ship the classification
                   script in the repo, apply the reclassification to production
                   data after reporting the proposed change counts (and a sample)
                   to the owner in chat, and record the outcome in the PR.
  Scope boundary:  Classification and reclassification of existing rows only —
                   no importer changes, no schema changes. Ambiguous entries are
                   left as companies and listed in the PR for later review.
  Also do here:    Delete the "Listed as companies" fallback Task 2.1 added to
                   the credits Person box (ADR 0030) once people exist, and give
                   `CreditedEntitiesSelect` the same once-over. The production
                   evidence for the misfiled import is already recorded in
                   `docs/AI_STATUS.md` — no need to re-investigate.
  Dependencies:    None
  CSV ref:         #26

## Phase 8 — Holistic passes

> **Batch submission:** Submit Tasks 8.1 → 8.2 → 8.3 → 8.4 → 8.5 as a single sequential batch.

[ ] Task 8.1 — Navigation audit & adjustments

  Goal:            Analyse the app's whole navigation system — desktop top nav,
                   mobile nav, icons, the avatar sub-menu, footer links — decide
                   the optimal structure, and implement the adjustments in one
                   pass. Document the before/after rationale in the PR.
  Scope boundary:  Navigation chrome only — no page content changes, no route
                   renames without redirects.
  Dependencies:    None
  CSV ref:         #9

[ ] Task 8.2 — New-user empty states across the app

  Goal:            Walk the first-run experience: every screen/feature a fresh
                   account sees, and each one's empty state. Design the best
                   possible new-user UX per screen (inviting copy, clear first
                   action, no dead ends) and implement the refreshed empty
                   states, reusing the existing `EmptyState` primitive.
  Scope boundary:  Empty states and first-run presentation only — no onboarding
                   flow changes, no new features.
  Dependencies:    8.1
  CSV ref:         #10

[ ] Task 8.3 — Mobile UX review — Part 1 of 3: inventory + map/search/explore

  Goal:            Build the comprehensive screen inventory for the whole app
                   (committed as a working doc for Parts 2–3), then review and
                   fix the map, search, and explore surfaces on mobile: crammed
                   or overflowing text, wasted space, awkward layouts — refine
                   each screen until it looks fully professional.
  Scope boundary:  Mobile-viewport refinements only (base + `md:` overrides per
                   house convention); desktop layouts unchanged. Building
                   detail/collections are Part 2, feed/profile/settings Part 3.
  Dependencies:    8.1, 8.2
  CSV ref:         #17 (Part 1 of 3)
  Partial-until:   Task 8.5 — the inventory's remaining screens are reviewed in
                   Parts 2 and 3.

[ ] Task 8.4 — Mobile UX review — Part 2 of 3: building detail, collections, add/edit flows

  Goal:            Continue the mobile review from the Part 1 inventory across
                   building detail (page + drawer), collection pages and
                   drawers, and the add/edit building and credits flows, fixing
                   every identified refinement.
  Scope boundary:  Same as Task 8.3, for these surfaces.
  Dependencies:    8.3
  CSV ref:         #17 (Part 2 of 3)

[ ] Task 8.5 — Mobile UX review — Part 3 of 3: feed, profile, connect, notifications, settings

  Goal:            Complete the mobile review across the remaining inventory:
                   feed, user/person pages, connect, notifications, settings,
                   and any screens the inventory lists that Parts 1–2 didn't
                   cover. Close out the inventory doc with a covered/deferred
                   status per screen.
  Scope boundary:  Same as Task 8.3, for these surfaces (admin screens may be
                   deferred, as in the previous mobile pass — note any
                   deferrals in the inventory).
  Dependencies:    8.4
  Completes:       Task 8.3 (partial) — finishes the inventory's screen
                   coverage.
  CSV ref:         #17 (Part 3 of 3)

## Final UAT

[ ] Final UAT — UX Refinement Round

  [MANUAL TASK — the agent presents these checks to the human, collects the
  results in chat, and marks this task complete. Once it is checked off, the
  UX Refinement Round (Phases 1–8) is complete; the roadmap continues with
  the Contributor Acknowledgements phases below.]
  Estimated time: 10 minutes (9 checks × ~45s, rounded up to nearest 5)

  Sign in before starting. Test on the live production site; do the mobile
  checks on your phone.

  ── If a check fails ──────────────────────────────────────────────────
  Report it in chat in plain language:
    "Final UAT: [describe what you saw vs. what you expected]"
  The agent fixes it (new branch + PR) and asks you to re-check. The agent
  marks this task complete only when every check is passing or explicitly
  deferred with a reason noted.
  ──────────────────────────────────────────────────────────────────────

  ### Look & feel
  - Open a building you have visited and marked: is your status and your mark
    unmistakable at a glance, and do the dots read as an honour rather than a
    score? Check the same section in the drawer from the map.
  - Open the Edit building page on desktop and on your phone: are the sections
    clearly distinguishable and nothing cramped?
  - Open the feed: do the redesigned "My map" widget and "People to follow"
    section look clear and worth having?

  ### Key journeys
  - Add an architect to a building via the Credits tab: does the simplified
    form feel quick, and are the tier/lead defaults right?
  - On a collection map, check a cluster containing one of your top-marked
    buildings: does the cluster colour reflect it, consistently with the
    search map?
  - In Collection Settings, set custom marker colours and sizes for a
    categorization method and confirm the map updates as you'd expect.
  - Pan the map across an empty area: does the "No buildings" notice stay
    politely out of the way, and does "Zoom out" behave without flashing?

  ### Mobile pass
  - On your phone, walk through: feed → search → a building → one of your
    collections → your profile. Report anything crammed, overflowing, or
    unpolished.
  - Still on the phone, open a collection: does it start in List view, and is
    the navigation comfortable throughout?

  When you have been through every check, reply with the results.

---

# Contributor Acknowledgements (added 2026-08-05)

> Phased build plan for the contributor-acknowledgements feature, from the
> strategic proposal approved by the owner in chat on 2026-08-05. These
> phases follow the UX Refinement Round above and share its conventions
> (one task = one branch = one PR, executor works top to bottom, batch
> submission per phase). Tasks carry no CSV ref — scope comes from the
> proposal, restated in full in each task so no chat context is needed.
>
> Binding design decisions for every task below:
>
> - **Badges are derived, never granted.** They recompute from live,
>   moderation-surviving data. Content removed by moderation stops counting
>   and badges downgrade silently on the next recompute — no manual revoke
>   step exists, and losing a tier never notifies.
> - **No recognition for raw building edits.** Building edits are direct and
>   unreviewed today, so edit-count badges would invite fabricated changes.
>   Edit/correction recognition is explicitly deferred (see the Deferred
>   list) until a suggest-edit or review mechanism exists.
> - **Corrections never transfer recognition.** A user correcting data
>   changes the data, nothing else; recognition moves only when a moderator
>   confirms a removal (which flows through the recompute automatically).
>   There is no "corrector" badge.

## Phase 9 — Building-page recognition

> **Batch submission:** Submit Tasks 9.1 → 9.2 as a single sequential batch.

[ ] Task 9.1 — Per-building contributor surfaces

  Goal:            The building detail Overview tab shows a quiet attribution
                   line — "Added to Plano by @username · <month year>" (from
                   the building's creator; omitted when unknown) — and the
                   existing "Community contributors" grid (already built but
                   mounted nowhere) renders at the bottom of the Overview
                   tab, each contributor linking to their profile. The "Page
                   contributors" rail module appears on all tabs instead of
                   only Credits. Contributor roles keep their current
                   text-label presentation ("First photos", "Top
                   photographer", …) — contextual honours, deliberately not
                   badges.
  Scope boundary:  Surfaces the existing per-building contributor roles only
                   — no new roles, no badges, no schema changes. New UI goes
                   in extracted components (the building details page is at
                   its frozen line cap). The contributor queries may be
                   consolidated into one RPC for performance, but no new
                   tables (so no new RLS).
  Dependencies:    None

[ ] Task 9.2 — Attribution privacy opt-out

  Goal:            A profile setting lets a user decline public attribution.
                   When enabled, their name and avatar are omitted from all
                   public contributor surfaces (building attribution line,
                   contributors rail/grid, locality "Who knows" lists) while
                   their contributions still count privately toward their own
                   stats and future badges. Mirrors the existing collections
                   "show who added this" precedent.
  Scope boundary:  The setting, its storage (one migration), and the read
                   paths that must respect it. Collections keep their own
                   per-collection attribution toggle.
  Dependencies:    9.1

## Phase 10 — Contributor badges

> **Batch submission:** Submit Tasks 10.1 → 10.2 → 10.3 as a single
> sequential batch.

[ ] Task 10.1 — Badge ledger, recompute, and profile badge row

  Goal:            Four badge families, three tiers each, earned from
                   lifetime totals of live content: Founder (buildings added
                   — 1/10/50), Photographer (photos — 5/50/250), Reviewer
                   (written reviews — 3/25/100), Historian (architect/firm
                   credits linked — 5/25/100). Calibrate the final thresholds
                   against production data before shipping: tier I must be
                   achievable in a first session, tier III genuinely rare.
                   Storage is a thin ledger (user, badge key, tier, earned
                   date) plus one idempotent recompute routine modelled on
                   the ambassador-milestones sync: it evaluates from live,
                   moderation-surviving data, awards AND downgrades, and
                   returns progress. Recompute runs on the user's own profile
                   visit and after their own contribution events — never on
                   other users' page views. The profile hero renders earned
                   badges beside the existing ambassador/verified-architect
                   badges: small monochrome glyphs with tier marked I/II/III
                   per design tokens (editorial, not bronze/silver/gold
                   medals); tapping opens a sheet listing all badges, earned
                   and locked, with progress toward the next tier.
  Scope boundary:  No edit-count badges (deliberately excluded — see the
                   binding decisions above). Only moderation-surviving
                   content counts (credits: active or verified status).
                   Notifications are Task 10.3; the public contributions
                   list is Task 10.2.
  Dependencies:    None

[ ] Task 10.2 — Contributions on the profile

  Goal:            The profile stats band gains a "Contributions" cell, and a
                   new profile section lists the user's contributions
                   (buildings added, photos, reviews, credits linked) with
                   links to each building — the transparency layer showing
                   what earned the badges. Needs a new public-safe
                   server-side query: the existing ambassador impact stats
                   are self-scoped and the audit log is admin-only, so
                   neither can be exposed as-is.
  Scope boundary:  Read-only display plus the query that powers it — no
                   changes to how contributions are recorded.
  Dependencies:    10.1

[ ] Task 10.3 — Badge-earned notifications

  Goal:            Earning a badge tier notifies the user exactly once,
                   following the existing milestone pattern (the same
                   conflict-guarded insert that stamps the ledger creates the
                   notification; badge details travel in notification
                   metadata). Badge news joins the existing weekly digest
                   email; there is no per-badge email. Losing a tier is
                   always silent.
  Scope boundary:  One new notification type end-to-end (in-app rendering,
                   digest inclusion, notification-preference respect) — no
                   other notification changes.
  Dependencies:    10.1

## Phase 11 — Integrity & reporting

> **Batch submission:** Submit Tasks 11.1 → 11.2 as a single sequential batch.

[ ] Task 11.1 — Reporting open to all users

  Goal:            Any signed-in user can report a photo, video, or building
                   from the building page (credits already have public
                   flagging), reusing the existing reports pipeline and
                   reason lists; reports land in the existing admin
                   moderation queue. The ambassador flagging surface is
                   unchanged.
  Scope boundary:  Report-submission entry points only — report handling
                   stays manual; no automated sanctions of any kind.
  Dependencies:    None

[ ] Task 11.2 — Moderation-aware recompute + repeat-offender view

  Goal:            When moderation removes or hides content, the affected
                   user's badges recompute promptly and downgrade silently.
                   A new admin view lists users with repeated upheld reports
                   in the last 90 days and offers one manual control: freeze
                   an account's badge computation (further sanctions stay
                   with existing admin tooling — nothing automated). Reminder
                   of the binding rule: user-made corrections never move
                   recognition; only moderator-confirmed removals do.
  Scope boundary:  Recompute triggers, the admin view, and the freeze flag —
                   no automated banning, no thresholds that act on their own.
  Dependencies:    10.1, 11.1

## Deferred — explicitly not scheduled

- Edit/correction recognition, and a possible Cartographer (locations / map
  fixes) badge family — blocked until building edits gain a
  suggest-and-approve or review mechanism; revisit after Phase 11.
- Unifying Embassy ambassador milestones with these public badges — the two
  systems stay separate for now, but their numbers must be computed from the
  same definitions so an ambassador's counts never disagree between the
  Embassy impact page and the public profile.

## Final UAT — Contributor Acknowledgements

[ ] Final UAT — Contributor Acknowledgements

  [MANUAL TASK — the agent presents these checks to the human, collects the
  results in chat, and marks this task complete. This is the roadmap's last
  task; once it is checked off, the roadmap is complete.]
  Estimated time: 10 minutes (5 checks × ~2min)

  Sign in before starting. Test on the live production site.

  ── If a check fails ──────────────────────────────────────────────────
  Report it in chat in plain language:
    "Acknowledgements UAT: [describe what you saw vs. what you expected]"
  The agent fixes it (new branch + PR) and asks you to re-check. The agent
  marks this task complete only when every check is passing or explicitly
  deferred with a reason noted.
  ──────────────────────────────────────────────────────────────────────

  - Open a building you added to Plano: does the Overview show "Added to
    Plano by" with your name, and the Community contributors section at the
    bottom, with working profile links?
  - Open your profile: is the badge row visible next to your existing
    badges, and does tapping it show earned and locked badges with progress
    toward the next tier?
  - Upload enough photos to cross a Photographer threshold: do you receive
    exactly one notification, and does the new tier appear on your profile?
  - Turn on the attribution opt-out in settings: does your name disappear
    from the building-page contributor surfaces while your own profile
    stats stay intact?
  - Report a photo while signed in as a regular (non-ambassador) test user:
    does it appear in the admin moderation queue? Hide it as admin: does
    the uploader's photo count drop on their next profile recompute?

  When you have been through every check, reply with the results.
