
export interface BuildingFilterData {
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
}

export function filterLocalBuildings(
  buildings: BuildingFilterData[],
  filters: FilterCriteria
): BuildingFilterData[] {
  return buildings.filter((b) => {
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

    // Attributes (Any Match / OR)
    if (filters.attributeIds.length > 0) {
      const buildingAttributeIds = b.attributes?.map((a) => a.attribute_id) || [];
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
  userStatuses: Record<string, string>;
}

export function applyClientFilters<T extends { id: string; status?: string | null }>(
  buildings: T[],
  filters: ClientFilterContext
): T[] {
  return buildings.filter((b) => {
    // 1. Filter out Demolished / Unbuilt (Standard Map Logic)
    if (b.status === 'Demolished' || b.status === 'Unbuilt') {
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
