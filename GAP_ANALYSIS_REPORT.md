# Gap Analysis Report

## 1. Executive Summary

The audit confirms that the core architectural transformation ("The Purge" and "Add Building" workflow) has been largely successful. The database schema and core Typescript types are correctly aligned with the "Archiforum" domain (`buildings`, `user_buildings`, `pending`/`visited` statuses).

However, significant "Ghost Code" remains in the frontend, particularly in the Notifications and Admin Dashboard features, which still reference movie-industry concepts. Additionally, a deviation from the Master Plan was detected in the duplicate detection logic (radius size).

## 2. Findings

### 2.1. "Ghost Code" & Legacy Logic (Cleanliness)

The following files contain legacy movie/cinema logic that needs to be refactored:

*   **`src/pages/Notifications.tsx`**:
    *   **Critical:** Contains an `availability` notification type with a `Clapperboard` icon, referring to "streaming availability".
    *   **Logic:** The `getText` helper function references `provider_name` and "streaming".
*   **`src/pages/admin/Dashboard.tsx`**:
    *   **Critical:** Compilation/Runtime Error risk. Passes `trendingFilms` prop to `ContentIntelligenceZone`, which expects `trendingBuildings`.
    *   **Mismatch:** `src/types/admin.ts` correctly defines `trending_buildings`, but the usage in `Dashboard.tsx` is incorrect.
*   **`src/types/admin.ts`**:
    *   **Cosmetic:** Mock data uses legacy usernames like `moviebuff99` and `cinema_club`.
*   **`src/pages/groups/GroupWatchlist.tsx`**:
    *   **Terminology:** Filename refers to "Watchlist", though UI text has been updated to "Bucket List".
*   **`src/components/groups/watchlist/MemberSelector.tsx`**:
    *   **Terminology:** UI text asks "Who's watching?" instead of "Who's visiting?".
*   **`src/pages/Terms.tsx`**, **`src/pages/Onboarding.tsx`**:
    *   **Content:** Text content still refers to "films", "streaming", and "cinema info".

### 2.2. Feature Implementation ("Add Building")

The "Add Building" workflow in `src/pages/AddBuilding.tsx` and `src/components/BuildingForm.tsx` is robust but has one deviation:

*   **Duplicate Detection (Logic Deviation):**
    *   **Plan Requirement:** 50km fuzzy search logic.
    *   **Implementation:** The client code calls `find_nearby_buildings` with `radius_meters: 5000` (5km) for the name-based fuzzy check.
    *   **Impact:** Duplicates located 5-50km away (e.g., in a large metropolitan sprawl) might not be detected if the user pins them slightly differently.
*   **Location Handling (Compliant):**
    *   Correctly extracts `city` and `country` from Google Geocoder.
    *   Correctly constructs a PostGIS-compatible `POINT(lng lat)` string for the `location` column.
*   **Storage (Compliant):**
    *   Images are correctly resized (WebP) and uploaded to the `building-images` bucket.

### 2.3. Client-Side Constraints

*   **Rating Scale:** verified as **1-5 integers** in `PersonalRatingButton.tsx` and `ReviewCard.tsx`.
*   **Status Logic:** verified as using **`pending` / `visited`** enums. Legacy terms `watchlist`/`watched` have been removed from the functional logic in these components.

### 2.4. Type Definitions

*   **Cleanliness:** `Film`, `Movie`, and `StreamingProvider` interfaces have been successfully removed from the core `types.ts` and `supabase/types.ts`.
*   **Alignment:** `Building` interface correctly includes `architects`, `styles` (both string arrays), `year_completed` (integer), `city`, and `country`.

## 3. Recommendations

1.  **Fix Admin Dashboard:** Immediately refactor `Dashboard.tsx` to use `trending_buildings` and pass the correct prop to `ContentIntelligenceZone`.
2.  **Purge Notifications:** Remove the `availability` case from `Notifications.tsx` and clean up legacy providers logic.
3.  **Adjust Duplicate Radius:** Increase the fuzzy search radius in `AddBuilding.tsx` from `5000` to `50000` to match the Master Plan, or verify if 5km was an intentional optimization (and update the plan).
4.  **Rename Files:** Rename `GroupWatchlist.tsx` to `GroupBucketList.tsx` to prevent future confusion.
5.  **Update Static Content:** Perform a text search-and-replace for "watching/film/cinema" in `Terms.tsx` and `Onboarding.tsx`.
