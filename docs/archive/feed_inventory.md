# Feed Inventory (Phase 0, 2026-05-13)

> Snapshot of every feed-related artifact in the codebase at the start of the [Feed Redesign Roadmap](../ROADMAP.md). Two columns per row: what it does, and which rebuild phase will touch it. "—" means untouched by the rebuild.

## RPCs (Supabase migrations)

Latest defining migration shown for each RPC; band-aid migrations not listed individually.

| RPC | Latest defining migration | What it does | Touched by |
|---|---|---|---|
| `get_feed` | `20270895000000_fix_feed_rpcs_final.sql` | Reverse-chrono posts from followed users + own posts. Visibility-aware. | Phase 1 (read as reference), Phase 2 (merge), post-rebuild cleanup (drop if unreferenced) |
| `get_collections_feed` | `20270813000000_add_get_collections_feed.sql` (+ `20270817000000_collections_feed_preview_community_url.sql`) | Curated collection cards injected every ~4 social cards. | Phase 2 (+ `ring` column) |
| `get_discovery_feed` | `20270867000000_discovery_feed_tiered_location.sql` (tiered-location overload; legacy overload dropped in `20270863000000_drop_legacy_get_discovery_feed_overload.sql`) | Cold-start fallback feed for 0-follow users, tier-based location prioritisation. | Phase 2 (+ `ring` column), possibly inlined |
| `get_suggested_posts` | (legacy; see `20260905000000_get_discovery_feed.sql` lineage) | Older name for discovery suggestions; still referenced by `useSuggestedFeed`. | Phase 2 (retired or unified) |
| `track_note_views` | `20270879000000_note_views.sql` | Records one "view" per note per user per session; self-views filtered server-side. | Phase 0 (wrapped by `useSeenItems`), unchanged otherwise |
| `get_feed_ranked` | _not yet created_ | Phase 1 ranker over ring-1 candidates. | Phase 1 (new) |
| `get_feed_extended` | _not yet created_ | Phase 4 ring-2 ranker (posts liked by ring-1 users). | Phase 4 (new) |
| `get_building_spotlights` | _not yet created_ | Phase 5 building-as-subject card source. | Phase 5 (new) |
| `get_feed_clusters` | _not yet created_ | Phase 7 multi-actor / multi-photo / multi-building clusters. | Phase 7 (new) |

Supporting migrations of note: `20270814000000_get_feed_add_main_image_url.sql`, `20270815000000_feed_building_data_community_preview_url.sql`, `20270839000000_feed_main_image_and_steward_rls.sql`, `20270840000000_get_feed_ambiguous_id_plpgsql.sql`, `20270843000000_feed_user_data_followers_count.sql`, `20270857000000_locality_feed_and_leaderboard_urls.sql`, `20270859000000_get_discovery_feed_building_credits.sql`, `20270860000000_discovery_feed_extended_filters.sql`, `20270861000000_discovery_feed_contact_filter_fix.sql`, `20270862000000_discovery_feed_city_contact_media.sql`, `20270866000000_discovery_feed_location_filter_fix.sql`, `20270871000000_optimize_feed_rpcs.sql`, `20270873000000_fix_get_feed_security_definer.sql`, `20270896000000_fix_feed_silent_visits.sql`.

## Hooks (`src/features/feed/hooks/`)

| Hook | What it does | Touched by |
|---|---|---|
| `useFeed.ts` | Primary social feed (`get_feed`), infinite-query, like/image-like mutations, merges event attendance. | Phase 1 (refactor for ranker behind flag), Phase 2 (unified merge) |
| `useCollectionsFeed.ts` | Curated collections feed (`get_collections_feed`), infinite-query. | Phase 2 (consume ring column) |
| `useDiscoveryFeed.ts` | Discovery feed (`get_discovery_feed`) — Explore tab + cold-start path. | Phase 2 (consume ring column, possibly inlined) |
| `useSuggestedFeed.ts` | Cold-start suggestions for the Index page; tested under `useSuggestedFeed.test.tsx`. | Phase 2 (retired or rolled into unified merge) |
| `useReviewCardData.ts` | Per-card derived data (mainTitle, avatar URL, etc.) — pure adapter over `FeedReview`. | — |
| `useTrackNoteView.ts` | IntersectionObserver dwell-tracking that calls `queueNoteView` from `noteViewTracker`. | Phase 0 (`useSeenItems` wraps the same RPC; this hook keeps its imperative dwell role) |
| `useSeenItems` (new) | Phase 0 — session `Set<string>` + debounced flush wrapping `track_note_views`. | Phase 0 (new), Phase 1 (consumed by `scoreFeedItem` seen_penalty) |

