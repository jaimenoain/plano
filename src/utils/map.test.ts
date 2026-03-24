import { describe, it, expect } from 'vitest';
import { getBoundsFromBuildings, getDistanceFromLatLonInM } from './map';

describe('getBoundsFromBuildings', () => {
  it('should return null for an empty array', () => {
    expect(getBoundsFromBuildings([])).toBeNull();
  });

  it('should return null for array with only invalid coordinates', () => {
    const invalidBuildings = [
      { location_lat: 0, location_lng: 0 },
      { location_lat: 0.00001, location_lng: 0.00001 },
      { location_lat: null as any, location_lng: null as any },
      { location_lat: undefined as any, location_lng: undefined as any },
    ];
    expect(getBoundsFromBuildings(invalidBuildings)).toBeNull();
  });

  it('should return correct bounds for a single valid building', () => {
    const buildings = [{ location_lat: 51.5074, location_lng: -0.1278 }];
    const expected = {
      north: 51.5074,
      south: 51.5074,
      east: -0.1278,
      west: -0.1278,
    };
    expect(getBoundsFromBuildings(buildings)).toEqual(expected);
  });

  it('should return correct bounds for multiple valid buildings', () => {
    const buildings = [
      { location_lat: 51.5074, location_lng: -0.1278 }, // London
      { location_lat: 48.8566, location_lng: 2.3522 },  // Paris
      { location_lat: 40.7128, location_lng: -74.0060 }, // New York
    ];
    const expected = {
      north: 51.5074,
      south: 40.7128,
      east: 2.3522,
      west: -74.0060,
    };
    expect(getBoundsFromBuildings(buildings)).toEqual(expected);
  });

  it('should ignore invalid buildings and return bounds for valid ones', () => {
    const buildings = [
      { location_lat: 51.5074, location_lng: -0.1278 },
      { location_lat: 0, location_lng: 0 },
      { location_lat: 40.7128, location_lng: -74.0060 },
    ];
    const expected = {
      north: 51.5074,
      south: 40.7128,
      east: -0.1278,
      west: -74.0060,
    };
    expect(getBoundsFromBuildings(buildings)).toEqual(expected);
  });

  it('should handle buildings on the other side of prime meridian/equator', () => {
    const buildings = [
      { location_lat: -10, location_lng: -10 },
      { location_lat: 10, location_lng: 10 },
    ];
    const expected = {
      north: 10,
      south: -10,
      east: 10,
      west: -10,
    };
    expect(getBoundsFromBuildings(buildings)).toEqual(expected);
  });
});

describe('getDistanceFromLatLonInM', () => {
  it('should return 0 for the same point', () => {
    const lat = 51.5074;
    const lon = -0.1278;
    expect(getDistanceFromLatLonInM(lat, lon, lat, lon)).toBe(0);
  });

  it('should return correct distance between two points', () => {
    // London: 51.5074, -0.1278
    // Paris: 48.8566, 2.3522
    // Approximate distance: ~344km
    const lat1 = 51.5074;
    const lon1 = -0.1278;
    const lat2 = 48.8566;
    const lon2 = 2.3522;
    const distance = getDistanceFromLatLonInM(lat1, lon1, lat2, lon2);
    // Allow for small difference (within 1km)
    expect(distance).toBeGreaterThan(343000);
    expect(distance).toBeLessThan(345000);
  });

  it('should return correct distance across the prime meridian', () => {
    // A point at (50, -1) and a point at (50, 1)
    const lat1 = 50, lon1 = -1;
    const lat2 = 50, lon2 = 1;
    const distance = getDistanceFromLatLonInM(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(0);
    // Rough calculation: 2 degrees at 50 degrees latitude
    // Length of 1 degree longitude at latitude phi = 111.321 * cos(phi) km
    // 111.321 * cos(50 deg) * 2 = 111.321 * 0.6427 * 2 = 143.1 km
    expect(distance).toBeGreaterThan(140000);
    expect(distance).toBeLessThan(145000);
  });

  it('should return correct distance across the equator', () => {
    const lat1 = -1, lon1 = 0;
    const lat2 = 1, lon2 = 0;
    const distance = getDistanceFromLatLonInM(lat1, lon1, lat2, lon2);
    // Roughly 2 degrees of latitude = 2 * 111 km = 222 km
    expect(distance).toBeGreaterThan(221000);
    expect(distance).toBeLessThan(223000);
  });
});
