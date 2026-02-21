import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateRouteForCluster } from '../../supabase/functions/_shared/routing';
import { BuildingLocation } from '../../supabase/functions/_shared/clustering';

describe('generateRouteForCluster', () => {
    const buildings: BuildingLocation[] = [
        { id: '1', lat: 0, lng: 0 },
        { id: '2', lat: 10, lng: 10 },
        { id: '3', lat: 20, lng: 20 },
    ];

    const mockMapboxResponse = {
        trips: [{
            geometry: { type: 'LineString', coordinates: [[0,0], [10,10], [20,20]] }
        }],
        waypoints: [
            { waypoint_index: 0, trips_index: 0 },
            { waypoint_index: 1, trips_index: 1 },
            { waypoint_index: 2, trips_index: 2 }
        ]
    };

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return optimized route when Mapbox API succeeds', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockMapboxResponse
        });

        const result = await generateRouteForCluster(buildings, 1, 'walking', 'fake-token');

        expect(result.dayNumber).toBe(1);
        expect(result.isFallback).toBe(false);
        expect(result.routeGeometry).toEqual(mockMapboxResponse.trips[0].geometry);
        expect(result.buildingIds).toEqual(['1', '2', '3']);
    });

    it('should fallback to straight lines when Mapbox API fails', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: false,
            text: async () => 'Error'
        });

        const result = await generateRouteForCluster(buildings, 1, 'walking', 'fake-token');

        expect(result.dayNumber).toBe(1);
        expect(result.isFallback).toBe(true);
        expect(result.routeGeometry.type).toBe('LineString');
        // The fallback logic uses a simple nearest neighbor sort, checking expected order is tricky without knowing exact distance logic,
        // but for this simple line case (0,0 -> 10,10 -> 20,20), it should be 1, 2, 3.
        expect(result.buildingIds).toEqual(['1', '2', '3']);
    });

    it('should fallback when no token provided', async () => {
        const result = await generateRouteForCluster(buildings, 1, 'walking', undefined);

        expect(result.isFallback).toBe(true);
    });

    it('should handle small clusters (< 2 buildings)', async () => {
        const smallCluster = [buildings[0]];
        const result = await generateRouteForCluster(smallCluster, 1, 'walking', 'fake-token');

        expect(result.routeGeometry).toBeNull();
        expect(result.isFallback).toBe(false);
        expect(result.buildingIds).toEqual(['1']);
    });
});
