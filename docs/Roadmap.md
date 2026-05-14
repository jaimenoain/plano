# Feed Redesign Roadmap

> **Audience.** This document is the working spec for an autonomous coding agent (Claude Code) tasked with rebuilding the feed feature. The human user is non-technical; the agent owns implementation decisions inside the constraints stated here. Where this document says "the agent decides," the agent decides — but it documents the decision in commit messages and PR descriptions.

> **Source of truth.** This roadmap implements [docs/FEED_REDESIGN_BRIEF.md](docs/FEED_REDESIGN_BRIEF.md). The brief defines the *why* and *what*; this roadmap defines the *how* and *in what order*. When the two conflict, the brief wins and the roadmap is updated. When this roadmap says "see brief §X," follow the link and read it before acting.

> **Predecessor.** The structure and conventions of this document mirror [docs/ROADMAP.md](docs/ROADMAP.md) (the Search Rebuild Roadmap), which has shipped successfully. Read its "Operating principles for the agent" first — most of them apply here verbatim.

---

## Background

### What we are replacing

The current feed page ([src/features/feed/pages/Index.tsx](src/features/feed/pages/Index.tsx)) is a strict reverse-chronological list assembled from three independent RPCs:

| RPC | Source file | Role |
|---|---|---|
| `get_feed` | `supabase/migrations/20260503000001_get_feed_rpc.sql` (latest: `20270895000000_fix_feed_rpcs_final.sql`) | Posts from followed users + own posts, reverse-chrono |
| `get_collections_feed` | `supabase/migrations/20270813000000_add_get_collections_feed.sql` | Curated collections, injected every ~4 social cards |
| `get_discovery_feed` / `get_suggested_posts` | `supabase/migrations/20260905000000_get_discovery_feed.sql` (latest tier-based: `20270867000000_discovery_feed_tiered_location.sql`) | Cold-start fallback for 0-follow users |

Cards are resolved into three layout types — text-only (A), text+media (B), media-only (C) — via [resolveCardType.ts](src/features/feed/utils/resolveCardType.ts), but they share a uniform card footprint. A separate [ColdStartFeed.tsx](src/features/feed/components/ColdStartFeed.tsx) is rendered for users with zero follows.

No ranking, no second-degree graph, no trending, no rotation tiers. See [§1.2 of the brief](docs/FEED_REDESIGN_BRIEF.md) for the four problems this rebuild addresses.

### The architectural break

The rebuild replaces **three sources × strict reverse-chronological order × two layouts (cold-start vs. social)** with **one ranked stream × one mosaic surface × source mix determined by graph size**. The single ranker described in [brief §4.2](docs/FEED_REDESIGN_BRIEF.md) is the heart of the change. Everything else is plumbing.

### Conventions to follow

All apply to every phase:

- **Migrations are append-only.** Use `YYYYMMDDHHMMSS_description.sql`. The latest migration as of this writing is `20270910000000_expand_admin_merge_functions.sql`; pick the next date forward. Never edit an existing migration.
- **RPC pattern.** `SECURITY DEFINER`, `SET search_path = public, extensions`, `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated`. Match the shape of the most recent feed RPCs in `supabase/migrations/`.
- **Services own all Supabase queries.** Components never call `supabase.from()` directly. Hooks call services or RPC wrappers.
- **Per [CLAUDE.md](CLAUDE.md):** no `getSession()`, only `getUser()`. No mock data. No raw Tailwind palette colors — use design tokens from [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md).
- **Tests required.** Vitest unit tests for new logic; updated tests for changed logic. Each phase adds at least one test that would fail if the phase were reverted.
- **Update [.ai-status.md](.ai-status.md) after each phase.** One entry per phase summarising what shipped and what's next.

---

## Operating principles for the agent

These apply to every phase. Re-read before starting each one.

1. **Each phase ships independently and leaves the app working.** Never end a phase with a broken state. If a phase needs to be split mid-flight, split it — but ship working code at every commit.
2. **Bias toward smaller PRs.** A phase may produce multiple PRs. One coherent change per PR.
3. **Preserve user-visible behaviour unless the phase explicitly changes it.** Don't sweep unrelated UI fixes into a feed PR. Note them for later.
4. **Every card has an attribution line.** From Phase 1 onward, no card lands in the feed without a one-line "why am I seeing this." This is the non-negotiable explainability constraint of the rebuild.
5. **The ranker is rule-based and inspectable.** No ML, no embeddings, no learned weights in any phase of this roadmap. Tuning is by hand. If the agent is tempted to add learned ranking, escalate to the human first.
6. **Diversity is enforced in application code, not SQL.** The ranker returns more candidates than the page needs; the application layer caps per-author and per-building counts when assembling the surface. This makes diversity policy easy to change without a migration.
7. **Feature flag the cutover.** Phases 1–3 ship behind a `feed_v2` flag (or whatever the codebase convention turns out to be — the agent picks one and is consistent). The old surface remains accessible until the new one passes acceptance for users at 0, 5, and 50+ follows.
8. **Document decisions in commit messages.** Where this roadmap says "the agent decides," explain the decision and tradeoffs in the commit body.
9. **When in doubt, prefer the simpler option.** The feed page has accumulated complexity. Resist adding capability "while you're in there."
10. **Read [docs/FEED_REDESIGN_BRIEF.md](docs/FEED_REDESIGN_BRIEF.md), [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md), and [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md) before changing data shapes or visuals. Update them when shapes or tokens change.**
11. **Checkpoint with the human at the end of every phase.** "PR merged, deploy verified, here's what Phase N+1 will do — ready to start?"

---

## [x] Phase 0 — Foundations & inventory (1–2 days)

