# Gap Analysis Report - Archiforum Phase 3 Prep

## Executive Summary
This report outlines the findings from a forensic code audit of the "Archiforum" codebase, focusing on the removal of legacy movie-based logic ("The Purge"), the correctness of the "Add Building" workflow, and client-side constraints.

**Overall Status:** The codebase is largely clean and aligned with the "Archiforum" architecture. The "Add Building" workflow is robust. However, several functional bugs related to Polls and Feed displays were identified and fixed during this audit.

## 1. Codebase Cleanliness ("The Purge")

### Findings
- **Legacy Terms:** The terms "film", "movie", and "streaming" still exist in UI text (e.g., `Terms.tsx`, `Onboarding.tsx`) and some variable names. This is mostly cosmetic but should be addressed in a future cleanup pass.
- **Legacy Poll Types (Fixed):** The `film_selection` poll type was still being used in active UI components (`PollDetails.tsx`, `PollCard.tsx`), which would have caused crashes or incorrect behavior as it relied on deleted movie data structures.
- **Schema Alignment:** The database schema correctly uses `building_selection`, but frontend code was lagging behind.

### Actions Taken
- **Polls:** Refactored `PollDetails.tsx`, `PollCard.tsx`, and `PollDialog.tsx` to use `building_selection`.
- **Legacy Handling:** `PollDialog.tsx` retains a "Safe Mode" migration check to map any stray legacy `film_selection` polls to `general` type to prevent crashes.

## 2. Feature Implementation ("Add Building" Workflow)

### Findings
- **Duplicate Detection:** The implementation in `AddBuilding.tsx` correctly follows the "Dual-Vector" strategy:
    - **Strict Location:** Checks a 50m radius.
    - **Fuzzy Name:** Checks a 5km radius with name similarity.
- **Location Handling:** The `location` field is correctly constructed as a complex object compatible with PostGIS, extracting City and Country logic from Geocoder results.
- **Storage:** Image uploads are correctly targeted to the `building-images` bucket.

### Actions Taken
- Verified implementation. No changes required.

## 3. Client-Side Constraints & Logic

### Findings
- **Rating Scale:** The `PersonalRatingButton` correctly enforces a 1-5 integer scale.
- **Status Logic (Fixed):** The `ReviewCard` component was checking for a legacy `watchlist` status string. The database uses `pending`. This meant the "Wants to visit" UI indicator was never checking.

### Actions Taken
- **Review Cards:** Updated `ReviewCard.tsx` to check for `status === 'pending'`. The UI now correctly displays the "Wants to visit" indicator for backlog items.

## 4. Recommendations
1.  **Cosmetic Cleanup:** Schedule a low-priority task to replace remaining "film" and "movie" text in `Terms.tsx` and `Onboarding.tsx` with "building" and "architecture".
2.  **Testing:** Manually verify the "Add Building" flow and Poll creation to ensure the new `building_selection` type works end-to-end.