## Components (`src/features/feed/components/`)

### Live (imported by at least one non-test consumer)

| Component | What it does | Touched by |
|---|---|---|
| `ActivityStream.tsx` | Wraps a list of `FeedActivityRow`s. | Phase 3 (replaced by mosaic) |
| `AllCaughtUpDivider.tsx` | "You're all caught up" pagination divider. | Phase 3 (likely retired) |
| `ColdStartFeed.tsx` | 0-follow fork: editorial prompt + `PeopleYouMayKnow` + featured building + community discovery list. | Phase 2 (retired) |
| `ContactFacepile.tsx` | Stacked avatars for clusters. | Phase 7 (reused by `<MomentClusterCard>`) |
| `DiscoveryCard.tsx` | Compact discovery suggestion card. | Phase 3 (adapted or retired) |
| `EmptyFeed.tsx` | Empty-state placeholder. | Phase 2 (retired — unified surface) |
| `ExploreTeaserBlock.tsx` | Inline "explore the community" teaser using discovery feed. | Phase 2 |
| `FeedActivityRow.tsx` | One-line "X visited / wants to visit Y" row. | Phase 3 (right-rail only; mosaic uses cards) |
| `FeedCard.tsx` | Generic feed-card wrapper; mounts `useTrackNoteView`. | Phase 0 (no change), Phase 3 (mosaic-adapt) |
| `FeedCardA.tsx` | Text-only / pull-quote layout. | Phase 0 (attribution), Phase 3 (`tileSize`) |
| `FeedCardB.tsx` | Text + media layout. | Phase 0 (attribution), Phase 3 (`tileSize`) |
| `FeedCardC.tsx` | Media-only layout. | Phase 0 (attribution), Phase 3 (`tileSize`) |
| `FeedClusterCard.tsx` | Existing locality / contact cluster card. | Phase 7 (extended into `<MomentClusterCard>`) |
| `FeedCollectionCard.tsx` | Curated collection tile in feed stream. | Phase 0 (attribution), Phase 2 (ring-aware) |
| `FeedEventAttendanceRow.tsx` | "N people you follow are going to event X" row. | Phase 7 (event clustering parity) |
| `FeedPhotoCarousel.tsx` | Multi-photo carousel inside cards. | Phase 3 (mosaic tile-size adapt) |
| `FeedResolvedEntry.tsx` | Resolves a `FeedReview` to the correct card type (A/B/C/cluster/activity). | Phase 3 (extended for new variants) |
| `FeedRightRail.tsx` | 320px sticky right rail (recent activity, suggested follows). | — (orthogonal) |
| `PeopleYouMayKnow.tsx` | Suggested-follows widget. | Phase 2 (wrapped as `prompt` `FeedItem`) |
| `ReviewCardFeed.tsx` | Wrapper that picks A/B/C/cluster/activity. | Phase 3 (extended) |
| `SectionDivider.tsx` | Visual divider between sections. | Phase 3 |
| `SuggestedContentBlock.tsx` | Suggested-content block in the cold-start path. | Phase 2 |
| `TrendingBuildings.tsx` | Trending-buildings widget. | Phase 5 (superseded by spotlights) |
| `card-parts/*` (`ActivityLead`, `BuildingHeadline`, `BuildingSubtitle`, `CardImage`, `CardMeta`, `CardAuthor`) | Reusable card primitives. | Phase 0 (`CardAttribution` joins here) |
| `card-primitives/*` (`CardBookmark`, `CardFooter`, `PointsBadge`) | Generic card primitives. | — |
| `detail/*` (`DetailByline`, `DetailCardA`, `DetailCardB`, `DetailCardC`, `DetailCardNoMedia`, `DetailCardWithMedia`, `DetailCardTextTreatmentBlock`, `DetailCardFootnote`) | Detail-page card variants for `/review/:id`. | Phase 3 (mosaic doesn't touch the detail route directly) |
| `landing/*` (`LandingHero`, `LandingMarquee`, `LandingFeatureGrid`, `LandingNav`, `LandingFooter`) | Logged-out landing page. | — |

### Dead (no non-test importer; confirmed via grep)

| Component | Why suspected dead | Verification |
|---|---|---|
| `BucketListWidget.tsx` | No file outside itself references `BucketListWidget`. The Feed Redesign brief §6 lists it as a future personal-hooks source, so leave in place but flag for re-wiring in Phase 6. | `grep -rln "BucketListWidget" src` → only `BucketListWidget.tsx`. |
| `DetailCard.tsx` | `DetailCard` is exported via `feed/index.ts` and referenced from `card-types` discriminators in `src/types/cards.ts` and from `resolveCardType.ts` — but the .tsx component itself has no JSX importer outside its own file. | `grep -rln "from.*DetailCard\"" src` → none. The string `DetailCard` appears as a *type name* discriminator only. |
| `DetailSectionHeader.tsx` | No file outside itself references the component. | `grep -rln "DetailSectionHeader" src` → only `DetailSectionHeader.tsx`. |
| `ExploreByStyle.tsx` | No file outside itself references the component. | `grep -rln "ExploreByStyle" src` → only `ExploreByStyle.tsx`. |
| `FeedHero.tsx` | Referenced only by `FeedPhotoCarousel.tsx` as a *type* import; no JSX consumer renders `<FeedHero>`. | `grep -rln "FeedHero" src` → `FeedHero.tsx` and `FeedPhotoCarousel.tsx` (type-only edge). |

Dead-code entries are flagged but **not deleted in Phase 0**. They will be removed in post-rebuild cleanup once each phase confirms they remain unreferenced through to flag flip.

## Types (`src/types/`)

| File | What it holds | Touched by |
|---|---|---|
| `feed.ts` | `FeedReview`, `RawFeedRow`, `FeedCollection`, `RawCollectionFeedRow`, `FeedEventAttendance`, `FeedHomeEntry` union, `creditedEntitiesFromRpcJson`. | Phase 0 (kept; `FeedItem` wraps it), Phase 2+ (additive) |
| `feedItem.ts` (new in Phase 0) | `FeedItem` discriminated union (`post`, `collection`); ring + score + attribution fields shared across variants. | Phase 0 (new), every later phase adds variants |
| `cards.ts` | Card-type discriminators (A/B/C/Detail). | Phase 3 (extended for tile sizes) |

## Utils (`src/features/feed/utils/`)

| File | What it does | Touched by |
|---|---|---|
| `resolveCardType.ts` | Maps a `FeedReview` to a layout type (A/B/C/activity/cluster). | Phase 3 (extended for new variants) |
| `noteViewTracker.ts` | Module-level batcher for `track_note_views`. | Phase 0 (`useSeenItems` consumes the same primitives) |
| `deriveLegacyFeedUi.ts` | Older mapping helper retained for compat tests. | Phase 3 or later (retired) |

## Pages

| File | What it does | Touched by |
|---|---|---|
| `src/features/feed/pages/Index.tsx` | The feed surface. Stitches `useFeed` + `useCollectionsFeed` + `useSuggestedFeed`, branches into `ColdStartFeed` for empty social feeds, interleaves collections every 4 cards and discovery posts every 8. | Phase 1 (consume ranker behind flag), Phase 2 (retire cold-start fork), Phase 3 (mosaic surface) |
