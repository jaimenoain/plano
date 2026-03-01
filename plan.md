1. **Create Migration Script**:
   Create a new migration script under `supabase/migrations/` (e.g., `20270802000002_add_access_filters_to_search_rpcs.sql`) to update the following functions to include access filters.
   - update `get_map_clusters` to include access filters.
   - update `get_map_clusters_v2` to include access filters.
   - update `search_buildings` to include access filters.
   - In each of these, add extraction of `p_access_levels`, `p_access_logistics`, and `p_access_costs` array variables from the JSON `filters` or `filter_criteria` payload.
   - Add WHERE conditions such as:
     `(v_access_levels IS NULL OR cardinality(v_access_levels) = 0 OR b.access_level = ANY(v_access_levels))`
     `(v_access_logistics IS NULL OR cardinality(v_access_logistics) = 0 OR b.access_logistics = ANY(v_access_logistics))`
     `(v_access_costs IS NULL OR cardinality(v_access_costs) = 0 OR b.access_cost = ANY(v_access_costs))`

2. **Update Frontend API calls**:
   - Update `src/features/maps/hooks/useMapData.ts` and `src/features/search/hooks/useBuildingSearch.ts` so they pass `access_levels`, `access_logistics`, and `access_costs` to `filter_criteria` / `filters`.
   - Update the filter variables mapped. For `useMapData.ts`, this means extracting from `filters.accessLevels`, `filters.accessLogistics`, and `filters.accessCosts`. (It seems `MapFilters` in `useMapData.ts` already receives these, just pass them).
   - In `useBuildingSearch.ts`, it seems they are already passed in local mode and also passed in the global `get_map_clusters` mode. Wait, looking at `useBuildingSearch.ts`, they *are* passed into `get_map_clusters` as `access_levels: accessLevels.length > 0 ? accessLevels : undefined`!
   - So the main job is updating the RPCs! But also need to double check `useMapData.ts` because it passes `filterCriteria` to `get_map_clusters_v2` without those access fields. I need to add them to `filterCriteria`.

3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done**.

4. **Submit PR**.
