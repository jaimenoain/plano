/**
 * Public surface of the profile feature.
 *
 * Other features import from here, never from `@/features/profile/<internal path>` —
 * see the `no-restricted-imports` deep-feature rule in `eslint.config.js`.
 *
 * Pages are deliberately NOT exported: routes reference them by file path in
 * `app/routes.ts`, and re-exporting them here would drag every profile page
 * (and its import graph) into any feature chunk that touches this barrel.
 */
export { useUserProfile } from './hooks/useUserProfile';
export type { UserProfile } from './hooks/useUserProfile';
export { useUserBuildingStatuses } from './hooks/useUserBuildingStatuses';
export { useProfileComparison } from './hooks/useProfileComparison';
export { FollowButton } from './components/FollowButton';
