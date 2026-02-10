
import { describe, it, expect } from 'vitest';
import { filterLocalBuildings, BuildingFilterData, FilterCriteria } from './searchFilters';

describe('filterLocalBuildings', () => {
  const buildings: BuildingFilterData[] = [
    {
      id: '1',
      functional_category_id: 'cat1',
      typologies: [{ typology_id: 'typ1' }],
      attributes: [
        { attribute_id: 'mat1' }, // Material
        { attribute_id: 'style1' }, // Style
      ],
      architects: [{ architect: { id: 'arch1', name: 'Arch 1' } }],
    },
    {
      id: '2',
      functional_category_id: 'cat2',
      typologies: [{ typology_id: 'typ2' }],
      attributes: [
        { attribute_id: 'mat2' }, // Material
        { attribute_id: 'ctx1' }, // Context
      ],
      architects: [{ architect: { id: 'arch2', name: 'Arch 2' } }],
    },
    {
      id: '3',
      functional_category_id: 'cat1',
      typologies: [],
      attributes: [
        { attribute_id: 'mat1' },
        { attribute_id: 'ctx2' },
        { attribute_id: 'style2' },
      ],
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
    expect(result).toHaveLength(3);
  });

  it('should filter by collectionIds', () => {
    const userCollectionMap: Record<string, Set<string>> = {
      col1: new Set(['1', '3']),
      col2: new Set(['2']),
    };

    const filters: FilterCriteria = {
      ...emptyFilters,
      collectionIds: ['col1'],
      userCollectionMap,
    };

    const result = filterLocalBuildings(buildings, filters);
    expect(result.map(b => b.id)).toEqual(['1', '3']);
  });

  it('should filter by personalMinRating', () => {
    const userRatings: Record<string, number> = {
      '1': 3,
      '2': 5,
      '3': 2,
    };

    const filters: FilterCriteria = {
      ...emptyFilters,
      personalMinRating: 4,
      userRatings,
    };

    const result = filterLocalBuildings(buildings, filters);
    expect(result.map(b => b.id)).toEqual(['2']);
  });

  it('should filter by materials (OR logic within)', () => {
    const filters: FilterCriteria = {
      ...emptyFilters,
      materials: ['mat1', 'mat2'],
    };

    // Building 1: mat1
    // Building 2: mat2
    // Building 3: mat1
    const result = filterLocalBuildings(buildings, filters);
    expect(result.map(b => b.id)).toEqual(['1', '2', '3']);
  });

  it('should filter by styles', () => {
    const filters: FilterCriteria = {
      ...emptyFilters,
      styles: ['style1'],
    };

    const result = filterLocalBuildings(buildings, filters);
    expect(result.map(b => b.id)).toEqual(['1']);
  });

  it('should filter by contexts', () => {
    const filters: FilterCriteria = {
      ...emptyFilters,
      contexts: ['ctx1'],
    };

    const result = filterLocalBuildings(buildings, filters);
    expect(result.map(b => b.id)).toEqual(['2']);
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
