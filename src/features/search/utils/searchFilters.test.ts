
import { describe, it, expect } from 'vitest';
import { filterLocalBuildings, applyClientFilters, BuildingFilterData, FilterCriteria, ClientFilterContext } from './searchFilters';

describe('filterLocalBuildings', () => {
  const buildings: BuildingFilterData[] = [
    {
      id: '1',
      functional_category_id: 'cat1',
      typologies: [{ typology_id: 'typ1' }],
      attributes: [
        { attribute_id: 'mat1' }, // Material: Brick
        { attribute_id: 'style1' }, // Style
      ],
      architects: [{ architect: { id: 'arch1', name: 'Arch 1' } }],
    },
    {
      id: '2',
      functional_category_id: 'cat2', // Category: Residential
      typologies: [{ typology_id: 'typ2' }],
      attributes: [
        { attribute_id: 'mat2' }, // Material: Concrete
        { attribute_id: 'ctx1' }, // Context
      ],
      architects: [{ architect: { id: 'arch2', name: 'Arch 2' } }],
    },
    {
      id: '3',
      functional_category_id: 'cat1',
      typologies: [],
      attributes: [
        { attribute_id: 'mat1' }, // Material: Brick
        { attribute_id: 'ctx2' },
        { attribute_id: 'style2' },
      ],
      architects: [],
    },
    {
      id: '4',
      functional_category_id: 'cat3',
      typologies: [],
      attributes: [],
      architects: [],
    },
  ];

  const emptyFilters: FilterCriteria = {
    categoryId: null,
    typologyIds: [],
    attributeIds: [],
    selectedArchitects: [],
    collectionIds: [],
    materials: [],
    styles: [],
    contexts: [],
    personalMinRating: 0,
  };

  it('should return all buildings when no filters are applied', () => {
    const result = filterLocalBuildings(buildings, emptyFilters);
    expect(result).toHaveLength(4);
  });

  describe('Collection Filtering', () => {
    const userCollectionMap: Record<string, Set<string>> = {
      col1: new Set(['1', '3']),
      col2: new Set(['2']),
    };

    it('should filter by collectionIds', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        collectionIds: ['col1'],
        userCollectionMap,
      };

      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id)).toEqual(['1', '3']);
    });

    it('should handle empty collectionIds array as no filter', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        collectionIds: [],
        userCollectionMap,
      };

      const result = filterLocalBuildings(buildings, filters);
      expect(result).toHaveLength(4);
    });

    it('should handle multiple collectionIds with OR logic', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        collectionIds: ['col1', 'col2'],
        userCollectionMap,
      };

      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id).sort()).toEqual(['1', '2', '3']);
    });
  });

  describe('Personal Rating Filtering', () => {
    const userRatings: Record<string, number> = {
      '1': 3,
      '2': 5,
      '3': 2,
    };

    it('should filter by personalMinRating', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        personalMinRating: 4,
        userRatings,
      };

      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id)).toEqual(['2']);
    });

    it('should exclude unrated buildings (rating 0/undefined) when personalMinRating is set', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        personalMinRating: 2,
        userRatings,
      };

      // Building 4 is unrated (undefined in userRatings)
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id).sort()).toEqual(['1', '2', '3']);
      expect(result.find(b => b.id === '4')).toBeUndefined();
    });

    it('should include buildings meeting exact rating', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        personalMinRating: 5,
        userRatings,
      };

      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id)).toEqual(['2']);
    });
  });

  describe('Attribute Filtering', () => {
    it('should filter by specific material (e.g. Brick/mat1)', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        materials: ['mat1'],
      };
      // Building 1 and 3 have mat1
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id).sort()).toEqual(['1', '3']);
    });

    it('should combine Category and Material with AND logic', () => {
      // Select Category 'cat1' AND Material 'mat1'
      const filters: FilterCriteria = {
        ...emptyFilters,
        categoryId: 'cat1',
        materials: ['mat1'],
      };

      // Building 1: cat1, mat1 -> Match
      // Building 2: cat2, mat2 -> No Match
      // Building 3: cat1, mat1 -> Match
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id).sort()).toEqual(['1', '3']);
    });

    it('should combine multiple materials with OR logic within category', () => {
      // Select Materials 'mat1' OR 'mat2'
      const filters: FilterCriteria = {
        ...emptyFilters,
        materials: ['mat1', 'mat2'],
      };

      // Building 1: mat1 -> Match
      // Building 2: mat2 -> Match
      // Building 3: mat1 -> Match
      // Building 4: no attributes -> No Match
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id).sort()).toEqual(['1', '2', '3']);
    });

    it('should combine filters with AND logic (Material AND Style)', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        materials: ['mat1'],
        styles: ['style1'],
      };

      // Building 1 has mat1 AND style1.
      // Building 3 has mat1 AND style2.
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id)).toEqual(['1']);
    });

    it('should combine filters with AND logic (Material AND Context)', () => {
      const filters: FilterCriteria = {
        ...emptyFilters,
        materials: ['mat1'],
        contexts: ['ctx2'],
      };

      // Building 3 has mat1 AND ctx2.
      const result = filterLocalBuildings(buildings, filters);
      expect(result.map(b => b.id)).toEqual(['3']);
    });
  });

  it('should handle missing user maps gracefully', () => {
    const filters: FilterCriteria = {
      ...emptyFilters,
      collectionIds: ['col1'],
      // userCollectionMap missing
    };

    const result = filterLocalBuildings(buildings, filters);
    expect(result).toHaveLength(0);
  });
});

