1. **Create Supabase Migration (`supabase/migrations/20270810000000_add_lost_building_status.sql`)**
   - Execute `ALTER TYPE building_status ADD VALUE IF NOT EXISTS 'Lost';`
   - Run `UPDATE buildings SET status = 'Lost' WHERE status = 'Demolished';`
   - Update `get_map_clusters` to include `b.status::text IS DISTINCT FROM 'Lost'` where `Demolished` is ignored (Based on the latest function in `20270803000000_add_construction_status_filter_to_search_rpcs.sql`). Wait, if I'm doing `DISTINCT FROM 'Demolished'`, I should just replace `DISTINCT FROM 'Demolished'` with `NOT IN ('Demolished', 'Lost')` or `IS DISTINCT FROM 'Demolished' AND b.status::text IS DISTINCT FROM 'Lost'` in both `get_map_clusters` and `get_map_clusters_v2` definitions from the latest migration `20270803000000_add_construction_status_filter_to_search_rpcs.sql`.

2. **Update Frontend UI & Forms**
   - In `src/components/BuildingForm.tsx`, add `'Lost'` to `STATUS_OPTIONS`.
   - In `src/features/maps/components/FilterDrawer.tsx`, add `{ id: 'Lost', name: 'Lost' }` below Demolished in the filter options.
   - In `src/features/search/utils/searchFilters.ts`, update `isRemoved` logic to `b.status === 'Demolished' || b.status === 'Lost' || ...`
   - In `src/features/search/components/DiscoveryBuildingCard.tsx`, add `|| building.status === 'Lost'` to display the unbuilt/demolished badge logic, and change the badge rendering logic to show 'Lost' if the status is 'Lost'.
   - Update `src/features/search/components/DiscoveryBuildingCard.overflow.test.tsx` to use 'Lost' instead of 'Demolished' (or add a new test case for 'Lost').
   - In `src/pages/BuildingDetails.tsx`, update the logic showing 'Demolished' badge to also check for and show 'Lost'. Update `{(building.status === 'Demolished' || building.status === 'Unbuilt' || building.status === 'Under Construction' || building.status === 'Lost') && (` and the conditional badge text logic inside.

3. **Update Validation & Types**
   - In `src/features/search/components/types.ts` and `src/lib/validations/building.ts`, add `'Lost'` to the allowed values for `status`.
   - Wait, `types.ts` has `status?: 'Built' | 'Under Construction' | 'Unbuilt' | 'Demolished' | 'Temporary' | null;`, so add `'Lost'`.

4. **Verify Backend and Pre-commit Steps**
   - Review changes locally.
   - Run type checker `npm run typecheck` or similar.
   - Run `pre_commit_instructions` and follow steps before submitting.

Let's check if there are other files using `'Demolished'` in src.
