// Public surface of the credits feature. Other features import from here rather
// than reaching into `credits/components/*` (ESLint `no-restricted-imports`).

// Types
export type {
  BuildingCreditWithEntities,
  CreditNote,
  CreditRole,
  CreditStatus,
  CreditTier,
  FlagReason,
} from "./types";

// Display helpers
export { creditRoleGroup, formatCreditRoleLabel } from "./formatCreditRole";
export { visiblePrimaryCredits } from "./buildingCreditDisplay";
export { markCreditFlaggedInSession, readSessionFlaggedCreditIds } from "./creditFlagSession";

// Data access
export { flagCredit, buildingCreditsQueryKey, getBuildingCredits } from "./api/credits";

// Components used by other features
export { AddCreditForm } from "./components/AddCreditForm";
export { EditCreditForm } from "./components/EditCreditForm";
export { NotifyCreditedEntitiesStep } from "./components/NotifyCreditedEntitiesStep";
export { CreditNoteSheet } from "./components/CreditNoteSheet";
export {
  CreditedEntitiesSelect,
  type CreditedEntityTag,
} from "./components/CreditedEntitiesSelect";
