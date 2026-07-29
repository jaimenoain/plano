/**
 * Public surface of the awards feature.
 *
 * Other features import from here, never from `@/features/awards/<internal path>` —
 * see the `no-restricted-imports` deep-feature rule in `eslint.config.js`.
 *
 * Pages are deliberately NOT exported: routes reference them by file path in
 * `app/routes.ts`.
 */
export { useAwardsByPerson, useAwardsByCompany } from "./hooks/useAwards";
export { PersonAwardsSection } from "./components/PersonAwardsSection";
export { CompanyAwardsSection } from "./components/CompanyAwardsSection";
