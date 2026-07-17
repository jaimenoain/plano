/**
 * buildFindModeFilters — maps the map's MapFilters into the
 * SearchBuildingsV2Filters shape the Find-mode RPCs accept, so text search
 * respects the same global filters (credits, taxonomy, size, awards, access,
 * library) as Browse mode. Extracted from SearchPage so it can be unit-tested
 * and to keep that component under its size budget.
 *
 * Returns `undefined` when no filters are active (the RPCs treat an absent
 * filter map as "no constraints").
 */
import type { SearchBuildingsV2Filters } from "./api/searchBuildingsV2";
import { resolveConstructionStatuses } from "@/lib/buildingStatus";
import type { MapFilters } from "@/types/plano-map";

export function buildFindModeFilters(filters: MapFilters): SearchBuildingsV2Filters | undefined {
  const f: SearchBuildingsV2Filters = {};
  if (filters.creditCompany?.id) f.credit_company_id = filters.creditCompany.id;
  if (filters.creditRoles?.length) f.credit_roles = filters.creditRoles;
  if (filters.category) f.category_id = filters.category;
  if (filters.typologies?.length) f.typology_ids = filters.typologies;
  if (filters.attributes?.length) f.attribute_ids = filters.attributes;
  // Construction status: mirror the Browse surfaces exactly (explicit picks →
  // inclusion; Show-lost / default → exclusion) so the Building-status filter
  // behaves identically in Find mode.
  const construction = resolveConstructionStatuses(filters);
  if (construction.construction_statuses) f.construction_statuses = construction.construction_statuses;
  if (construction.exclude_construction_statuses) f.exclude_construction_statuses = construction.exclude_construction_statuses;
  if (filters.sizeCategories?.length) f.size_categories = filters.sizeCategories;
  if (filters.minSizeSqm) f.min_size_sqm = filters.minSizeSqm;
  if (filters.maxSizeSqm) f.max_size_sqm = filters.maxSizeSqm;
  if (filters.minStoreys) f.min_storeys = filters.minStoreys;
  if (filters.maxStoreys) f.max_storeys = filters.maxStoreys;
  if (filters.awardId) f.award_id = filters.awardId;
  if (filters.awardOutcome) f.award_outcome = filters.awardOutcome;
  if (filters.awardYearFrom) f.award_year_from = filters.awardYearFrom;
  if (filters.awardYearTo) f.award_year_to = filters.awardYearTo;
  if (filters.accessLevels?.length) f.access_levels = filters.accessLevels;
  if (filters.accessLogistics?.length) f.access_logistics = filters.accessLogistics;
  if (filters.accessCosts?.length) f.access_costs = filters.accessCosts;
  if (filters.centuries?.length) f.centuries = filters.centuries;
  // Library filters — Folders/Collections and Curators & friends — so Find mode
  // narrows to the same set as Browse.
  if (filters.collections?.length) f.collections = filters.collections.map((c) => c.id);
  if (filters.folderIds?.length) f.folders = filters.folderIds;
  const ratedBy = filters.contacts?.map((c) => c.name) ?? filters.ratedBy;
  if (ratedBy?.length) f.rated_by = ratedBy;
  if (filters.filterContacts) f.filter_contacts = true;
  if (filters.contactMinRating) f.contact_min_rating = filters.contactMinRating;
  return Object.keys(f).length > 0 ? f : undefined;
}
