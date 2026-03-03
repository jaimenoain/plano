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

    it('should initialize itinerary correctly with new schema (ItineraryDay)', () => {
        const itinerary = {
            days: 2,
            defaultTransportMode: 'walking' as const,
            routes: [
                {
                    dayNumber: 1,
                    title: 'Day 1 title',
                    description: 'Day 1 description',
                    stops: [
                        { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: { mode: 'transit', customInstructions: null, estimatedMinutes: null } }
                    ],
                    defaultTransportMode: 'driving' as const,
                    routeGeometry: { type: 'LineString', coordinates: [] },
                    isFallback: false
                },
                {
                    dayNumber: 2,
                    stops: [{ id: 'stop2', referenceId: 'b2', type: 'building' as const }],
                    defaultTransportMode: 'walking' as const,
                    routeGeometry: null,
                    isFallback: false
                }
            ]
        };

        useItineraryStore.getState().initializeItinerary(itinerary as any, mockBuildings);

        const state = useItineraryStore.getState();
        expect(state.daysCount).toBe(2);
        expect(state.transportMode).toBe('walking');
        expect(state.days.length).toBe(2);
        expect(state.days[0].dayNumber).toBe(1);
        expect(state.days[0].title).toBe('Day 1 title');
        expect(state.days[0].description).toBe('Day 1 description');
        expect(state.days[0].defaultTransportMode).toBe('driving');
        expect(state.days[0].stops[0].referenceId).toBe('b1');
        expect(state.days[0].stops[0].transitToNext?.mode).toBe('transit');
        expect(state.days[1].stops[0].referenceId).toBe('b2');
        expect(state.days[1].defaultTransportMode).toBe('walking');
    });

    it('should initialize itinerary correctly with legacy schema (ItineraryRoute)', () => {
        const itinerary = {
            days: 2,
            defaultTransportMode: 'walking' as const,
            routes: [
                {
                    dayNumber: 1,
                    buildingIds: ['b1', 'b2'],
                    routeGeometry: { type: 'LineString', coordinates: [] },
                    isFallback: false
                },
                {
                    dayNumber: 2,
                    buildingIds: ['b1'],
                    routeGeometry: null,
                    isFallback: false
                }
            ]
        };

        useItineraryStore.getState().initializeItinerary(itinerary as any, mockBuildings);

        const state = useItineraryStore.getState();
        expect(state.daysCount).toBe(2);
        expect(state.transportMode).toBe('walking');
        expect(state.days.length).toBe(2);
        expect(state.days[0].dayNumber).toBe(1);
        expect(state.days[0].stops.length).toBe(2);
        expect(state.days[0].stops[0].type).toBe('building');
        expect(state.days[0].stops[0].referenceId).toBe('b1');
        expect(state.days[0].stops[1].referenceId).toBe('b2');
        expect(state.days[0].stops[0].id).toBeDefined();

        expect(state.days[1].dayNumber).toBe(2);
        expect(state.days[1].stops.length).toBe(1);
        expect(state.days[1].stops[0].referenceId).toBe('b1');
    });

    it('should handle optimistic reordering of stops while preserving transitToNext', () => {
        // Setup initial state
        const transitData1 = { mode: 'transit' as const, customInstructions: 'bus', estimatedMinutes: 10 };
        const transitData2 = { mode: 'driving' as const, customInstructions: 'car', estimatedMinutes: 5 };
        useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                stops: [
                    { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: transitData1 },
                    { id: 'stop2', referenceId: 'b2', type: 'building' as const, transitToNext: transitData2 }
                ],
                defaultTransportMode: 'walking',
                routeGeometry: null,
                isFallback: false
            }]
        });

        const newOrder = [
             { id: 'stop2', referenceId: 'b2', type: 'building' as const, transitToNext: transitData2 },
             { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: transitData1 }
        ];

        useItineraryStore.getState().reorderStops(0, newOrder);

        const state = useItineraryStore.getState();
        expect(state.days[0].stops[0].id).toBe('stop2');
        expect(state.days[0].stops[0].transitToNext).toEqual(transitData2);
        expect(state.days[0].stops[1].id).toBe('stop1');
        expect(state.days[0].stops[1].transitToNext).toEqual(transitData1);
    });

    it('should move a stop within the same day while preserving transitToNext', () => {
        const transitData1 = { mode: 'transit' as const, customInstructions: 'bus', estimatedMinutes: 10 };
        const transitData2 = { mode: 'walking' as const, customInstructions: 'walk', estimatedMinutes: 2 };

        useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                stops: [
                    { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: transitData1 },
                    { id: 'stop2', referenceId: 'b2', type: 'building' as const, transitToNext: transitData2 },
                    { id: 'stop3', referenceId: 'b3', type: 'building' as const }
                ],
                defaultTransportMode: 'walking',
                routeGeometry: null,
                isFallback: false
            }]
        });

        useItineraryStore.getState().moveStopToDay('stop1', 0, 0, 2);

        const state = useItineraryStore.getState();
        expect(state.days[0].stops.length).toBe(3);
        expect(state.days[0].stops[0].id).toBe('stop2');
        expect(state.days[0].stops[0].transitToNext).toEqual(transitData2);

        expect(state.days[0].stops[1].id).toBe('stop3');
        expect(state.days[0].stops[1].transitToNext).toBeUndefined();

        expect(state.days[0].stops[2].id).toBe('stop1');
        expect(state.days[0].stops[2].transitToNext).toEqual(transitData1);
    });

    it('should move a stop to a different day while preserving transitToNext', () => {
        const transitData1 = { mode: 'transit' as const, customInstructions: 'bus', estimatedMinutes: 10 };
        const transitData2 = { mode: 'walking' as const, customInstructions: 'walk', estimatedMinutes: 2 };

        useItineraryStore.setState({
            days: [
                {
                    dayNumber: 1,
                    stops: [
                        { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: transitData1 },
                        { id: 'stop2', referenceId: 'b2', type: 'building' as const, transitToNext: transitData2 }
                    ],
                    defaultTransportMode: 'walking'
                },
                {
                    dayNumber: 2,
                    stops: [
                        { id: 'stop3', referenceId: 'b3', type: 'building' as const }
                    ],
                    defaultTransportMode: 'driving'
                }
            ]
        });

        // Move stop1 from Day 1 to Day 2 at index 0
        useItineraryStore.getState().moveStopToDay('stop1', 0, 1, 0);

        const state = useItineraryStore.getState();

        // Check Day 1
        expect(state.days[0].stops.length).toBe(1);
        expect(state.days[0].stops[0].id).toBe('stop2');
        expect(state.days[0].stops[0].transitToNext).toEqual(transitData2);

        // Check Day 2
        expect(state.days[1].stops.length).toBe(2);
        expect(state.days[1].stops[0].id).toBe('stop1');
        expect(state.days[1].stops[0].transitToNext).toEqual(transitData1);
        expect(state.days[1].stops[1].id).toBe('stop3');
        expect(state.days[1].stops[1].transitToNext).toBeUndefined();
    });

    it('should update day context (title and description)', () => {
         useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                title: 'Old Title',
                description: 'Old Description',
                stops: [],
                defaultTransportMode: 'walking',
                routeGeometry: null,
                isFallback: false
            }]
        });

        useItineraryStore.getState().updateDayContext(0, { title: 'New Title', description: 'New Description' });

        const state = useItineraryStore.getState();
        expect(state.days[0].title).toBe('New Title');
        expect(state.days[0].description).toBe('New Description');
    });

    it('should update segment transit for a specific stop', () => {
         useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                stops: [
                    { id: 'stop1', referenceId: 'b1', type: 'building' as const, transitToNext: { mode: 'walking', customInstructions: 'Walk', estimatedMinutes: 2 } },
                    { id: 'stop2', referenceId: 'b2', type: 'building' as const, transitToNext: { mode: 'driving', customInstructions: 'Drive', estimatedMinutes: 5 } },
                    { id: 'stop3', referenceId: 'b3', type: 'building' as const }
                ],
                defaultTransportMode: 'walking',
                routeGeometry: null,
                isFallback: false
            }]
        });

        const transitData = {
            mode: 'transit' as const,
            customInstructions: 'Take the blue line',
            estimatedMinutes: 15
        };

        useItineraryStore.getState().updateSegmentTransit(0, 'stop2', transitData);

        const state = useItineraryStore.getState();
        expect(state.days[0].stops[1].transitToNext).toEqual(transitData);

        // Ensure other stops are unaffected
        expect(state.days[0].stops[0].transitToNext).toEqual({ mode: 'walking', customInstructions: 'Walk', estimatedMinutes: 2 });
        expect(state.days[0].stops[2].transitToNext).toBeUndefined();
    });

    it('should update route geometry', () => {
         useItineraryStore.setState({
            days: [{
                dayNumber: 1,
                stops: [],
                defaultTransportMode: 'walking',
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
