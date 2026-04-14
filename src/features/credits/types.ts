/**
 * Application-layer DTOs for Building Credits v2 (people, companies, credits).
 * Field names are camelCase; map from DB rows in API layer. Source of truth: `docs/DATA_CONTRACT.md` sections 9a–9e.
 */

export type PersonClaimStatus = "unclaimed" | "claimed" | "verified";

export type CompanyStewardRole = "owner" | "steward";

export type CreditTier = "primary" | "contributor" | "ancillary";

export type CreditStatus = "active" | "verified" | "flagged" | "hidden";

export type FlagReason = "wrong_person" | "never_involved" | "wrong_role" | "other";

export type CreditRole =
  | "design_architect"
  | "architect_of_record"
  | "executive_architect"
  | "interior_architect"
  | "landscape_architect"
  | "urban_designer"
  | "conservation_architect"
  | "structural_engineer"
  | "mep_engineer"
  | "civil_engineer"
  | "geotechnical_engineer"
  | "facade_engineer"
  | "wind_consultant"
  | "acoustic_consultant"
  | "fire_engineer"
  | "lighting_designer"
  | "developer"
  | "main_contractor"
  | "project_manager"
  | "cost_consultant"
  | "planning_consultant"
  | "graphic_wayfinding_designer"
  | "art_consultant"
  | "sustainability_consultant"
  | "heritage_consultant"
  | "other";

export interface Person {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  nationality: string | null;
  birthYear: number | null;
  deathYear: number | null;
  avatarUrl: string | null;
  website: string | null;
  locationNote: string | null;
  claimedByUserId: string | null;
  claimStatus: PersonClaimStatus;
  createdAt: string;
  updatedAt: string;
}

/** Search / picker row: disambiguation context for duplicate names */
export interface PersonSummary {
  id: string;
  name: string;
  slug: string;
  claimStatus: PersonClaimStatus;
  associatedCompanies: string[];
  knownBuilding: string | null;
  /** Set by `searchPeople` for global search / sidebar (optional for narrow picker queries). */
  nationality?: string | null;
  avatarUrl?: string | null;
  creditCount?: number;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  country: string | null;
  foundedYear: number | null;
  dissolvedYear: number | null;
  logoUrl: string | null;
  website: string | null;
  verifiedDomain: string | null;
  claimStatus: PersonClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySummary {
  id: string;
  name: string;
  slug: string;
  claimStatus: PersonClaimStatus;
  country: string | null;
  logoUrl: string | null;
  /** Count of visible `building_credits` rows for this company (search picker disambiguation). */
  creditCount: number;
}

export interface CompanySteward {
  id: string;
  companyId: string;
  userId: string;
  role: CompanyStewardRole;
  invitedBy: string | null;
  createdAt: string;
}

/** Steward row with public profile fields for company admin UI (RLS: stewards only). */
export interface CompanyStewardWithProfile extends CompanySteward {
  username: string | null;
  avatarUrl: string | null;
}

export interface PersonCompanyAffiliation {
  id: string;
  personId: string;
  companyId: string;
  yearFrom: number | null;
  yearTo: number | null;
  roleNote: string | null;
  createdAt: string;
}

export interface BuildingCredit {
  id: string;
  buildingId: string;
  personId: string | null;
  companyId: string | null;
  role: CreditRole;
  roleCustom: string | null;
  creditTier: CreditTier;
  isLead: boolean;
  contributionNotes: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  projectUrl: string | null;
  status: CreditStatus;
  flagReason: FlagReason | null;
  flagNotes: string | null;
  flaggedAt: string | null;
  /** Set when `status === 'flagged'`: prior status (`active` or `verified`) from `flag_building_credit`. */
  flaggedFromStatus: Extract<CreditStatus, "active" | "verified"> | null;
  flaggedByUserId: string | null;
  addedByUserId: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Credit row with joined person/company labels for building detail and lists */
export interface BuildingCreditWithEntities extends BuildingCredit {
  person: { id: string; name: string; slug: string; avatarUrl?: string | null } | null;
  company: { id: string; name: string; slug: string; logoUrl?: string | null } | null;
}

/** Flagged-credits admin queue row with claim context for countdown / warnings. */
export interface FlaggedCreditModerationItem extends BuildingCredit {
  person: { id: string; name: string; slug: string; claimStatus: PersonClaimStatus } | null;
  company: { id: string; name: string; slug: string; claimStatus: PersonClaimStatus } | null;
  building: { id: string; name: string; slug: string | null; shortId: number | null };
  addedByUsername: string | null;
}

/** Building fields joined to a credit on person views (maps to `buildings` columns; camelCase). */
export interface BuildingSummaryForPersonCredit {
  id: string;
  name: string;
  slug: string | null;
  shortId: number | null;
  city: string | null;
  country: string | null;
  yearCompleted: number | null;
  heroImageUrl: string | null;
  mainImageUrl: string | null;
  communityPreviewUrl: string | null;
}

/** One credit on a person profile with resolved building row. */
export interface PersonCreditWithBuilding extends BuildingCreditWithEntities {
  building: BuildingSummaryForPersonCredit;
}

/** `getPerson`: full row plus all visible credits and building summaries. */
export interface PersonWithCredits {
  person: Person;
  credits: PersonCreditWithBuilding[];
}

/** One portfolio row under a credit tier (`getPersonPortfolio`). */
export interface PersonPortfolioItem {
  credit: BuildingCreditWithEntities;
  building: BuildingSummaryForPersonCredit;
}

/** Credits for a person grouped by tier (stable key order: primary → contributor → ancillary). */
export interface PersonPortfolioByTier {
  primary: PersonPortfolioItem[];
  contributor: PersonPortfolioItem[];
  ancillary: PersonPortfolioItem[];
}

/** One credit on a company profile with resolved building row. */
export interface CompanyCreditWithBuilding extends BuildingCreditWithEntities {
  building: BuildingSummaryForPersonCredit;
}

/** `getCompany`: full row plus all visible credits and building summaries. */
export interface CompanyWithCredits {
  company: Company;
  credits: CompanyCreditWithBuilding[];
}

/** One portfolio row under a credit tier (`getCompanyPortfolio`). */
export interface CompanyPortfolioItem {
  credit: BuildingCreditWithEntities;
  building: BuildingSummaryForPersonCredit;
}

/** Credits for a company grouped by tier (`getCompanyPortfolio`). */
export interface CompanyPortfolioByTier {
  primary: CompanyPortfolioItem[];
  contributor: CompanyPortfolioItem[];
  ancillary: CompanyPortfolioItem[];
}
