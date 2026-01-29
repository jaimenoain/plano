
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
