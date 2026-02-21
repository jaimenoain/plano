import { create } from 'zustand';
import { supabase } from "@/integrations/supabase/client";
import { TransportMode, Itinerary, CollectionItemWithBuilding } from '@/types/collection';

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
}

export interface DaySchedule {
  dayNumber: number; // 1-based index
  buildings: ItineraryBuilding[];
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

  // Actions
  initializeItinerary: (itinerary: Itinerary | null, availableBuildings: CollectionItemWithBuilding[]) => void;
  reorderBuildings: (dayIndex: number, newBuildingOrder: ItineraryBuilding[]) => void;
  moveBuildingToDay: (buildingId: string, fromDayIndex: number, toDayIndex: number, newIndex: number) => void;
  setTransportMode: (mode: TransportMode) => void;
  updateRouteGeometry: (dayIndex: number, geometry: any) => void;
  setDaysCount: (count: number) => void;
  calculateRouteForDay: (dayIndex: number) => Promise<void>;
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  daysCount: 0,
  transportMode: 'walking',
  days: [],
  isLoading: false,
  error: null,

  initializeItinerary: (itinerary, availableBuildings) => {
    if (!itinerary) {
      set({ daysCount: 0, transportMode: 'walking', days: [] });
      return;
    }

    const buildingMap = new Map<string, ItineraryBuilding>();
    availableBuildings.forEach(item => {
      if (item.building) {
        // Since CollectionItemWithBuilding['building'] doesn't explicitly list 'address' in the type definition file I read,
        // but the DB has it, we'll try to access it if it exists or default to null.
        // We cast to any to avoid TS errors if the type definition is incomplete,
        // assuming the runtime object might have it.
        const b = item.building as any;
        buildingMap.set(item.building.id, {
          id: item.building.id,
          name: item.building.name,
          location_lat: item.building.location_lat,
          location_lng: item.building.location_lng,
          address: b.address || null,
          hero_image_url: item.building.hero_image_url,
          city: item.building.city,
          country: item.building.country,
          location_precision: item.building.location_precision
        });
      }
    });

    const days: DaySchedule[] = [];
    // Initialize days array based on itinerary.days count
    for (let i = 1; i <= itinerary.days; i++) {
        const route = itinerary.routes.find(r => r.dayNumber === i);
        const buildings: ItineraryBuilding[] = [];
        if (route) {
            route.buildingIds.forEach(id => {
                const building = buildingMap.get(id);
                if (building) {
                    buildings.push(building);
                }
            });
        }
        days.push({
            dayNumber: i,
            buildings,
            routeGeometry: route?.routeGeometry,
            isFallback: route?.isFallback
        });
    }

    set({
      daysCount: itinerary.days,
      transportMode: itinerary.transportMode,
      days
    });
  },

  reorderBuildings: (dayIndex, newBuildingOrder) => {
    set((state) => {
      const newDays = [...state.days];
      // Note: dayIndex is 0-based for the array, matching how we'll access it.
      // DaySchedule.dayNumber is 1-based.
      if (newDays[dayIndex]) {
         newDays[dayIndex] = {
            ...newDays[dayIndex],
            buildings: newBuildingOrder
         };
      }
      return { days: newDays };
    });
  },

  moveBuildingToDay: (buildingId, fromDayIndex, toDayIndex, newIndex) => {
      set((state) => {
          const newDays = [...state.days];

          // If moving within the same day
          if (fromDayIndex === toDayIndex) {
              const newFromDay = { ...newDays[fromDayIndex], buildings: [...newDays[fromDayIndex].buildings] };

              const buildingIndex = newFromDay.buildings.findIndex(b => b.id === buildingId);
              if (buildingIndex === -1) return state;

              const [building] = newFromDay.buildings.splice(buildingIndex, 1);
              newFromDay.buildings.splice(newIndex, 0, building);

              newDays[fromDayIndex] = newFromDay;
              return { days: newDays };
          }

          // Moving between days
          // We need to copy both day objects
          const newFromDay = { ...newDays[fromDayIndex], buildings: [...newDays[fromDayIndex].buildings] };
          const newToDay = { ...newDays[toDayIndex], buildings: [...newDays[toDayIndex].buildings] };

          const buildingIndex = newFromDay.buildings.findIndex(b => b.id === buildingId);
          if (buildingIndex === -1) return state;

          const [building] = newFromDay.buildings.splice(buildingIndex, 1);
          newToDay.buildings.splice(newIndex, 0, building);

          newDays[fromDayIndex] = newFromDay;
          newDays[toDayIndex] = newToDay;

          return { days: newDays };
      });
  },

  setTransportMode: (mode) => set({ transportMode: mode }),

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
                  buildings: []
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

      // If less than 2 buildings, clear route
      if (day.buildings.length < 2) {
          set((state) => {
              const newDays = [...state.days];
              if (newDays[dayIndex]) {
                  newDays[dayIndex] = { ...newDays[dayIndex], routeGeometry: null, distance: 0 };
              }
              return { days: newDays };
          });
          return;
      }

      // Optimistically set fallback straight-line geometry while loading
      set((state) => {
          const newDays = [...state.days];
          if (newDays[dayIndex]) {
              const fallbackGeometry = {
                  type: "Feature",
                  geometry: {
                      type: "LineString",
                      coordinates: newDays[dayIndex].buildings.map(b => [b.location_lng, b.location_lat])
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

      const coordinates = day.buildings.map(b => ({
          lat: b.location_lat,
          lng: b.location_lng
      }));

      try {
          const { data, error } = await supabase.functions.invoke('calculate-route', {
              body: {
                  coordinates,
                  transportMode: state.transportMode
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
