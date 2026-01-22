# Gap Analysis Report - Archiforum Phase 3 Prep

## 1. Executive Summary
The "Archiforum" migration is largely successful in its structural transition from a movie-based PWA to an architecture social network. The database schema, core types, and the critical "Add Building" workflow are aligned with the Master Plan.

## 2. Codebase Cleanliness (The Purge)

### Status: ✅ Pass

The codebase has been successfully stripped of legacy movie logic.

*   **API & Functions:** No lingering `tmdb-*` calls found.
*   **Data Types:** `Film`, `Movie`, and `StreamingProvider` types have been removed. `Notification` and `Admin` types have been updated.
*   **Components:**
    *   `Leaderboards.tsx` (Legacy) -> **Deleted**.
    *   `GroupStats.tsx` (Legacy) -> **Deleted**.
    *   `PollResults.tsx` -> **Refactored** to support `building` media type.
    *   `VotingForm.tsx` -> **Refactored** to support `building` media type.
    *   `NotificationSettingsDialog.tsx` -> **Cleaned** of provider availability settings.
*   **Documentation:** Legacy `SEARCH.md` and `SEARCH_RPC_BEST_PRACTICES.md` files have been deleted.

## 3. Feature Implementation Check ("Add Building" Workflow)

### Status: ✅ Pass

The "Add Building" workflow is implemented correctly according to the Master Plan specifications.

*   **Duplicate Detection Logic:**
    *   **Strict Check:** Confirmed 50m radius check for collision detection.
    *   **Fuzzy Check:** Confirmed 50km radius check (`radius_meters: 50000`) with name similarity logic (`similarity_score > 0.3`).
*   **Location Handling:**
    *   `AddBuildingDetails.tsx` correctly constructs the PostGIS `POINT(lng lat)` string for the `location` column.
    *   City and Country extraction logic is centralized and functional.
*   **Storage Integration:**
    *   Images are correctly uploaded to the `building-images` bucket in `src/components/BuildingForm.tsx`.

## 4. Client-Side Constraints & Logic

### Status: ✅ Pass

The frontend logic correctly adheres to the new domain constraints.

*   **Rating Scale:** `PersonalRatingButton.tsx` enforces a strict 1-5 integer scale.
*   **Status Logic:**
    *   `pending` maps to "Bucket List".
    *   `visited` maps to "Visited".
    *   The legacy `watchlist` and `watched` terms are effectively removed from the active logic in the "Add Building" flow.
*   **Admin Dashboard:**
    *   Verified that `Dashboard.tsx` and `ContentIntelligenceZone.tsx` correctly use `trendingBuildings` and architectural data structures.

## 5. Conclusion

The codebase is clean, consistent, and ready for Phase 3 development. All identified legacy "Ghost Code" has been remediated.