describe('applyClientFilters', () => {
  const clientBuildings = [
    { id: '1', status: 'pending', main_image_url: 'url1' },
    { id: '2', status: 'visited', main_image_url: 'url2' },
    { id: '3', status: 'ignored', main_image_url: 'url3' },
    { id: '4', status: null, main_image_url: null }, // No status, no image
    { id: '5', status: 'pending', main_image_url: null },
  ];

  const baseContext: ClientFilterContext = {
    hideSaved: false,
    hideVisited: false,
    hideHidden: false,
    hideWithoutImages: false,
    userStatuses: {
      '1': 'pending',
      '2': 'visited',
      '3': 'ignored',
      '5': 'pending',
    },
  };

  it('should return all buildings when no filters are active', () => {
    const result = applyClientFilters(clientBuildings, baseContext);
    expect(result).toHaveLength(5);
  });

  it('should filter out buildings without images when hideWithoutImages is true', () => {
    const context: ClientFilterContext = {
      ...baseContext,
      hideWithoutImages: true,
    };
    const result = applyClientFilters(clientBuildings, context);
    // Should exclude 4 and 5
    expect(result.map(b => b.id).sort()).toEqual(['1', '2', '3']);
  });

  it('should filter out ignored buildings when hideHidden is true', () => {
    const context: ClientFilterContext = {
      ...baseContext,
      hideHidden: true,
    };
    const result = applyClientFilters(clientBuildings, context);
    // Should exclude 3
    expect(result.map(b => b.id).sort()).toEqual(['1', '2', '4', '5']);
  });

  it('should filter out pending buildings (saved) when hideSaved is true', () => {
    const context: ClientFilterContext = {
      ...baseContext,
      hideSaved: true,
    };
    const result = applyClientFilters(clientBuildings, context);
    // Should exclude 1 and 5
    expect(result.map(b => b.id).sort()).toEqual(['2', '3', '4']);
  });

  it('should filter out visited buildings when hideVisited is true', () => {
    const context: ClientFilterContext = {
      ...baseContext,
      hideVisited: true,
    };
    const result = applyClientFilters(clientBuildings, context);
    // Should exclude 2
    expect(result.map(b => b.id).sort()).toEqual(['1', '3', '4', '5']);
  });

  it('should combine filters correctly (hideSaved AND hideVisited)', () => {
    const context: ClientFilterContext = {
      ...baseContext,
      hideSaved: true,
      hideVisited: true,
    };
    const result = applyClientFilters(clientBuildings, context);
    // Should exclude 1, 2, 5
    expect(result.map(b => b.id).sort()).toEqual(['3', '4']);
  });
});
