import { create } from 'zustand';
import { supabase } from "@/integrations/supabase/client";
import { TransportMode, Itinerary, CollectionItemWithBuilding, ItineraryStop, ItineraryDay, CollectionMarker } from '@/types/collection';

// Define ItineraryBuilding interface
export interface ItineraryBuilding {
  id: string;
  name: string;
  location_lat: number;
  location_lng: number;
  address: string | null;
  hero_image_url?: string | null;
  city?: string | null;
  country?: string | null;
  location_precision?: "exact" | "approximate";
  building_architects?: { architects: { id: string; name: string } | null }[];
  year_completed?: number | null;
  slug?: string | null;
  short_id?: number | null;
  community_preview_url?: string | null;
  collection_item_id?: string;
  note?: string | null;
}

export interface DaySchedule {
  dayNumber: number; // 1-based index
  title?: string;
  description?: string;
  stops: ItineraryStop[];
  defaultTransportMode: TransportMode;
  routeGeometry?: any;
  isFallback?: boolean;
  distance?: number; // meters
}

interface ItineraryState {
  daysCount: number;
  transportMode: TransportMode;
  days: DaySchedule[];
  isLoading: boolean;
  error: string | null;
  buildingDetails: Record<string, ItineraryBuilding>;
  markerDetails: Record<string, CollectionMarker>;

  // Actions
  initializeItinerary: (itinerary: Itinerary | null, availableBuildings: CollectionItemWithBuilding[], availableMarkers?: CollectionMarker[]) => void;
  reorderStops: (dayIndex: number, newStopOrder: ItineraryStop[]) => void;
  moveStopToDay: (stopId: string, fromDayIndex: number, toDayIndex: number, newIndex: number) => void;
  setTransportMode: (mode: TransportMode) => void;
  updateRouteGeometry: (dayIndex: number, geometry: any) => void;
  setDaysCount: (count: number) => void;
  calculateRouteForDay: (dayIndex: number) => Promise<void>;
  updateDayContext: (dayIndex: number, context: { title?: string; description?: string }) => void;
  updateSegmentTransit: (dayIndex: number, stopId: string, transitData: ItineraryStop['transitToNext']) => void;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  daysCount: 0,
  transportMode: 'walking',
  days: [],
  isLoading: false,
  error: null,
  buildingDetails: {},
  markerDetails: {},

  initializeItinerary: (itinerary, availableBuildings, availableMarkers = []) => {
    if (!itinerary) {
      set({ daysCount: 0, transportMode: 'walking', days: [], buildingDetails: {}, markerDetails: {} });
      return;
    }

    const buildingRecord: Record<string, ItineraryBuilding> = {};
    availableBuildings.forEach(item => {
      if (item.building) {
        // Since CollectionItemWithBuilding['building'] doesn't explicitly list 'address' in the type definition file I read,
        // but the DB has it, we'll try to access it if it exists or default to null.
        // We cast to any to avoid TS errors if the type definition is incomplete,
        // assuming the runtime object might have it.
        const b = item.building as any;
        buildingRecord[item.building.id] = {
          id: item.building.id,
          name: item.building.name,
          location_lat: item.building.location_lat,
          location_lng: item.building.location_lng,
          address: b.address || null,
          hero_image_url: item.building.hero_image_url,
          city: item.building.city,
          country: item.building.country,
          location_precision: item.building.location_precision,
          building_architects: item.building.building_architects,
          year_completed: item.building.year_completed,
          slug: item.building.slug,
          short_id: item.building.short_id,
          community_preview_url: item.building.community_preview_url,
          collection_item_id: item.id,
          note: item.note
        };
      }
    });

    const markerRecord: Record<string, CollectionMarker> = {};
    availableMarkers.forEach(marker => {
      markerRecord[marker.id] = marker;
    });

    const days: DaySchedule[] = [];
    // Initialize days array based on itinerary.days count
    for (let i = 1; i <= itinerary.days; i++) {
        const route = itinerary.routes.find(r => r.dayNumber === i) as any;

        let stops: ItineraryStop[] = [];
        if (route?.stops) {
          stops = route.stops;
        } else if (route?.buildingIds) {
          stops = route.buildingIds.map((buildingId: string) => ({
            id: crypto.randomUUID(),
            referenceId: buildingId,
            type: 'building' as const
          }));
        }

        days.push({
            dayNumber: i,
            title: route?.title,
            description: route?.description,
            stops: stops,
            defaultTransportMode: route?.defaultTransportMode || itinerary.defaultTransportMode,
            routeGeometry: route?.routeGeometry,
            isFallback: route?.isFallback
        });
    }

    set({
      daysCount: itinerary.days,
      transportMode: itinerary.defaultTransportMode,
      days,
      buildingDetails: buildingRecord,
      markerDetails: markerRecord
    });
  },

  reorderStops: (dayIndex, newStopOrder) => {
    set((state) => {
      const newDays = [...state.days];
      // Note: dayIndex is 0-based for the array, matching how we'll access it.
      // DaySchedule.dayNumber is 1-based.
      if (newDays[dayIndex]) {
         newDays[dayIndex] = {
            ...newDays[dayIndex],
            stops: newStopOrder
         };
      }
      return { days: newDays };
    });
  },

