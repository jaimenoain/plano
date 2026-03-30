// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

// Mock react-map-gl to prevent mapbox-gl import error
vi.mock('react-map-gl', () => ({
  default: () => null,
  Source: () => null,
  Layer: () => null,
  NavigationControl: () => null,
}));

vi.mock('maplibre-gl', () => ({
  default: {},
}));

import { filterMissingPhotoBuildings } from './NoPhotosMapZone';

// Mock parseLocation
const mockParseLocation = (loc: any) => {
  if (loc && loc.coordinates) {
    return { lat: loc.coordinates[1], lng: loc.coordinates[0] };
  }
  return null;
};

describe('filterMissingPhotoBuildings', () => {
  const publicReviewBuildingIds = new Set(['1', '2']);

  const buildings = [
    {
      id: '1',
      name: 'Building 1',
      location: { coordinates: [10, 20] },
      hero_image_url: null,
      slug: 'building-1'
    },
    {
      id: '2',
      name: 'Building 2',
      location: { coordinates: [10, 20] },
      hero_image_url: null,
      slug: 'building-2'
    },
    {
      id: '3',
      name: 'Building 3',
      location: { coordinates: [10, 20] },
      hero_image_url: 'http://example.com/image.jpg',
      slug: 'building-3'
    },
    {
      id: '4',
      name: 'Building 4',
      location: { coordinates: [10, 20] },
      hero_image_url: null,
      slug: 'building-4'
    },
    {
      id: '5',
      name: 'Building 5',
      location: null, // Invalid location
      hero_image_url: null,
      slug: 'building-5'
    }
  ];

  it('should exclude buildings with public reviews', () => {
    const result = filterMissingPhotoBuildings(buildings, publicReviewBuildingIds, mockParseLocation);
    // Should exclude 1 and 2
    expect(result.find(b => b.id === '1')).toBeUndefined();
    expect(result.find(b => b.id === '2')).toBeUndefined();
  });

  it('should exclude buildings with hero_image_url', () => {
    const result = filterMissingPhotoBuildings(buildings, publicReviewBuildingIds, mockParseLocation);
    // Should exclude 3
    expect(result.find(b => b.id === '3')).toBeUndefined();
  });

  it('should exclude buildings with invalid location', () => {
    const result = filterMissingPhotoBuildings(buildings, publicReviewBuildingIds, mockParseLocation);
    // Should exclude 5
    expect(result.find(b => b.id === '5')).toBeUndefined();
  });

  it('should include buildings missing photos and having valid location', () => {
    const result = filterMissingPhotoBuildings(buildings, publicReviewBuildingIds, mockParseLocation);
    // Should include 4
    expect(result.find(b => b.id === '4')).toBeDefined();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('4');
  });

  it('should correctly map building data', () => {
    const result = filterMissingPhotoBuildings(buildings, publicReviewBuildingIds, mockParseLocation);
    const b4 = result.find(b => b.id === '4');
    expect(b4).toEqual({
        id: '4',
        name: 'Building 4',
        lat: 20,
        lng: 10,
        slug: 'building-4'
    });
  });
});
