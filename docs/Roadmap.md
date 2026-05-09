# Search Rebuild Roadmap

> **Audience.** This document is the working spec for an autonomous coding agent (Claude Code) tasked with rebuilding the search feature. The human user is non-technical; the agent owns implementation decisions inside the constraints stated here. Where this document says "the agent decides," the agent decides — but it documents the decision in commit messages and PR descriptions.

> **Source of truth.** This roadmap was produced after a full diagnostic of the existing search system (≈70 search-related migrations, 23 of which contained "fix" in the filename). The diagnostic identified the core architectural problem and the specific bugs caused by it. Both are summarised in [§ Background](#background) below. The agent should read § Background before starting, and refer back to it whenever a phase decision feels ambiguous.

---

## Background

### The architectural problem

A single RPC (`get_map_clusters`) is being asked to do four jobs simultaneously:

1. Cluster pins for the map.
2. Filter buildings by 20+ criteria.
3. Match free-text search across name / alt_name / aliases / credited entities.
4. Rank results.

All four are gated by a viewport bounding box. The frontend hands the RPC a bbox derived from the map camera, and the RPC runs the user's text query **only against buildings inside that bbox**. Searching "Shard" while looking at Australia → zero results. This is not a bug, it's the design. The design is wrong.

### The two user modes

Users approach the search page in two distinct ways that the current architecture conflates:

- **Find mode.** "I'm looking for *that specific building*." The user has typed a query. They want results from anywhere on Earth, ranked by relevance. The map should respond to results, not constrain them.
- **Browse mode.** "Show me brutalist buildings in this area." The user hasn't typed anything (or has cleared their query). The map is the primary input. Filters refine the visible set. The camera controls the data.

The rebuild's organising principle: **Find and Browse are two products that share UI.** They need different RPCs, different state management, and different mental models — even though the user experiences them as one search bar.

The dispatch is invisible to the user: typed query → Find, empty query → Browse.

### The infrastructure decision

Stay Postgres-native. Build a proper hybrid-scoring `search_buildings_v2` RPC combining `pg_trgm` trigram similarity (typo tolerance) with `websearch_to_tsquery` full-text ranking (relevance) and `popularity_score` (tiebreaker), backed by a precomputed `tsvector` column maintained via trigger. This delivers the quality bar needed for submit-on-enter UX without operational overhead of an external search service. ParadeDB is the upgrade path if multilingual / non-Latin script search becomes a real bottleneck — same Postgres, drop-in.

### Confirmed bugs (each phase below explains which it fixes)

1. **Viewport gating of text search.** `useBuildingSearch.ts` returns `[]` if `debouncedBounds` is null. Search is bbox-bounded with a 25% buffer.
2. **Silent status exclusion.** `get_map_clusters` and `get_map_clusters_v2` hardcode-exclude `Demolished | Lost | Under Construction | Unbuilt` by default with no UI signal.
3. **Hidden popularity floor.** `get_map_clusters_v2` excludes `popularity_score < -50`.
4. **People/companies search is sequential-scan.** `searchPeople` / `searchCompanies` use `ilike '%q%'` against tables with no trigram index on `name`. Three sequential round-trips per keystroke.
5. **`search_buildings` RPC references dropped tables.** Joins `building_architects` and `architects`, dropped in `20270837000000_drop_legacy_architect_tables.sql`. Will throw at runtime if called. (Currently unused; kept here as cleanup.)
6. **Country filter copy-paste bug.** `get_buildings_list` reads `filter_criteria->>'query'` into `v_country_filter` instead of `->>'country'`. Country filter silently broken.
7. **Location autocomplete bloat.** Google Places suggestions rendered without a cap — common substrings produce dropdowns of ten near-identical localities.
8. **Map freeze.** `useBuildingSearch` queryKey has 30+ dependencies and no `AbortController`. Fast map panning queues up multiple in-flight RPC calls; React Query doesn't cancel them.

---

## Operating principles for the agent

These apply to every phase. Re-read before starting each one.

1. **Each phase ships independently and leaves the app working.** Never end a phase with a broken state. If a phase needs to be split mid-flight, split it — but ship working code.

2. **Bias toward smaller PRs.** A phase may produce multiple PRs. One coherent change per PR.

3. **Preserve user-visible behaviour unless the phase explicitly changes it.** Don't fix unrelated UI bugs in a search PR. Note them for later.

4. **Migrations are append-only.** Never edit an existing migration file. Always add a new dated migration. Use the existing date convention (`YYYYMMDDHHMMSS_description.sql`).

5. **No hidden filters.** Every default that excludes data must either (a) be obviously documented in code comments, or (b) be surfaced as a UI-toggleable filter. The "Demolished/Lost hidden by default with a Show demolished toggle" requirement is the model. Apply this principle to every silent exclusion encountered.

6. **Tests required.** Every phase adds Vitest unit tests for new logic and updates impacted existing tests. RPC changes need a SQL-level integration test if one doesn't already exist (the codebase has a pattern for this — find and follow it).

7. **Document decisions in commit messages.** Where this roadmap says "the agent decides," explain the decision and tradeoffs in the commit body. Future-you and other agents will read these.

8. **Update `.ai-status.md` after each phase.** The codebase uses this file as a running log. Add a brief entry per phase summarising what shipped and what's next.

9. **When in doubt, prefer the simpler option.** Search code in this repo has died from accumulated cleverness. Resist the urge to add capability "while you're in there."

10. **Read `docs/DATA_CONTRACT.md` and `docs/PRD.md` before changing data shapes.** Update them when shapes change.

---

## [x] Phase 0 — Quick wins (1 day)

**Goal:** Fix three real user-visible bugs and clean up one piece of dead code. No architecture changes. No new dependencies. This phase is tactical cleanup that buys credibility for the larger rebuild and stops users hitting the worst symptoms while phases 1–4 are in flight.

### What ships

A single PR titled `Phase 0: Search quick wins`. Touches a small number of files. Reviewable in 15 minutes.

### Tasks

1. **Cap and constrain Google Places autocomplete.**
   - Cap rendered suggestions to 3 in `DiscoverySearchInput.tsx` (the `data.map` over Places `description`s — currently uncapped).
   - Constrain Places `types` to favour cities/regions over localities. Investigate the right `types` value for the new Places API (`useAutocompleteSuggestions`); the goal is that searching "Shard" doesn't surface 8 villages named Shardara, Shardahalli, etc. The agent decides the exact `types` config based on Places API docs and tests it against representative queries (e.g. "Shard", "Bilbao", "Tokyo", "Chamonix").
   - **Acceptance:** typing a common substring shows ≤3 location suggestions, and they skew toward cities and regions over hamlets.

2. **Fix the country filter copy-paste bug.**
   - In `get_buildings_list`, `v_country_filter := filter_criteria->>'query'` reads the wrong key. New migration that re-creates the function with `filter_criteria->>'country'`.
   - **Acceptance:** filtering by country in the list view actually filters by country. Add a Vitest case if one doesn't exist.

3. **Decommission the broken `search_buildings` RPC.**
   - It joins dropped tables (`building_architects`, `architects`). Two valid paths — agent picks whichever is smaller:
     - **Option A:** delete the function via a `DROP FUNCTION` migration if no code calls it. Verify with a global grep across `src/`, `app/`, and `supabase/` for `'search_buildings'` (string), `.rpc('search_buildings'`, and `search_buildings(`.
     - **Option B:** if anything still references it, rewrite it to use `building_credits` instead of `building_architects`. Call sites become the test.
   - **Acceptance:** no code path references a dropped table; CI green.

4. **Verify nothing in the rest of the schema still references `building_architects` or `architects`.**
   - Quick grep across all migrations *after* `20270837000000_drop_legacy_architect_tables.sql`. If anything later references those tables, flag it in the PR description but don't fix it here unless it's a one-line cleanup.

### Out of scope for Phase 0

- Removing the viewport gate on text search (that's Phase 2).
- Removing the silent status exclusions (that's Phase 3).
- Anything involving `pg_trgm`, `tsvector`, or new indexes (that's Phase 1).
- Touching the people/companies search at all (that's Phase 2).

### Risks

- The Places `types` choice may need a follow-up tweak after real usage. Acceptable.

---

## [ ] Phase 1 — Hybrid scoring foundation for buildings (3–5 days)

**Goal:** Build the Postgres infrastructure for a proper Find-mode building search. Ship a new `search_buildings_v2` RPC behind a feature flag. Don't wire it up to the UI yet — that's Phase 2. By the end of this phase, the database has everything it needs to support a fast, ranked, typo-tolerant, viewport-independent text search across buildings.

### What ships

A migration set, the new RPC, and a thin TypeScript API wrapper. No UI changes. Behind a feature flag (or just unused — the agent decides which is cleaner given the codebase's conventions).

### Tasks

1. **Add a `search_vector tsvector` column to `buildings`.** Maintained via trigger.
   - Columns to weight (the agent decides exact weights based on what reads correctly for ranking, but a sensible starting point is `name = A`, `alt_name = A`, `aliases = B`, `address = C`, `city = C`, `country = D`).
   - Trigger fires on INSERT and UPDATE OF the relevant columns (`name`, `alt_name`, `aliases`, `address`, `city`, `country`, and any others the agent includes in the vector).
   - Use `to_tsvector('simple', ...)` not `'english'` — the building data is multilingual and English stemming will hurt more than help. The agent should reason about this in the commit message.
   - Backfill the column for existing rows in the same migration.
   - **Index:** GIN on `search_vector`.
   - **Acceptance:** new building INSERT updates `search_vector` automatically. Existing buildings have populated vectors. `EXPLAIN` on a `@@` query uses the GIN index.

2. **Add trigram indexes where missing.**
   - `buildings.alt_name` (gin_trgm_ops) — currently no index, only `name` has one.
   - The agent evaluates whether trigram on `address`, `city`, `country` is worth it given query patterns. Default no.
   - **Acceptance:** indexes exist, `EXPLAIN` confirms they're used for trigram queries.

3. **Build `search_buildings_v2(query text, p_limit int, p_offset int, filters jsonb)` RPC.**
   - **Inputs:** the text query, optional pagination, optional filters jsonb that shadows the existing filter shape (categories, typologies, attributes, credit_company_id, credit_roles, awards, sizes, construction_statuses, etc. — match the existing filter contract so swapping in is mechanical in Phase 2). **No bbox parameter.** This is the explicit architectural break from `get_map_clusters`.
   - **Returns:** ranked rows with at minimum: `id, name, slug, alt_name, hero_image_url, lat, lng, city, country, year_completed, popularity_score, tier_rank, credit_names text[], rank_score double precision`. The agent picks the final shape based on what `BuildingSidebar` and `DiscoverySearchInput` actually need to render — read those files and copy the shape.
   - **Scoring (the heart of this phase):** combine three signals into a single `rank_score`. The agent owns the exact formula and tunes it; a defensible starting point is:
     ```
     rank_score = (0.6 * ts_rank_cd(b.search_vector, websearch_to_tsquery('simple', q)))
                + (0.3 * GREATEST(similarity(b.name, q), similarity(b.alt_name, q)))
                + (0.1 * normalized_popularity)
     ```
     where `normalized_popularity = log(GREATEST(1, popularity_score + 100)) / log(1100)` clamps `popularity_score` to roughly 0–1.
   - **Filtering matches scoring's hard floor.** A row qualifies for ranking if it matches the `tsquery` *or* has trigram similarity above some threshold (start at `0.2`, tune with real data). This is what gives typo tolerance.
   - **Status defaults.** `is_deleted = false`. **No silent status exclusions.** The construction-status filter is honoured if the caller supplies it; if not, all statuses are returned. Phase 3 owns the UI side of "Demolished hidden by default."
   - **No `architects` table reference.** Use `building_credits` joined to `people` and `companies` for the `credit_names` aggregation. Match the pattern used in `get_map_clusters` v1's `building_credit_names_agg` CTE.
   - **`SET search_path = public, extensions`. `SECURITY DEFINER`. `GRANT EXECUTE` to `anon` and `authenticated`.** Consistent with the codebase's existing RPC conventions.
   - **Acceptance:**
     - Searches from a representative query set ("shard", "shrd" → typo, "renzo piano", "брутализм" → non-Latin, "the shard london") all return sensible top-3 results.
     - 50ms or better for cold queries on the production dataset (run `EXPLAIN ANALYZE`).
     - **Most importantly: searching "Shard" returns the Shard regardless of map state.** This is the architectural test.

4. **Add a thin TS wrapper.**
   - `searchBuildingsV2(query: string, opts?: { limit?: number; offset?: number; filters?: ... }): Promise<BuildingSearchHit[]>` in a new file under `src/features/search/api/`.
   - Type the response. Don't wire it into hooks or UI yet.

5. **Tests.**
   - SQL-level integration test (follow existing pattern in `tests/`) covering: typo tolerance, ranking order across exact/prefix/trigram matches, no-bbox-no-empty-results, filter passthrough.
   - Unit test for the TS wrapper (mocked Supabase client).

### Out of scope for Phase 1

- Indexing or searching `people` and `companies` as part of unified search. Phase 2 owns that.
- Removing or modifying any existing RPC (`get_map_clusters`, `get_map_clusters_v2`, `get_buildings_list`, `find_nearby_buildings`). All untouched.
- UI changes.

### Risks

- **Ranking tuning is iterative.** The starting weights will need adjustment. Build the formula so weights are easy to change in one place. Plan for a tuning pass during Phase 2 once real users hit it.
- **`websearch_to_tsquery` parses queries with punctuation that may surprise users.** Test with apostrophes (`O'Neill`), ampersands, parens.
- **`tsvector` + GIN backfill on a large table can lock writes.** Use `CREATE INDEX CONCURRENTLY` and backfill in batches if the table is over ~50k rows. The agent checks the row count and decides.

---

## [ ] Phase 2 — Wire up Find mode end-to-end (3–5 days)

**Goal:** Make the search bar actually work. By the end of this phase, typing a query in the search bar uses `search_buildings_v2`, returns results regardless of map position, and works for people and companies too. This is the user-visible "search starts working" moment.

### What ships

The split between Find mode and Browse mode in the frontend. Three smoking-gun bugs go away (viewport gate, slow people search, slow companies search). Map still uses `get_map_clusters` for now — that's Phase 3.

### Tasks

1. **Apply the same hybrid-scoring approach to `people` and `companies`.**
   - Add a `search_vector tsvector` column + trigger + GIN index to each. Weights: `name = A`, `slug = C`, `bio = D` (the agent confirms based on query patterns).
   - Add gin_trgm_ops indexes on `people.name` and `companies.name`. **These don't exist today and are a major cause of slowness.**
   - Build `search_people_v2(query, p_limit)` and `search_companies_v2(query, p_limit)` RPCs with the same scoring shape as `search_buildings_v2` (ts_rank + trigram similarity + a popularity proxy — for entities, `creditCount` is the natural proxy).
   - Each returns a small payload suitable for autocomplete: `id, name, slug, avatar_url/logo_url, claim_status, nationality/country, credit_count`.
   - **Acceptance:** `searchPeople("renz")` returns Renzo Piano in the top 3, fast (<100ms cold).

2. **Build `useUnifiedSearch(query)` hook.**
   - Replaces `useGlobalEntitySearch` for the query path. Same shape of return value (people, companies, buildings) so callers don't have to change much.
   - Single hook fires three parallel RPC calls (`search_buildings_v2`, `search_people_v2`, `search_companies_v2`) — not the current people→affiliations→credits→buildings sequential chain.
   - **Adds an `AbortController`.** Cancels in-flight requests when the query changes. This is non-negotiable.
   - Debounced (300ms — match existing).
   - Returns a single object: `{ buildings, people, companies, isLoading, error }`.
   - **Acceptance:** typing fast in the search bar doesn't queue up requests; only the latest query's results land.

3. **Refactor `SearchPage.tsx` and `useBuildingSearch.ts` to introduce the Find/Browse split.**
   - **Find mode** (query.length >= 2, after debounce): use `useUnifiedSearch`. Pins on the map are the building results from `search_buildings_v2`. The map flies to fit the result set on the first response. **Map camera position no longer constrains the search.**
   - **Browse mode** (no query, or query cleared): existing behaviour using `get_map_clusters`. Untouched. Map controls data.
   - **The dispatch is invisible to the user.** No toggle. The same `<DiscoverySearchInput>` works for both.
   - The agent reads the existing `useBuildingSearch` carefully before refactoring — it's a 1500-line hook with many concerns interleaved. Consider splitting it: `useBuildingSearchFind` and `useBuildingSearchBrowse`, with `useBuildingSearch` becoming a thin selector. The agent decides based on what produces the cleanest diff.
   - The "blank query → return []" guard goes away in Find mode — replaced by "no query → don't run Find query, run Browse instead."

4. **Delete the `searchPeople` / `searchCompanies` 3-round-trip path.**
   - The functions in `src/features/credits/api/people.ts` and `companies.ts` are replaced by thin wrappers around the new RPCs. Keep the public function name (`searchPeople`, `searchCompanies`) — only the implementation changes.
   - The old `discoverPeople` / `discoverCompanies` (called when no query) can stay as-is for now. They're Browse mode. Phase 3 may revisit.
   - **Acceptance:** entity search is fast; no `affiliations` round-trip on every keystroke.

5. **Tests.**
   - Update `useGlobalEntitySearch.test` (or replace with `useUnifiedSearch.test`).
   - Add a test that proves "search 'Shard' from a map looking at Australia returns the Shard." This is the architectural regression test for the viewport-gating bug.
   - Update existing search tests to match new shape.

### Out of scope for Phase 2

- Touching `get_map_clusters` or `get_map_clusters_v2`. Browse mode is exactly as-is.
- Smart filter chips. Phase 4.
- Removing default status exclusions. Phase 3.
- Map freeze fix. Phase 3 (it lives in Browse mode hook).

### Risks

- **The Find/Browse split is the biggest refactor in the rebuild.** Most of the bugs from this rebuild will live here. Take it slow. Ship it behind a feature flag if the agent wants — the codebase appears not to use feature flags routinely, so a parallel implementation that's swapped in via a single boolean is acceptable.
- **`useBuildingSearch` has many call sites.** Audit them before refactoring. Map components, list components, profile pages, collection dialogs — all may consume it.

---

## [ ] Phase 3 — Slim Browse mode and stabilise the map (3–5 days)

**Goal:** Make Browse mode honest and fast. Remove the silent exclusions, fix the map freeze, and consolidate `get_map_clusters` and `get_map_clusters_v2` into a single trustworthy `get_map_clusters_v3`. Add the "Show demolished" toggle.

### What ships

A new `get_map_clusters_v3` RPC. The viewport-driven Browse experience becomes responsive, accurate, and trustworthy. Map freezes stop.

### Tasks

1. **Build `get_map_clusters_v3(bbox, zoom, filters)`.**
   - **Browse-only.** No text-search code path. The `query` filter is removed from the input — Find mode owns text search.
   - **No silent exclusions.** Specifically:
     - `is_deleted = false` is the only status default.
     - `Demolished | Lost | Unbuilt | Under Construction` are no longer hardcoded-excluded.
     - The `popularity_score >= -50` floor is removed.
   - **Default status behaviour is owned by the caller.** The frontend now sends `construction_statuses: ['Built', 'Under Construction', 'Renovated']` (or whatever the agent decides the sensible default is) by default. The "Show demolished" toggle in the filter drawer flips between sets.
   - **Simplify the function.** Today's `get_map_clusters_v2` is ~200 lines with many redundant filter parses. The new version should be markedly shorter (target ~120 lines or less). Drop dead branches.
   - Filter shape stays close to the existing one for migration ease, but feel free to clean up obvious copy-paste artefacts.
   - **Acceptance:** Browse mode shows demolished buildings when the toggle is on; doesn't when it's off. The "everything just disappeared" silent exclusion behaviour is gone.

2. **Add the "Show demolished" toggle in `FilterDrawer.tsx`.**
   - Lives in the construction-status section of the filter drawer.
   - **Default off** (matches today's behaviour from the user's perspective — non-built buildings stay hidden by default — but now there's a visible toggle).
   - When ON, includes `Demolished` and `Lost` statuses in the filter set sent to `get_map_clusters_v3`.
   - The existing `constructionStatuses` filter still works if the user picks specific statuses — the toggle is a quick-access shortcut for the common case.
   - URL state: persists in the URL (consistent with other filter state).
   - **Acceptance:** toggling shows/hides demolished buildings on the map and in the list, with no other state changes.

3. **Fix the map freeze.**
   - Add `AbortController` to the Browse query in `useBuildingSearch`. Cancel in-flight `get_map_clusters_v3` calls on viewport change.
   - Audit the queryKey. The current one has 30+ dependencies, many of which are object references that change identity every render. Stabilise references with `useMemo` where appropriate, or restructure the queryKey to use scalar identifiers.
   - The agent considers debounce strategy. Right now `bounds` is independently debounced from `query`. With Find/Browse split, this can be simpler: in Browse mode, only `bounds` and `filters` matter. Fast-pan should debounce more aggressively than fast-typing (e.g. 500ms vs 200ms — the agent tunes).
   - **Acceptance:** rapid map panning doesn't queue up RPC calls. Watch the network tab — only the final viewport's request should land.

4. **Migrate frontend Browse calls to `get_map_clusters_v3`.**
   - `useBuildingSearch` (Browse path), `useMapData`, `BuildingSidebar`, anywhere else that calls `get_map_clusters` or `get_map_clusters_v2`.
   - The old RPCs stay in the database for now (don't delete in this phase — keeps rollback easy). Mark with a comment that they're deprecated and slated for removal in a follow-up cleanup migration after a release cycle.

5. **Tests.**
   - Browse mode: viewport changes trigger correct RPC calls; rapid panning cancels prior in-flight requests.
   - "Show demolished" toggle: round-trips through URL state correctly.
   - Construction-status filter: default-on behaviour matches today's user-perceived default.
   - Removed silent exclusions: a building with `popularity_score = -100` now appears (with the right filters).

### Out of scope for Phase 3

- Smart filter chips. Phase 4.
- Removing the deprecated `get_map_clusters` / `get_map_clusters_v2`. Defer to post-release cleanup.
- Touching Find mode at all.

### Risks

- **The "Show demolished" default decision is product-sensitive.** This roadmap calls for default-off based on the user's stated preference. If the agent finds that some pages (e.g. an architect's portfolio page) need a different default, the toggle's default should be context-sensitive — but only if it's clearly necessary. Default to one consistent default everywhere.
- **`get_map_clusters_v3` will be called from everywhere `v2` was.** Diff carefully against today's behaviour. Anything that *looked* like a feature ("Demolished hidden") was actually a silent bug; some users may have implicit expectations built around it. PR description should call this out clearly.

---

## [ ] Phase 4 — Smart filter chips (2–3 days)

**Goal:** When the user's query corresponds to a known filter value (`brutalism` → Brutalist attribute, `renzo piano` → architect filter, `tokyo` → city filter), surface a chip above the search results offering one-click application of that filter. Turns Find mode into a discoverable bridge into Browse mode.

This phase is small and self-contained. It's the "nice surprise" phase — everything's already working before this lands.

### What ships

A `<SmartFilterSuggestions>` component above the search results in `BuildingSidebar`. Backed by a small RPC or a client-side match against pre-fetched filter taxonomy.

### Tasks

1. **Decide implementation strategy.**
   - **Option A (server-side):** new RPC `suggest_filters_for_query(query text)` returning matching attributes / typologies / categories / people / companies / cities, each with a count of buildings that match. Single round-trip.
   - **Option B (client-side):** prefetch the full taxonomy on Find mode entry (probably already partially cached via `get_discovery_filters` etc.), match the query against it client-side, count matches via the search results already returned.
   - **The agent picks** based on (a) how much taxonomy data there is — if it's small, client-side is simpler — and (b) how cleanly counts can be derived without a second query. Document the choice in the PR.

2. **Render chips above search results in `BuildingSidebar`.**
   - When the user types "brutalism" and the system finds the Brutalist attribute matches with 147 buildings, render: `[Filter by Brutalist (147)]`.
   - Click → applies the filter, clears the query, switches to Browse mode (filter URL params updated, query URL param removed).
   - Show at most 3 chips. If there are more candidates, sort by match count.
   - Match logic: case-insensitive, allow partial match, but only show if confidence is reasonable (the agent sets a threshold that doesn't surface noisy matches).

3. **Tests.**
   - Typing "brutalism" surfaces the Brutalist chip.
   - Clicking it applies the filter and clears the query.
   - No chips render when the query doesn't match any taxonomy value.

### Out of scope for Phase 4

- Spell-correction suggestions ("Did you mean: Brutalist?"). Future work.
- Cross-entity smart suggestions (e.g. "search 'piano' offers a chip for Renzo Piano *the person*"). The agent can include this if it's natural; otherwise defer.

### Risks

- **Threshold tuning.** Easy to surface noisy chips. Start conservative.

---

## Post-rebuild cleanup (separate task, after Phase 4 has shipped and stuck)

Not part of the rebuild itself, but worth tracking:

- `DROP FUNCTION` migrations for `get_map_clusters` (v1) and `get_map_clusters_v2` once `v3` has been live for a release cycle.
- `DROP FUNCTION` for `search_buildings` v1 if Phase 0 didn't do it.
- Audit migrations folder for the ~70 search-related band-aid migrations and consolidate documentation in a single `SEARCH_HISTORY.md` so future engineers understand the lineage without reading 70 SQL files.
- Consider whether `find_nearby_buildings` is still needed; if Find mode handles its callers, deprecate.

---

## Definition of done for the whole rebuild

A user can:

1. Type "Shard" with the map looking at any place on Earth, and the Shard appears as the top result. ✅
2. Type "renzo piano" and see Renzo Piano (the person) and his buildings, ranked sensibly. ✅
3. Type "brutalism" and be offered a "Filter by Brutalist" chip that does the right thing. ✅
4. Pan the map fast and not see the page freeze. ✅
5. Toggle "Show demolished" in filters and have demolished buildings appear on the map. ✅
6. Filter by country in the list view and have it actually filter by country. ✅

A developer can:

1. Read `SearchPage.tsx` and `useBuildingSearch` and understand within 5 minutes which code path serves Find mode and which serves Browse mode.
2. Find one place to tune ranking weights.
3. Add a new filter without touching three different RPCs that conflate filtering with search.
4. Trust that what's on the map is what the filter says is on the map (no hidden exclusions).

---

## Notes for the agent on how to start

1. Before Phase 0, run a fresh `git pull` and confirm the branch is clean.
2. Read `docs/DATA_CONTRACT.md` and `docs/PRD.md § 9 Search & Discovery` end-to-end before touching code.
3. Read `useBuildingSearch.ts` end-to-end — it's the most important file in the system.
4. Skim the last 10 search-related migrations to understand the codebase's SQL conventions (`SECURITY DEFINER`, `SET search_path`, grant pattern, parameter naming).
5. Confirm with the user (the human) before starting each new phase. Each phase ends with "PR merged, deploy verified, ready for next phase." Don't chain phases without a checkpoint.

When the agent is unsure between two reasonable approaches and this document doesn't decide for them, the agent asks the human. The human is non-technical but understands the product deeply and can answer product questions clearly.