  moveStopToDay: (stopId, fromDayIndex, toDayIndex, newIndex) => {
      set((state) => {
          const newDays = [...state.days];

          // If moving within the same day
          if (fromDayIndex === toDayIndex) {
              const newFromDay = { ...newDays[fromDayIndex], stops: [...newDays[fromDayIndex].stops] };

              const stopIndex = newFromDay.stops.findIndex(s => s.id === stopId);
              if (stopIndex === -1) return state;

              const [stop] = newFromDay.stops.splice(stopIndex, 1);
              newFromDay.stops.splice(newIndex, 0, stop);

              newDays[fromDayIndex] = newFromDay;
              return { days: newDays };
          }

          // Moving between days
          // We need to copy both day objects
          const newFromDay = { ...newDays[fromDayIndex], stops: [...newDays[fromDayIndex].stops] };
          const newToDay = { ...newDays[toDayIndex], stops: [...newDays[toDayIndex].stops] };

          const stopIndex = newFromDay.stops.findIndex(s => s.id === stopId);
          if (stopIndex === -1) return state;

          const [stop] = newFromDay.stops.splice(stopIndex, 1);
          newToDay.stops.splice(newIndex, 0, stop);

          newDays[fromDayIndex] = newFromDay;
          newDays[toDayIndex] = newToDay;

          return { days: newDays };
      });
  },

  setTransportMode: (mode) => set({ transportMode: mode }),

  updateSegmentTransit: (dayIndex, stopId, transitData) => {
    set((state) => {
      const newDays = [...state.days];
      if (newDays[dayIndex]) {
        const newStops = [...newDays[dayIndex].stops];
        const stopIndex = newStops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
          newStops[stopIndex] = {
            ...newStops[stopIndex],
            transitToNext: transitData
          };
          newDays[dayIndex] = {
            ...newDays[dayIndex],
            stops: newStops
          };
        }
      }
      return { days: newDays };
    });
  },

  updateDayContext: (dayIndex, context) => {
    set((state) => {
      const newDays = [...state.days];
      if (newDays[dayIndex]) {
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          ...context
        };
      }
      return { days: newDays };
    });
  },

  updateRouteGeometry: (dayIndex, geometry) => {
    set((state) => {
      const newDays = [...state.days];
      if (newDays[dayIndex]) {
          newDays[dayIndex] = { ...newDays[dayIndex], routeGeometry: geometry };
      }
      return { days: newDays };
    });
  },

  setDaysCount: (count) => set((state) => {
      // If increasing days, add new empty days
      // If decreasing, remove days (and potentially orphan buildings? For now just remove)
      let newDays = [...state.days];
      if (count > state.daysCount) {
          for (let i = state.daysCount + 1; i <= count; i++) {
              newDays.push({
                  dayNumber: i,
                  stops: [],
                  defaultTransportMode: state.transportMode || 'walking'
              });
          }
      } else if (count < state.daysCount) {
          newDays = newDays.slice(0, count);
      }

      return { daysCount: count, days: newDays };
  }),

  calculateRouteForDay: async (dayIndex: number) => {
      const state = get();
      const day = state.days[dayIndex];
      if (!day) return;

      // If less than 2 stops, clear route
      if (day.stops.length < 2) {
          set((state) => {
              const newDays = [...state.days];
              if (newDays[dayIndex]) {
                  newDays[dayIndex] = { ...newDays[dayIndex], routeGeometry: null, distance: 0 };
              }
              return { days: newDays };
          });
          return;
      }

      const coordinates = day.stops.map(stop => {
          if (stop.type === 'building') {
              const b = state.buildingDetails[stop.referenceId];
              return b ? { lat: b.location_lat, lng: b.location_lng } : null;
          } else if (stop.type === 'marker') {
              const m = state.markerDetails[stop.referenceId];
              return m ? { lat: m.lat, lng: m.lng } : null;
          }
          return null;
      }).filter((c): c is { lat: number, lng: number } => c !== null);

      if (coordinates.length < 2) return;

      // Optimistically set fallback straight-line geometry while loading
      set((state) => {
          const newDays = [...state.days];
          if (newDays[dayIndex]) {
              const fallbackGeometry = {
                  type: "Feature",
                  geometry: {
                      type: "LineString",
                      coordinates: coordinates.map(c => [c.lng, c.lat])
                  },
                  properties: {}
              };

              newDays[dayIndex] = {
                  ...newDays[dayIndex],
                  routeGeometry: fallbackGeometry,
                  isFallback: true
              };
          }
          return { days: newDays };
      });

      try {
          const { data, error } = await supabase.functions.invoke('calculate-route', {
              body: {
                  coordinates,
                  transportMode: day.defaultTransportMode || state.transportMode
              }
          });

          if (error) throw error;
          if (data && data.error) throw new Error(data.error);

          set((state) => {
              const newDays = [...state.days];
              if (newDays[dayIndex]) {
                  newDays[dayIndex] = {
                      ...newDays[dayIndex],
                      routeGeometry: data.geometry,
                      distance: data.distance,
                      isFallback: false
                  };
              }
              return { days: newDays };
          });

      } catch (err) {
          console.error("Failed to calculate route:", err);
      }
  },
}));
