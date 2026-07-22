/**
 * Public surface of the guides feature.
 *
 * Other features import from here, never from `@/features/guides/<internal path>` —
 * see the `no-restricted-imports` deep-feature rule in `eslint.config.js`.
 *
 * Pages are deliberately NOT exported: routes reference them by file path in
 * `app/routes.ts`, and re-exporting them here would drag the guides page (and its
 * import graph) into any feature chunk that touches this barrel.
 */
export { usePopularCollections } from "./useGuides";
export { CollectionGuideCard } from "./CollectionGuideCard";
export type { PopularCollection } from "./guidesApi";
