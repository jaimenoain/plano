import { describe, it, expect } from 'vitest';
import { kMeans, BuildingLocation } from '../supabase/functions/_shared/clustering';

describe('kMeans Clustering', () => {
  it('should cluster buildings into k groups', () => {
    const buildings: BuildingLocation[] = [
      { id: '1', lat: 10, lng: 10 },
      { id: '2', lat: 10.1, lng: 10.1 },
      { id: '3', lat: 20, lng: 20 },
      { id: '4', lat: 20.1, lng: 20.1 },
    ];

    const k = 2;
    const result = kMeans(buildings, k);

    expect(result.length).toBe(2);

    // Verify grouping logic: find cluster with '1', check if it has '2'
    const clusterWith1 = result.find(c => c.some(b => b.id === '1'));
    expect(clusterWith1).toBeDefined();
    expect(clusterWith1?.some(b => b.id === '2')).toBe(true);
    expect(clusterWith1?.some(b => b.id === '3')).toBe(false);
  });

  it('should handle k > number of buildings', () => {
    const buildings: BuildingLocation[] = [
      { id: '1', lat: 10, lng: 10 },
      { id: '2', lat: 20, lng: 20 },
    ];
    const k = 5;
    const result = kMeans(buildings, k);

    expect(result.length).toBe(2);
    // Since each building is distinct, they should be in separate clusters
    // But the order is not guaranteed.
    // Check total count is 2 items.
    const totalItems = result.reduce((acc, c) => acc + c.length, 0);
    expect(totalItems).toBe(2);
  });

  it('should handle single building', () => {
    const buildings: BuildingLocation[] = [
      { id: '1', lat: 10, lng: 10 },
    ];
    const k = 3;
    const result = kMeans(buildings, k);

    expect(result.length).toBe(1);
    expect(result[0][0].id).toBe('1');
  });

  it('should handle empty input', () => {
    const result = kMeans([], 3);
    expect(result).toEqual([]);
  });

  it('should clustering 3 distinct groups', () => {
     const buildings: BuildingLocation[] = [
      { id: '1', lat: 0, lng: 0 },
      { id: '2', lat: 0.1, lng: 0.1 },

      { id: '3', lat: 10, lng: 10 },
      { id: '4', lat: 10.1, lng: 10.1 },

      { id: '5', lat: 20, lng: 20 },
      { id: '6', lat: 20.1, lng: 20.1 },
    ];
    const k = 3;
    const result = kMeans(buildings, k);
    expect(result.length).toBe(3);
  });
});
