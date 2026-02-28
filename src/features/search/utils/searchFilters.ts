
export interface BuildingFilterData {
  id: string;
  functional_category_id?: string | null;
  typologies?: { typology_id: string }[];
  attributes?: { attribute_id: string }[];
  architects?: { architect: { name: string; id: string } }[];
  [key: string]: any; // Allow passing through other fields like id, location, etc.
}

export interface FilterCriteria {
  categoryId?: string | null;
  typologyIds: string[];
  attributeIds: string[];
  selectedArchitects: string[]; // IDs
  collectionIds?: string[];
  folderIds?: string[];
  personalMinRating?: number;
  materials?: string[];
  styles?: string[];
  contexts?: string[];
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

    // Architects (Any Match / OR)
    if (filters.selectedArchitects.length > 0) {
      const architectIds =
        b.architects?.map((a) => a.architect.id) || [];
      const hasMatch = filters.selectedArchitects.some((id) =>
        architectIds.includes(id)
      );
      if (!hasMatch) return false;
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
