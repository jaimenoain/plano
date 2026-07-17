/**
 * Public barrel for the search feature. Cross-feature consumers should import
 * from here (`@/features/search`) rather than reaching into internal modules.
 */
export { useUserSearch } from "./hooks/useUserSearch";
export type { UserSearchResult } from "./hooks/useUserSearch";
