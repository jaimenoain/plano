import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useItineraryStore } from './useItineraryStore';
import { CollectionItemWithBuilding } from '@/types/collection';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn()
        }
    }
}));

describe('useItineraryStore', () => {
    beforeEach(() => {
        // Reset store state
        useItineraryStore.setState({
            daysCount: 0,
            transportMode: 'walking',
            days: [],
            isLoading: false,
            error: null
        });
    });

    const mockBuildings: CollectionItemWithBuilding[] = [
        {
            id: 'item1',
            collection_id: 'col1',
            building_id: 'b1',
            created_at: 'now',
            notes: null,
            building: {
                id: 'b1',
                name: 'Building 1',
                location_lat: 10,
                location_lng: 10,
                hero_image_url: null,
                city: null,
                country: null,
                location_precision: 'exact'
            } as any // Cast to any to bypass type checks if needed
        },
        {
            id: 'item2',
            collection_id: 'col1',
            building_id: 'b2',
            created_at: 'now',
            notes: null,
            building: {
                id: 'b2',
                name: 'Building 2',
                location_lat: 20,
                location_lng: 20,
                hero_image_url: null,
                city: null,
                country: null,
                location_precision: 'exact'
            } as any
        }
    ];

    it('should initialize itinerary correctly', () => {
        const itinerary = {
            days: 2,
            transportMode: 'walking' as const,
            routes: [
                {
                    dayNumber: 1,
                    buildingIds: ['b1'],
                    routeGeometry: { type: 'LineString', coordinates: [] },
                    isFallback: false
                },
                {
                    dayNumber: 2,
                    buildingIds: ['b2'],
                    routeGeometry: null,
                    isFallback: false
                }
            ]
        };

        useItineraryStore.getState().initializeItinerary(itinerary, mockBuildings);

        const state = useItineraryStore.getState();
        expect(state.daysCount).toBe(2);
        expect(state.transportMode).toBe('walking');
        expect(state.days.length).toBe(2);
        expect(state.days[0].dayNumber).toBe(1);
        expect(state.days[0].buildings[0].id).toBe('b1');
        expect(state.days[1].buildings[0].id).toBe('b2');
    });

    it('should handle optimistic reordering of buildings', () => {
        // Setup initial state
        useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                buildings: [
                    { id: 'b1', name: 'B1', location_lat: 0, location_lng: 0, address: null },
                    { id: 'b2', name: 'B2', location_lat: 0, location_lng: 0, address: null }
                ],
                routeGeometry: null,
                isFallback: false
            }]
        });

        const newOrder = [
             { id: 'b2', name: 'B2', location_lat: 0, location_lng: 0, address: null },
             { id: 'b1', name: 'B1', location_lat: 0, location_lng: 0, address: null }
        ];

        useItineraryStore.getState().reorderBuildings(0, newOrder);

        const state = useItineraryStore.getState();
        expect(state.days[0].buildings[0].id).toBe('b2');
        expect(state.days[0].buildings[1].id).toBe('b1');
    });

    it('should update route geometry', () => {
         useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                buildings: [],
                routeGeometry: null,
                isFallback: false
            }]
        });

        const newGeometry = { type: 'Point', coordinates: [0, 0] };
        useItineraryStore.getState().updateRouteGeometry(0, newGeometry);

        const state = useItineraryStore.getState();
        expect(state.days[0].routeGeometry).toEqual(newGeometry);
    });
});
