/**
 * Public barrel for the search feature. Cross-feature consumers should import
 * from here (`@/features/search`) rather than reaching into internal modules.
 */
export { useUserSearch } from "./hooks/useUserSearch";
export type { UserSearchResult } from "./hooks/useUserSearch";
export type { DiscoveryBuilding } from "./components/types";
export { DiscoveryList } from "./components/DiscoveryList";
export { DiscoveryFiltersPanel, MultiSelectCheckboxList } from "./components/DiscoveryFiltersPanel";
export { searchBuildingsV2, discoveryBuildingFromSearchHit } from "./api/searchBuildingsV2";
export type { BuildingSearchHit } from "./api/searchBuildingsV2";
export { SearchPageShell } from "./SearchPage";
