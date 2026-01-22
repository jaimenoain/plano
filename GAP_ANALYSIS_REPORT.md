# Gap Analysis Report

## 1. Executive Summary
The forensic audit of the "Archiforum" codebase confirms that the migration from a movie-based PWA to an architecture social network is largely complete and aligned with the "Master Plan". The "Purge" of legacy movie logic is successful, with no active functional code remaining for TMDB or movie-specific entities. The "Add Building" workflow implements the required duplicate detection and location handling logic. Client-side constraints for ratings and status are correctly enforced.

## 2. "The Purge" Verification (Codebase Cleanliness)
**Status: PASS**

*   **API & Functions:** No active `tmdb-*` function calls or API keys were found.
*   **Data Types:** `src/integrations/supabase/types.ts` correctly defines `buildings` and `user_buildings` without legacy `films` or `user_films` tables.
*   **Ghost Code:**
    *   **Icons:** Minor usage of `Film` icon in `src/pages/UpdatePassword.tsx` and `src/pages/groups/polls/PollDetails.tsx` (imported from `lucide-react`). This is a cosmetic issue, not functional.
    *   **Mock Data:** `src/types/admin.ts` contains a mock data string "Indie Movie Night", likely a leftover from a template.
    *   **Comments:** Legacy comments referencing TMDB removal exist (e.g., in `BuildingDetails.tsx`), serving as historical notes.

## 3. Feature Implementation Check ("Add Building" Workflow)
**Status: PASS**

*   **Duplicate Detection Logic:**
    *   **Implemented:** Yes, in `src/pages/AddBuilding.tsx`.
    *   **Mechanism:** Two-pronged approach:
        1.  **Strict Location:** 50m radius search (RPC `find_nearby_buildings`).
        2.  **Fuzzy Name:** 50km radius search filtered client-side for `similarity_score > 0.3`.
    *   **Logic:** Correctly sorts duplicates by distance and handles merging of results.
*   **Location Handling:**
    *   **Implemented:** Yes, in `AddBuilding.tsx` and `BuildingLocationPicker.tsx`.
    *   **Data Structure:** Handles `lat`, `lng`, `address`, `city`, and `country`. Uses `extractLocationDetails` to parse Google Maps Geocoding results for city/country.
*   **Storage Integration:**
    *   **Implemented:** Yes, in `src/components/BuildingForm.tsx`.
    *   **Bucket:** Correctly uploads to `building-images`.
    *   **Optimization:** Implements image compression (2048px max, WebP, 0.8 quality).

## 4. Client-Side Constraints & Logic
**Status: PASS**

*   **Rating Scale:**
    *   **Enforcement:** `PersonalRatingButton.tsx` explicitly renders 5 stars and handles 1-5 integer input.
    *   **Display:** Shows "{rating}/5".
*   **Status Logic:**
    *   **Enums:** `src/types/user_buildings.ts` defines `status` as `'pending' | 'visited'`.
    *   **Usage:** `AddBuilding.tsx` uses "Bucket List" (pending) and "Visited" (visited) actions.
*   **Validation:**
    *   `src/lib/validations/building.ts` enforces `year_completed` as a nullable integer and ensures `name` is present.

## 5. Recommendations
*   **Cleanup:** Remove the `Film` icon usage in `PollDetails.tsx` and `UpdatePassword.tsx` and replace with `Building2` or similar to match the domain.
*   **Cleanup:** Update the mock data in `src/types/admin.ts` to remove "Indie Movie Night".
*   **Verification:** Ensure `src/lib/validations/building.ts` is kept in sync if new fields are added to the `buildings` table.
