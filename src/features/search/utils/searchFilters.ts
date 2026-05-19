
export interface BuildingFilterData {
  id: string;
  functional_category_id?: string | null;
  typologies?: { typology_id: string }[];
  attributes?: { attribute_id: string }[];
  /** Person or company UUIDs with a non-hidden credit on this building */
  creditedEntityIds?: string[];
  access_level?: string | null;
  access_logistics?: string | null;
  access_cost?: string | null;
  status?: string | null;
  size_category?: string | null;
  size_sqm?: number | null;
  storeys?: number | null;
  century?: number | null;
  [key: string]: unknown; // Allow passing through other fields like id, location, etc.
}

export interface FilterCriteria {
  categoryId?: string | null;
  typologyIds: string[];
  attributeIds: string[];
  selectedCreditEntityIds: string[]; // person or company UUIDs
  collectionIds?: string[];
  folderIds?: string[];
  personalMinRating?: number;
  materials?: string[];
  styles?: string[];
  contexts?: string[];
  accessLevels?: string[];
  accessLogistics?: string[];
  accessCosts?: string[];
  constructionStatuses?: string[];
  sizeCategories?: string[];
  minSizeSqm?: number | null;
  maxSizeSqm?: number | null;
  minStoreys?: number | null;
  maxStoreys?: number | null;
  centuries?: number[];
  userCollectionMap?: Record<string, Set<string>>;
  userRatings?: Record<string, number>;
}

export function filterLocalBuildings(
  buildings: BuildingFilterData[],
  filters: FilterCriteria
): BuildingFilterData[] {
  return buildings.filter((b) => {
    // 1. Collections (OR within collections)
    if (filters.collectionIds && filters.collectionIds.length > 0) {
      if (!filters.userCollectionMap) return false;
      const isInAnyCollection = filters.collectionIds.some(colId =>
        filters.userCollectionMap![colId]?.has(b.id)
      );
      if (!isInAnyCollection) return false;
    }

    // 2. Personal Rating (>=)
    if (filters.personalMinRating && filters.personalMinRating > 0) {
       if (!filters.userRatings) return false;
       const rating = filters.userRatings[b.id] || 0;
       if (rating < filters.personalMinRating) return false;
    }

    // Category (Exact Match)
    if (filters.categoryId && b.functional_category_id !== filters.categoryId) {
      return false;
    }

    // Typologies (Any Match / OR)
    if (filters.typologyIds.length > 0) {
      const buildingTypologyIds = b.typologies?.map((t) => t.typology_id) || [];
      const hasMatch = filters.typologyIds.some((id) =>
        buildingTypologyIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Extract attributes once for reuse
    const buildingAttributeIds = b.attributes?.map((a) => a.attribute_id) || [];

    // Materials (Any Match / OR)
    if (filters.materials && filters.materials.length > 0) {
      const hasMatch = filters.materials.some((id) =>
        buildingAttributeIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Styles (Any Match / OR)
    if (filters.styles && filters.styles.length > 0) {
      const hasMatch = filters.styles.some((id) =>
        buildingAttributeIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Contexts (Any Match / OR)
    if (filters.contexts && filters.contexts.length > 0) {
      const hasMatch = filters.contexts.some((id) =>
        buildingAttributeIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Attributes (Generic) (Any Match / OR)
    if (filters.attributeIds.length > 0) {
      const hasMatch = filters.attributeIds.some((id) =>
        buildingAttributeIds.includes(id)
      );
      if (!hasMatch) return false;
    }

    // Credited people / companies (Any Match / OR)
    if (filters.selectedCreditEntityIds.length > 0) {
      const ids = b.creditedEntityIds ?? [];
      const hasMatch = filters.selectedCreditEntityIds.some((id) => ids.includes(id));
      if (!hasMatch) return false;
    }

    // Access Level
    if (filters.accessLevels && filters.accessLevels.length > 0) {
        if (!b.access_level || !filters.accessLevels.includes(b.access_level)) {
            return false;
        }
    }

    // Entry Logistics
    if (filters.accessLogistics && filters.accessLogistics.length > 0) {
        if (!b.access_logistics || !filters.accessLogistics.includes(b.access_logistics)) {
            return false;
        }
    }

    // Cost
    if (filters.accessCosts && filters.accessCosts.length > 0) {
        if (!b.access_cost || !filters.accessCosts.includes(b.access_cost)) {
            return false;
        }
    }

    // Construction Status
    if (filters.constructionStatuses && filters.constructionStatuses.length > 0) {
      if (!b.status || !filters.constructionStatuses.includes(b.status)) {
        return false;
      }
    } else {
      // Default exclusion if no filter provided (match backend default)
      const excludedStatuses = ['Demolished', 'Lost', 'Under Construction', 'Unbuilt'];
      if (b.status && excludedStatuses.includes(b.status)) {
        return false;
      }
    }

    // Size Category
    if (filters.sizeCategories && filters.sizeCategories.length > 0) {
      if (!b.size_category || !filters.sizeCategories.includes(b.size_category)) {
        return false;
      }
    }

    // Size (sqm) Range
    if (filters.minSizeSqm !== null && filters.minSizeSqm !== undefined && filters.minSizeSqm > 0) {
      if (b.size_sqm === null || b.size_sqm === undefined || b.size_sqm < filters.minSizeSqm) {
        return false;
      }
    }
    if (filters.maxSizeSqm !== null && filters.maxSizeSqm !== undefined) {
      if (b.size_sqm === null || b.size_sqm === undefined || b.size_sqm > filters.maxSizeSqm) {
        return false;
      }
    }

    // Storeys Range
    if (filters.minStoreys !== null && filters.minStoreys !== undefined && filters.minStoreys > 1) {
      if (b.storeys === null || b.storeys === undefined || b.storeys < filters.minStoreys) {
        return false;
      }
    }
    if (filters.maxStoreys !== null && filters.maxStoreys !== undefined) {
      if (b.storeys === null || b.storeys === undefined || b.storeys > filters.maxStoreys) {
        return false;
      }
    }

    if (filters.centuries && filters.centuries.length > 0) {
      if (b.century == null || !filters.centuries.includes(b.century)) {
        return false;
      }
    }

    return true;
  });
}

export interface ClientFilterContext {
  hideSaved: boolean;
  hideVisited: boolean;
  hideHidden: boolean;
  hideWithoutImages: boolean;
  userStatuses: Record<string, string>;
}

export function applyClientFilters<T extends { id: string; status?: string | null; main_image_url?: string | null }>(
  buildings: T[],
  filters: ClientFilterContext
): T[] {
  return buildings.filter((b) => {
    // 1. Filter out buildings without images if requested
    if (filters.hideWithoutImages && !b.main_image_url) {
      return false;
    }

    // 2. Filter out "Ignored" by user
    const userStatus = filters.userStatuses[b.id];
    if (filters.hideHidden && userStatus === 'ignored') {
      return false;
    }

    // 3. Apply Exclusion Logic
    // If Hide Saved is ON, remove if userStatus is 'pending'
    if (filters.hideSaved && userStatus === 'pending') {
      return false;
    }

    // If Hide Visited is ON, remove if userStatus is 'visited'
    if (filters.hideVisited && userStatus === 'visited') {
      return false;
    }

    return true;
  });
}
