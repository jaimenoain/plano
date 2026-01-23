# QA Report: Geospatial Duplicate Detection ("Radius Check")

## 1. Objective
Verify the implementation of the "Fuzzy" Duplicate Detection Strategy during the "Add Building" workflow.
*   **Trigger**: User attempts to add a building.
*   **Check**: Backend checks for existing buildings within a 50-meter radius.
*   **Outcome**: Block creation and prompt user if duplicate found.

## 2. Forensic Code Review
**Status: PASS**

### Frontend (`src/pages/AddBuilding.tsx`)
*   **Logic**: correctly implements a debounced check using `find_nearby_buildings` RPC.
*   **Radius**: explicitly sets `radius_meters: 50` for the collision detection.
*   **UX**: properly displays a blocking dialog ("Duplicate Building Found") with an option to override (`forceProceedToStep2`).

### Backend (`supabase/migrations/20260428000002_add_image_to_nearby_buildings.sql`)
*   **RPC**: `find_nearby_buildings` correctly uses PostGIS `st_dwithin` with the `geography` type, ensuring accurate geodetic distance calculation.
*   **Logic**: `st_dwithin(b.location, st_point(long, lat)::geography, radius_meters)` handles the 50m constraint accurately.

## 3. Execution Test
**Status: BLOCKED / CRITICAL FAILURE**

### Methodology
*   Created a verification script (`scripts/verify-radius-check.ts`) to directly invoke the `find_nearby_buildings` RPC and query the `buildings` table using the `supabase-js` client.

### Findings
*   **RPC Missing**: The `find_nearby_buildings` function does not exist in the connected database (`PGRST202`).
*   **Table Missing**: The `buildings` table does not exist (`PGRST205`).
*   **Legacy Schema Detected**: The database still contains the `films` table, indicating it is running the legacy "Cineforum" schema. The `scripts/update-schema.ts` script was found to be patching `films` paths to `buildings` paths, confirming the API mismatch.

### Conclusion
The "Geospatial Duplicate Detection" feature cannot be verified or used in the current environment because the database migrations for the "Gut and Remodel" architecture have not been applied.

## 4. Recommended Actions
1.  **Apply Migrations**: Execute the pending SQL migrations against the Supabase project (`gyxspsuctbrxhwiyfvlj`), starting from `20260421000000_gut_and_remodel_for_buildings.sql`.
2.  **Verify Data**: Ensure the `buildings` table is populated and the `location` column uses the correct PostGIS `GEOGRAPHY(POINT)` type.
3.  **Re-Run Test**: Once migrated, re-run the verification logic to confirm the 50m radius check functions as designed.