**Goal:** Lay the groundwork that every later phase depends on, without changing any user-visible behaviour. By the end of this phase, the codebase has: an attribution component used by all existing cards, a unified card-source type definition, a shared seen-tracking hook, and a documented inventory of every feed-related RPC and component. No ranker yet. No surface changes.

This is the "buy credibility, reduce ambiguity" phase. It also forces the agent to read the existing feed thoroughly before changing anything substantive.

### What ships

A single PR titled `Phase 0: Feed foundations`. Touches a small number of files. No migrations.

### Tasks

1. **Inventory the current feed.**
   - Produce `docs/archive/feed_inventory.md` (one file) listing: every feed RPC, every hook in `src/features/feed/hooks/`, every component in `src/features/feed/components/`, and which ones are dead code (not imported anywhere).
   - This is for the agent's own reference and for the human's awareness. Two columns per row: what it does, and which phase will touch it.
   - **Acceptance:** the file exists and is accurate as of the PR. A grep proves the "dead code" entries are truly unimported.

2. **Introduce `<CardAttribution>` component.**
   - New file: `src/features/feed/components/card-parts/CardAttribution.tsx`.
   - Props: `{ kind: 'direct' | 'extended' | 'open' | 'editorial', text: string, icon?: ReactNode }`.
   - Rendered as a muted single line above or below the card media (the agent picks based on what reads well — match existing card layout).
   - Uses design tokens for muted text (see [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md)); no raw palette colors.
   - **Wire it into existing cards now**, with placeholder text derived from current data — for ring-1 (existing follows-feed cards) use `${user.name} · ${relativeTime(created_at)}`. This means today's feed gains attribution before the ranker exists. That's intentional; users see no visual change for the next two phases.
   - **Acceptance:** every card type in the existing feed renders an attribution line. Visual diff is minimal (the line was effectively already there in the form of a header — confirm we're not double-rendering).

3. **Define `FeedItem` discriminated-union type.**
   - New file: `src/types/feedItem.ts`.
   - Initial variants: `post`, `collection`. (Add `moment`, `building_spotlight`, `editorial`, `prompt` as later phases need them — Phase 0 only declares what exists today.)
   - Every variant carries: `id`, `ring: 'direct' | 'extended' | 'open' | 'editorial'`, `score: number` (default 0 until Phase 1), `attribution: { kind, text }`, plus variant-specific payload.
   - **The existing [src/types/feed.ts](src/types/feed.ts) is not deleted.** `FeedItem` is a new umbrella type that *wraps* existing types. The agent decides whether to alias or compose — whichever produces the smaller diff.
   - **Acceptance:** `FeedItem` compiles and is imported by at least the feed Index page (even if only used as a passthrough).

4. **Extract `useSeenItems` hook.**
   - Wraps the existing `track_note_views` RPC ([src/features/feed/utils/noteViewTracker.ts](src/features/feed/utils/noteViewTracker.ts)) plus an in-memory `Set<string>` of items the user has seen in the current session.
   - Exposes: `markSeen(id)`, `hasSeen(id)`, and a debounced flush to the RPC.
   - The ranker (Phase 1) consumes `hasSeen` for the `seen_penalty` signal.
   - **Acceptance:** existing view-tracking behaviour is unchanged; the hook is callable and has unit tests.

5. **Document the rebuild in [.ai-status.md](.ai-status.md).**
   - New section: "Feed Rebuild — In Progress." Note Phase 0 complete, link to brief and roadmap.

### Out of scope for Phase 0

- Any new RPC.
- Any ranking logic. The `score` field on `FeedItem` is declared but unused.
- Mosaic layout. Cards stay in the existing list layout.
- Removing `ColdStartFeed.tsx`. It stays as-is.
- Second-degree graph. Not touched.

### Risks

- **`<CardAttribution>` wiring could regress card layouts.** Mitigate with visual QA across all card types (A, B, C, cluster, collection) before merging.
- **The inventory file could be wrong** (dead code is sometimes used by route-level dynamic imports). The agent grep-verifies every "dead" entry.

---

## [x] Phase 1 — The ranker (3–5 days)

**Goal:** Replace `ORDER BY created_at DESC` with a real score across the existing ring-1 source. By the end of this phase, the feed renders the same content sources as today but in a ranked order. Cold-start fork stays. No mosaic layout. No new content types. This is the smallest possible "the ranker exists and works" slice.

### What ships

A new `get_feed_ranked` RPC, a `scoreFeedItem` utility on the client, an updated `useFeed` hook, and a feature flag (`feed_v2_ranker`) that switches between old and new behaviour. Map and other features untouched.

### Tasks

1. **Build `get_feed_ranked(p_limit int, p_offset int)` RPC.**
   - **Source set:** identical to today's `get_feed` (posts by followed users + own posts, same visibility rules).
   - **Returns:** same row shape as `get_feed` plus three new fields: `score double precision`, `ring text` (always `'direct'` in Phase 1), `freshness_hours double precision`. The agent picks the final column order to match the TS type.
   - **Scoring formula (Phase 1 starting point — the agent tunes):**
     ```
     freshness_decay   = exp(-ln(2) * hours_since_post / 36)         -- 36h half-life for ring 1
     engagement_velocity = (likes_count + 2 * comments_count) / GREATEST(1, hours_since_post)
     media_quality     = CASE
                           WHEN has_video THEN 1.6
                           WHEN image_count >= 3 THEN 1.4
                           WHEN image_count = 2 THEN 1.2
                           WHEN image_count = 1 THEN 1.0
                           ELSE 0.7  -- text-only
                         END
     score = freshness_decay
           * (1.0 + 0.5 * LEAST(engagement_velocity, 10))
           * media_quality
     ```
     The diversity penalty and seen penalty are applied in **application code**, not SQL (see Operating Principle #6).
   - **`SECURITY DEFINER`, `SET search_path = public, extensions`, `GRANT EXECUTE` to `anon, authenticated`.** Match `20270895000000_fix_feed_rpcs_final.sql`'s conventions exactly.
   - **No `architects` table reference.** Use `building_credits` joined to `people` / `companies` — match the pattern already used in `get_feed`.
   - **Pagination:** keyset on `(score DESC, id DESC)` to avoid the "items shift between pages" problem. The agent reads up on Supabase keyset patterns and picks the cleanest implementation; if offset-pagination is meaningfully simpler and acceptance still passes, that's allowed.
   - **Acceptance:**
     - A post with a video posted 2 hours ago by a followed user outranks a text-only post by the same user posted 2 minutes ago. ✅ (media quality + engagement)
     - A post posted 7 days ago outranks a post posted 8 days ago, all else equal. ✅ (freshness)
     - Two posts with identical signals have stable order across calls (deterministic tiebreaker). ✅
     - `EXPLAIN ANALYZE` shows the function returns 20 rows in under 100ms on the production dataset.

2. **TS wrapper.**
   - `getFeedRanked(opts: { limit?, cursor? }): Promise<FeedItem[]>` in `src/features/feed/api/getFeedRanked.ts` (new file).
   - Maps RPC rows to the `FeedItem` discriminated union from Phase 0.
   - **The attribution string is built here**, not in the RPC. Phase 1 attributions are simply `${author.name} · ${relativeTime}` for `ring='direct'`. (Later phases enrich.)

3. **`scoreFeedItem` client-side utility — diversity + seen penalty.**
   - New file: `src/features/feed/utils/scoreFeedItem.ts`.
   - Input: an array of items already scored by the RPC.
   - Output: a re-ranked array with:
     - **Diversity penalty:** items beyond the first by the same author get multiplied by 0.6, 0.36, 0.22… (decay 0.6^N). Same for items about the same building.
     - **Seen penalty:** items where `hasSeen(id)` returns true get multiplied by 0.3.
   - Pure function. Unit-tested with deterministic inputs.
   - **Acceptance:** given 5 candidates by the same author, the second and onward appear lower than candidates by other authors with similar raw scores.

4. **Refactor `useFeed` to use the ranker.**
   - When the `feed_v2_ranker` flag is on, call `getFeedRanked` then pass through `scoreFeedItem`, then render. Pagination semantics may differ slightly (cursor vs. offset) — the agent updates the hook accordingly.
   - When off, behaviour is identical to today.
   - The flag is read from a single helper (the agent picks the file — likely a new `src/features/feed/flags.ts`).

5. **Tests.**
   - SQL-level integration test for `get_feed_ranked`: produces ranked output with the expected ordering for a fixture dataset.
   - Unit test for `scoreFeedItem`: diversity and seen penalties apply correctly.
   - Hook test for `useFeed` under both flag states.
   - **Architectural regression test:** in flag-on mode, a video post 6 hours old by a followed user appears above a text-only post 5 minutes old by the same user.

6. **Manual QA checklist in PR description.**
   - Test as users with 0 follows, 5 follows, 50+ follows. Confirm flag-off behaviour is unchanged; flag-on behaviour produces a ranked, plausibly-ordered feed.

### Out of scope for Phase 1

- Collections feed is untouched. It still injects every ~4 cards via the existing path.
- Discovery feed is untouched. Cold-start users still see the existing `ColdStartFeed` layout.
- Second-degree graph. Not touched.
- Mosaic layout. Cards stay in the existing list layout.
- Attribution beyond "name · time."

### Risks

- **Ranking tuning is iterative.** Start with the formula above; expect to tune in Phase 2 once real users hit it. Build the formula so weights live in one place.
- **Keyset pagination across a non-monotonic score** is subtle if scores recompute per call. The agent decides between snapshotting scores per query (Postgres caches the function result for a single call, which is fine) vs. accepting some pagination drift. Document the choice.
- **The flag adds a code path that lives until Phase 3 retires the old one.** Keep both paths clean.

---

## [x] Phase 2 — Merge the three sources & retire the cold-start fork (3–5 days)

**Goal:** One ranked stream, three sources interleaved by the ranker. Cold-start page goes away. By the end of this phase, a user with 0 follows lands on the same `/feed` page as a user with 50 follows, with the source mix determined by graph size, not by a UI fork.

### What ships

A unified `get_feed_unified` RPC (or — the agent decides — three parallel RPC calls merged in JS). The `ColdStartFeed` page is retired. The `feed_v2_ranker` flag from Phase 1 expands in scope to cover the unified surface.

### Tasks

1. **Decide unification strategy.**
   - **Option A (server-side):** new `get_feed_unified(p_limit, p_offset)` RPC that internally queries the three sources, scores them with ring-aware weights, and returns a merged ranked list. One round-trip.
   - **Option B (client-side):** keep three RPCs (`get_feed_ranked`, `get_collections_feed`, `get_discovery_feed`), call them in parallel, merge in JS with ring weights applied client-side. Three parallel round-trips.
   - **Recommendation:** Option B is simpler to ship and tune; latency cost is acceptable because the RPCs are independent. **The agent picks Option B unless there's a clear blocker.** Document the decision.

2. **Add `ring` to `get_collections_feed` and `get_discovery_feed`.**
   - These RPCs gain a `ring text` column in their return shape.
     - `get_collections_feed`: `ring='direct'` if the collection's curator is followed; `'open'` otherwise. (The agent reads the RPC to confirm the curator column.)
     - `get_discovery_feed`: always `'open'`.
   - These are additive changes; the RPCs already return enough data. New migration adds the column.
   - **Acceptance:** clients ignoring the new column still work; clients reading it get sensible values.

3. **Ring-aware scoring in client merge.**
   - Extend `scoreFeedItem` to apply a ring multiplier:
     ```
     ring_multiplier = direct: 3.0
                     | extended: 1.5
                     | open: 1.0
                     | editorial: 2.0  (used in Phase 6; declared but unused now)
     score_final = score * ring_multiplier
     ```
   - The merge function takes three result arrays, concatenates, applies ring + diversity + seen penalties, sorts, returns the top N.
   - **Acceptance:** a 0-follow user's feed is ~85% ring-3 (open); a 50-follow user's feed is ~65% ring-1 (direct) with ring-3 as a floor. Numbers don't need to be exact — these are emergent from the formula.

4. **Retire `ColdStartFeed.tsx`.**
   - The Index page no longer branches on follow count. The same component renders for everyone; the merged stream handles the source mix.
   - Delete [src/features/feed/components/ColdStartFeed.tsx](src/features/feed/components/ColdStartFeed.tsx) and its associated styles. Verify no other file imports it.
   - The "feature buildings" panel that was inside `ColdStartFeed` is reborn as a **promotable card type in the unified stream**: `FeedItem` of variant `building_spotlight` (placeholder shell for Phase 5 — Phase 2 may just inject `featured_buildings` as plain `post`-shaped cards via the discovery feed, then Phase 5 promotes them to proper spotlights). The agent picks the lower-effort path.

5. **Add inline `prompt` card type.**
   - When the viewer has fewer than 5 follows, inject "Follow these 5 architects" / "Log your first visit" cards at a rate of roughly 1 in 6–8 items.
   - Backed by existing data: `PeopleYouMayKnow` already exists ([src/features/feed/components/PeopleYouMayKnow.tsx](src/features/feed/components/PeopleYouMayKnow.tsx)). Wrap it as a `FeedItem` of variant `prompt`.
   - **Acceptance:** a 0-follow user sees 1–2 follow prompts in their first page of feed; a 50-follow user sees none.

6. **Update the feature flag.**
   - `feed_v2_ranker` now covers both ranking *and* unification. Off → today's three-source list with cold-start fork. On → unified ranked stream with no fork.
   - Acceptance for flipping the flag to default-on: see [Definition of done](#definition-of-done-for-the-whole-rebuild) below. Don't flip until all green.

7. **Tests.**
   - Merge function with fixture data: produces correct ring distribution per graph size.
   - Hook test confirming `ColdStartFeed` is no longer rendered for 0-follow users when the flag is on.
   - Snapshot test (or visual diff) confirming the page layout is the same for users at 0 / 5 / 50 follows.

### Out of scope for Phase 2

- Mosaic layout (Phase 3).
- Real second-degree (ring 2) data (Phase 4) — ring 2 is *declared* but currently has no source feeding it.
- Building spotlights as a proper card type (Phase 5).
- Rotation tiers (Phase 6).

### Risks

- **Removing `ColdStartFeed` is a visible change.** A 0-follow user who used to see a curated onboarding now sees the unified stream. The unified stream must be visually adequate for that case before this phase ships. Use the QA checklist.
- **Three parallel RPC calls multiply latency exposure.** Add per-source error handling — one source failing should not blank the feed. If `get_discovery_feed` errors, render ring-1 + collections; if `get_feed_ranked` errors, render the other two with a non-blocking warning toast.
- **Pagination across three sources is awkward.** Phase 2 ships with "load 30 from each source on page 1, merge to top 20, infinite-scroll re-fetches each source." Not perfect but acceptable. Phase 5 may revisit.

---

## [x] Phase 3 — Masonry mosaic surface (5–7 days)

**Goal:** Replace the uniform list of cards with a tile-based grid where tile size is proportional to score. By the end of this phase, the feed visually looks like a gallery, not a microblog. This is the largest visual change in the rebuild.

### What ships

A new `<FeedMosaic>` component replacing the current `<ActivityStream>` layout. Existing card components are wrapped or refactored to render at multiple tile sizes. Video tiles auto-play in viewport.

### Tasks

1. **Tile-size tiers.**
   - Define four tile sizes in code: `xl` (2×2), `lg` (2×1 horizontal), `md` (1×1), `sm` (1×1 compressed text).
   - Assignment rule (the agent tunes — start with these constants):
     ```
     if video                     → xl
     else if score > 8.0          → xl
     else if score > 4.0 and media → lg
     else if media                → md
     else                          → sm (text-only)
     ```
   - The top-ranked item on page 1 is always `xl` regardless of score (anchor tile).
   - **Acceptance:** a representative test page renders a mix of sizes; the largest tile is always media-bearing.

2. **`<FeedMosaic>` component.**
   - New file: `src/features/feed/components/FeedMosaic.tsx`.
   - Three-column desktop (≥1024px), two-column tablet (≥640px), single-column mobile (<640px).
   - Single-column mode keeps the tile-size logic but expresses size as **vertical height** variation (xl = taller, sm = shorter), not horizontal span.
   - **Use CSS grid with `grid-auto-flow: dense`.** The agent decides whether to use a JS-based masonry library or CSS-only — strong preference for CSS-only unless a real packing issue emerges.
   - **Performance:** intersection-observer-based lazy loading for all images. Skeleton state per tile. Virtualization is **not** required for v1 (the current feed isn't virtualized either) but the agent confirms scroll perf is acceptable at 100 cards.
   - **Acceptance:** the mosaic renders smoothly at all three breakpoints; resizing the window reflows without layout thrash.

3. **Adapt card components to tile sizes.**
   - Existing `FeedCardA`, `FeedCardB`, `FeedCardC` ([src/features/feed/components/](src/features/feed/components/)) each gain a `tileSize` prop and adjust their internal layout accordingly. The agent reads each carefully and decides whether to extend or replace.
   - `FeedCardC` (media-only) at `xl` shows the photo edge-to-edge with a thin attribution strip overlaid at the bottom.
   - `FeedCardA` (text-only) at `sm` becomes a "pull-quote" card: large quoted text, building name, rating chip, no avatar grid.
   - **Acceptance:** every existing card type renders correctly at every tile size it can be assigned to (some combinations are illegal — e.g. text-only at `xl` should not happen; assert in code).

4. **Video tile behaviour.**
   - Auto-play muted on viewport entry; pause on exit (intersection observer).
   - On hover (desktop), show audio toggle.
   - On mobile, tap-to-play (sound-on) follows existing app convention — the agent verifies what that convention is by reading any current video components.
   - **Acceptance:** videos play smoothly without jank; the feed doesn't spawn five autoplay videos simultaneously (only the one currently most-in-viewport plays).

5. **Diversity policy in the mosaic.**
   - Application-side: after `scoreFeedItem`, the assembly function ensures adjacent tiles aren't from the same author or the same building. If a same-author-or-building pair would be adjacent, swap with the next item.
   - This is a layout concern, not a ranking concern; keep it in the layout layer.
   - **Acceptance:** no two adjacent tiles share an author or a primary building.

6. **Flip the `feed_v2_ranker` flag to default-on**, conditional on QA passing for users at 0, 5, and 50+ follows. The flag stays in the codebase for one release cycle as a kill switch.

7. **Tests.**
   - Tile-size assignment for various score / media combinations.
   - Diversity adjacency rule with fixture data.
   - Single-column mode renders without horizontal span logic.
   - Visual regression (Playwright screenshot or equivalent) for the three breakpoints.

### Out of scope for Phase 3

- Second-degree (ring 2) data source (Phase 4).
- Building spotlight card type (Phase 5).
- Rotation tiers (Phase 6).
- Moments clustering (Phase 7).

### Risks

- **CSS grid masonry across browsers is uneven.** Test on Safari, Firefox, and Chrome on desktop and mobile. If a real packing issue appears, fall back to a JS library — the agent picks (e.g. `react-masonry-css` is small and uncontroversial).
- **Mixed aspect-ratio media in a grid is visually unpredictable.** Crop to a fixed aspect per tile size (`xl` = 1:1, `lg` = 16:9, `md` = 4:5, `sm` = 1:1 for the quote-card). The agent picks ratios and documents.
- **Video autoplay can trigger browser block-on-autoplay rules.** Always start muted; respect user reduce-motion settings; provide visible play controls.

---

## [x] Phase 4 — Second-degree ring (3–4 days)

**Goal:** Add ring-2 candidates to the feed: posts liked or saved by users the viewer follows. By the end of this phase, a user sees content from outside their direct graph attributed as "Liked by Anna, who you follow." This is the discovery primitive that makes the feed valuable for users with sparse-to-moderate graphs.

### What ships

A new `get_feed_extended` RPC, a new ring-2 source in the client merge, and ring-2 attribution strings.

### Tasks

1. **Build `get_feed_extended(p_limit int, p_offset int)` RPC.**
   - **Source set:** `building_posts` where:
     - The post's `user_id` is **not** in the viewer's `follows`.
     - The post has at least one like (or save — the agent confirms which engagement signals are available; `review_likes` is the primary one) from a user the viewer follows.
     - The post is public (`visibility != 'contacts'` OR... the agent confirms the privacy rule by reading `get_feed`'s visibility logic).
   - **Returns:** same shape as `get_feed_ranked` plus `endorsed_by_user_id uuid` and `endorsed_by_user_data jsonb` (the ring-1 user whose engagement surfaced this item). If multiple ring-1 users endorsed it, pick the most-recent.
   - **Ring:** always `'extended'`.
   - **Score:** computed by the RPC same way as `get_feed_ranked` but with a longer freshness half-life (~7 days) — ring-2 content is less time-sensitive.
   - **Acceptance:** for a viewer following A, B, C, the RPC returns posts not authored by A/B/C but liked by at least one of them.

2. **Wire ring-2 into the client merge.**
   - Fourth parallel RPC call in `useFeed`. Same merge logic; the `ring='extended'` items get multiplier 1.5.
   - Pagination same shape as the others.
   - Per-source error handling: ring-2 failing must not blank the feed.

3. **Ring-2 attribution.**
   - Attribution string: `Liked by ${endorsedBy.name}, who you follow`. If two ring-1 users endorsed the item, pluralise: `Liked by ${a.name} and ${b.name}`. If three or more: `Liked by ${a.name} and ${n - 1} others you follow`.
   - The agent reads the brief's §5.3 again to confirm tone — friendly, not surveillance-y.
   - **Acceptance:** every ring-2 card carries a "Liked by X" attribution; the X is a real follow.

4. **Privacy guardrails.**
   - `visibility = 'contacts'` posts must **never** appear in ring 2 — they are by definition not shareable outside the author's direct graph.
   - Posts where the endorser has hidden their likes (if such a setting exists — the agent confirms) are excluded.
   - **Acceptance:** create a contacts-only test post liked by a followed user; verify it does *not* appear in the viewer's ring 2.

5. **Tune ring-2 share.**
   - After this phase ships, ring-2 share for mid-graph users should be ~15–20% per the brief's §7 mix table. If the share is wildly off, tune the multiplier (currently 1.5) before declaring done.

6. **Tests.**
   - RPC: posts authored by followed users are excluded; posts liked by followed users are included.
   - Privacy: contacts-only posts are filtered.
   - Attribution string handles 1, 2, 3+ endorsers.
   - Mix produces ring-2 share in the target range for mid-graph users.

### Out of scope for Phase 4

- Building spotlights (Phase 5).
- Saved-buildings or attended-events as ring-2 signals (deferred; only likes used in this phase).
- "Posts in localities your follows have been active in" — the alternate ring-2 source mentioned in the brief. Deferred to a follow-up.

### Risks

- **Performance.** The ring-2 join (`building_posts × review_likes × follows`) can be expensive without the right indexes. The agent runs `EXPLAIN ANALYZE` and adds indexes if needed. Likely `review_likes(user_id)` and `review_likes(review_id)` both need to be indexed — confirm and add migrations as required.
- **"Why is this in my feed?" privacy concern.** The attribution mitigates it but doesn't eliminate it. If user feedback after launch is negative, the agent flags it to the human; possible mitigation is to limit ring 2 to *public* likes only (likes already exposed on profile pages).

---

## [x] Phase 5 — Building spotlights (3–4 days)

**Goal:** Introduce the building-as-feed-subject card type. By the end of this phase, the feed surfaces cards like "Casa da Música — 14 new photos this week, 4 from people you follow" with stacked thumbnails and a facepile of ring-1 contributors. This is the type that anchors the feed for users with sparse graphs.

### What ships

A `building_activity_rolling` materialized view, a `get_building_spotlights` RPC, a `<BuildingSpotlightCard>` component, and a new `FeedItem` variant.

### Tasks

1. **Materialized view: `building_activity_rolling`.**
   - Schema: `(building_id uuid, window text, posts_count int, photos_count int, likes_count int, last_activity_at timestamptz, contributor_ids uuid[])`.
   - `window` values: `'24h'`, `'7d'`, `'30d'`. One row per (building, window).
   - Refreshed on a schedule (the agent picks frequency — hourly is fine for `24h` window; daily for the rest. If Supabase scheduling isn't trivial here, the agent decides whether to use `pg_cron` or trigger refresh on RPC call with a TTL check). Document the choice.
   - **Acceptance:** a building with 5 new photos in the last 24h has a row with `photos_count >= 5` in the `'24h'` window.

2. **`get_building_spotlights(p_limit int, p_offset int)` RPC.**
   - Returns spotlight candidates: buildings from the materialized view with `posts_count >= 2` in the relevant window, scored by activity.
   - Each row includes: building data, `contributor_ids` intersected with the viewer's follow graph (to produce the ring-1 facepile), and a score.
   - **Ring assignment:**
     - `'direct'` if ≥1 ring-1 contributor.
     - `'open'` otherwise.
   - **Acceptance:** "Casa da Música — 14 new photos this week, 4 from people you follow" is producible from this RPC's output.

3. **`<BuildingSpotlightCard>` component.**
   - New file: `src/features/feed/components/BuildingSpotlightCard.tsx`.
   - Layout: large hero (building's `community_preview_url` or `main_image_url`), title + activity headline (`14 new photos this week`), facepile of ring-1 contributors, "View building →" CTA.
   - Tile size: `lg` (2×1) by default; `xl` (2×2) when score is exceptional and ring-1 contributors exist.
   - **Attribution:** "Trending in `${city}` this week" if ring-3; "`${count}` photos from people you follow" if ring-1.
   - **Acceptance:** the card renders at `lg` and `xl`; the facepile correctly shows only ring-1 contributors.

4. **Wire into the merge.**
   - Fifth parallel RPC call in `useFeed`. Same merge.
   - **Frequency cap:** at most 1 spotlight per 5 surface units (per the brief's §5.2 and §12 risk note). Enforced in the assembly function — if the ranker would place two adjacent spotlights, the second is deferred to the next page.

5. **Tests.**
   - Materialized view returns correct counts for fixture data.
   - Spotlight RPC produces the right ring assignment based on graph overlap.
   - Frequency cap: no two spotlights within 5 tiles of each other.
   - Card renders at both tile sizes.

### Out of scope for Phase 5

- Rotation tiers (Phase 6).
- Moments clustering (Phase 7).
- Allowing the user to "follow" a building beyond the existing save/favourite mechanic. (Reads existing data only.)

### Risks

- **Materialized view refresh cost.** The agent measures cost on production data; if hourly refresh is too expensive, falls back to a query-time aggregation with a 5-minute cache. The schema stays the same so the swap is invisible.
- **Spotlights can feel spammy if a few buildings are always active.** The diversity penalty (a building can't appear in both a post tile and a spotlight tile within 5 positions) addresses this. The agent confirms during QA.

---

## [ ] Phase 6 — Rotation tiers (dynamism) (3–4 days)

**Goal:** Guarantee the top of the feed changes between visits, even with no new posts. By the end of this phase, the surface includes Photo of the Day, On This Day, and Trending This Hour as clock-driven editorial slots, plus velocity badges on cards.

### What ships

Three new editorial slot types, an `editorial` ring assignment, and a `<VelocityBadge>` component used across existing cards.

### Tasks

1. **Photo of the Day — *computed*.**
   - Open question #1 in the brief is resolved in favour of computed for v1 (no curation surface). The agent confirms with the human before starting this phase; if curation is chosen instead, this task structure stays but the source changes.
   - Source: `review_images` with highest `likes_count` over the past 7 days, weighted by image-level engagement velocity.
   - One image selected daily at midnight UTC, cached in `feed_editorial_slots` table (new — schema: `slot_kind text, slot_date date, payload jsonb, picked_at timestamptz`).
   - **Acceptance:** every day there's a Photo of the Day; the choice is stable for the duration of that day.

2. **On This Day.**
   - For each viewer, finds: buildings they visited 1y, 5y, 10y ago today. Picks the highest-rated.
   - Computed at request time; no caching needed (the per-viewer payload is unique).
   - **Acceptance:** a user with a visit dated 2025-05-13 sees an On This Day card on 2026-05-13.

3. **Trending This Hour.**
   - Source: posts with highest `engagement_velocity` (likes + comments per hour since posting) in the last 60–120 min.
   - One post per viewer's primary locality if available; else global. The agent decides "primary locality" — could be the city most-visited in their `building_posts` history, or a self-declared field if one exists.
   - Refreshed every 15 minutes via a small cached RPC.
   - **Acceptance:** a viewer in Lisbon sees a post about a Lisbon building when one is trending; otherwise the global trending post.

4. **Editorial slot reservation in the mosaic.**
   - The first page of feed reserves one `xl` slot at position 1 for an editorial item, picking from the three sources in priority order (Photo of the Day if not yet seen today → On This Day if available → Trending This Hour as fallback).
   - The `seen_penalty` applies: once seen, the editorial item drops dramatically. A returning user later in the day sees a different editorial item or a top-ranked post.

5. **Velocity badges.**
   - New `<VelocityBadge>` component: small overlay on cards showing "+12 likes in the last hour" or "+47 photos this week" (for spotlights).
   - Threshold: only render when velocity is meaningfully above baseline (the agent picks the threshold; conservative is better).
   - **Acceptance:** badges appear on a small fraction of cards (think 5–15%), not most.

6. **Tests.**
   - Photo of the Day stable within a day, changes at UTC midnight.
   - On This Day correctly identifies anniversaries.
   - Trending This Hour respects locality preference.
   - Editorial slot reservation respects seen penalty.

### Out of scope for Phase 6

- Moments clustering (Phase 7).
- Curated editorial (deferred unless the human flips the open question).
- Push notifications about trending content (deferred).

### Risks

- **Computed Photo of the Day quality ceiling is lower than curated.** Acceptable for v1; the human reviews after a week and decides whether to invest in a curation surface.
- **On This Day can be melancholy** if the user's anniversary memory is a building they didn't enjoy. Filter to rated ≥4 visits or to posts with media. The agent picks; default to "rated ≥4 OR has media."
- **Velocity badges can mislead** if engagement is bot-driven or off a small base. The threshold is the mitigation; review after launch.

---

## [ ] Phase 7 — Moments clustering (4–5 days)

**Goal:** Collapse related posts into single feed units. By the end of this phase, when three friends visit Lisbon in the same week, the feed shows one "Your contacts are in Lisbon" card with stacked thumbnails instead of three separate posts.

### What ships

A clustering pipeline (server-side aggregation) and a `<MomentClusterCard>` component (extension of the existing [FeedClusterCard.tsx](src/features/feed/components/FeedClusterCard.tsx) pattern).

### Tasks

1. **Define cluster types and constraints.**
   - Three cluster types for v1:
     - **Multi-user locality cluster:** ≥2 ring-1 users posted about buildings in the same `locality_id` within 7 days.
     - **Multi-photo single-building cluster:** the same user posted ≥3 photos of the same building in one week (collapsed to one card).
     - **Multi-user single-building cluster:** ≥2 ring-1 users posted about the same building within 30 days.
   - Each cluster has a "lead" post and "supporting" posts; the lead is the highest-scored.
   - **Acceptance:** fixture data produces the expected cluster counts.

2. **`get_feed_clusters(p_limit int, p_offset int)` RPC.**
   - Queries the three cluster types, returns a unified shape: `(cluster_id text, cluster_kind text, lead_post jsonb, supporting_posts jsonb[], actors jsonb[], building_or_locality jsonb, score)`.
   - Ring assignment: `'direct'` (all clusters in v1 require ring-1 actors).
   - Score: aggregate of underlying post scores plus a "cluster bonus" (the agent decides — start with 1.3× the lead's score).
   - **Acceptance:** the RPC returns valid clusters and the underlying posts are also still in `get_feed_ranked` (deduplication happens at merge time).

3. **Dedup in client merge.**
   - When a cluster is selected for the surface, the underlying lead and supporting posts are removed from other source results to avoid double-presence.
   - This logic lives in the assembly function alongside diversity.
   - **Acceptance:** no post appears both as a standalone tile and inside a cluster on the same page.

4. **`<MomentClusterCard>` component.**
   - Extends or replaces [FeedClusterCard.tsx](src/features/feed/components/FeedClusterCard.tsx).
   - Layout: large hero (one image from the lead post), title (`3 people you follow visited Lisbon this week`), actor facepile, stacked supporting photos (small thumbnails).
   - Tap → expanded view showing all posts in the cluster. The agent picks: inline expansion vs. dedicated route. Inline is simpler; pick that unless there's a reason not to.
   - Tile size: `lg` (2×1) by default.

5. **Attribution.**
   - "`${n}` people you follow visited `${locality}` this week" — uses the existing `<ContactFacepile>` ([src/features/feed/components/ContactFacepile.tsx](src/features/feed/components/ContactFacepile.tsx)).

6. **Tests.**
   - Cluster identification rules with fixture data.
   - Dedup in merge: an underlying post does not appear standalone when its cluster is shown.
   - Inline expansion (or dedicated route) shows all posts in the cluster.

### Out of scope for Phase 7

- Event-attendance clusters beyond what the existing [FeedEventAttendanceRow.tsx](src/features/feed/components/FeedEventAttendanceRow.tsx) already does. (That component stays; v2 of event clustering is a follow-up.)
- Itinerary clusters ("4 people you follow used this itinerary").
- AI-summarised cluster descriptions.

### Risks

- **Cluster identification is N-squared-ish if naive.** The agent uses indexed lookups (e.g. `building_posts(locality_id, created_at)`) and limits the lookback window. `EXPLAIN ANALYZE` is mandatory.
- **Clusters can hide individual posts the user actually wanted to see.** Mitigate by ensuring the cluster's expanded view is one tap away.

---

## Post-rebuild cleanup (separate task, after Phase 7 has shipped and stuck)

Not part of the rebuild itself, but worth tracking:

- Remove the `feed_v2_ranker` feature flag once the new surface has been live and uncontested for a release cycle.
- `DROP FUNCTION` the original `get_feed` if no code references it. Likewise legacy collections feed shapes if they were superseded.
- Audit `supabase/migrations/` for the ~40 feed-related band-aid migrations and consolidate documentation in a single `FEED_HISTORY.md` so future engineers understand the lineage.
- Revisit the open questions in [brief §11](docs/FEED_REDESIGN_BRIEF.md): curated Photo of the Day, close-contacts sub-weight, architect-on-own-building boost, awards treatment, cross-page diversity policy.
- Mobile-app parity. Same model, different shell.

---

## Definition of done for the whole rebuild

A user can:

1. Open `/feed` with **0 follows** and see a rich, varied, media-first mosaic with inline follow prompts. No "your feed is empty" state, no separate cold-start page.
2. Open `/feed` with **50 follows** and see ring-1 content prioritised, ring-2 content present with "Liked by X" attribution, and ring-3 / editorial content as a floor.
3. Visit `/feed` in the morning and again in the evening on the same day — the top tile is different even if no one in their graph has posted.
4. See a video post as a 2×2 tile auto-playing muted; a multi-photo post as a 2×1 tile; a text-only review as a compressed pull-quote.
5. Tap a building spotlight and land on the building's detail page; tap a moment cluster and see all its posts.
6. Read every card's attribution line and understand why it's there.

A developer can:

1. Read [docs/FEED_REDESIGN_BRIEF.md](docs/FEED_REDESIGN_BRIEF.md), `src/features/feed/pages/Index.tsx`, and `src/features/feed/utils/scoreFeedItem.ts` and understand the feed end-to-end within 15 minutes.
2. Tune ranking weights in one file (`scoreFeedItem.ts` for client weights; the relevant RPC for SQL-side weights — and that's it).
3. Add a new feed source by writing one RPC, one TS wrapper, declaring a new `FeedItem` variant, and adding it to the merge — no other surgery.
4. Trust that what the feed shows is what the ranker chose, with no hidden filters and no silent exclusions.

---

## Notes for the agent on how to start

1. Before Phase 0, run a fresh `git pull` and confirm the branch is clean.
2. Read [docs/FEED_REDESIGN_BRIEF.md](docs/FEED_REDESIGN_BRIEF.md) end-to-end. The brief is upstream of this roadmap.
3. Read [docs/PRD.md](docs/PRD.md) sections on social and feed.
4. Read `src/features/feed/pages/Index.tsx` and the three feed hooks (`useFeed`, `useDiscoveryFeed`, `useSuggestedFeed`) end-to-end before any code changes.
5. Skim the last 15 feed-related migrations to understand the codebase's SQL conventions (`SECURITY DEFINER`, `SET search_path = public, extensions`, GRANT pattern, parameter naming).
6. **Confirm with the human (the user) before starting each new phase.** Each phase ends with "PR merged, deploy verified, ready for next phase." Don't chain phases without a checkpoint.
7. When the agent is unsure between two reasonable approaches and this document doesn't decide, the agent asks the human. The human is non-technical but understands the product deeply and can answer product questions clearly.

---

## Appendix A — File and component map for the rebuild

| Layer | New | Modified | Retired |
|---|---|---|---|
| Migrations | `get_feed_ranked`, `get_feed_extended`, `get_building_spotlights`, `get_feed_clusters`, `feed_editorial_slots` table, `building_activity_rolling` mv | `get_collections_feed` (+ring column), `get_discovery_feed` (+ring column) | none in active rebuild; legacy `get_feed` retired in post-rebuild cleanup |
| Hooks | `useSeenItems`, `useFeedUnified` (replaces `useFeed` internals) | `useFeed`, `useCollectionsFeed`, `useSuggestedFeed`, `useDiscoveryFeed` | `useDiscoveryFeed` may be inlined into the merge — agent decides |
| Components | `<CardAttribution>`, `<FeedMosaic>`, `<BuildingSpotlightCard>`, `<VelocityBadge>`, `<MomentClusterCard>` | `FeedCardA/B/C` (tileSize prop), `ContactFacepile` (cluster use) | `ColdStartFeed.tsx` (Phase 2), `EmptyFeed.tsx` likely (Phase 2) |
| Types | `FeedItem` union (`src/types/feedItem.ts`) | `src/types/feed.ts` (additive) | none |
| Utils | `scoreFeedItem.ts`, mosaic assembly fn | `resolveCardType.ts` extended for new variants | `deriveLegacyFeedUi.ts` (Phase 3 or later) |

---

## Appendix B — Phase dependency graph

```
Phase 0 (foundations)
   │
   ├──> Phase 1 (ranker)
   │       │
   │       └──> Phase 2 (merge + retire cold-start)
   │              │
   │              ├──> Phase 3 (mosaic surface)         ◄── biggest visual win
   │              │
   │              ├──> Phase 4 (ring 2)                 ◄── biggest sparse-graph win
   │              │      │
   │              │      └──> Phase 5 (building spotlights)
   │              │
   │              └──> Phase 6 (rotation tiers)         ◄── biggest dynamism win
   │                     │
   │                     └──> Phase 7 (moments)
```

Phases 3, 4, and 6 are independent of each other after Phase 2 and can be reordered or interleaved if user feedback during the rebuild suggests a different priority. The agent flags any reordering to the human before acting.
