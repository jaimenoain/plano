import { describe, it, expect } from "vitest";
import {
  createMapStore,
  approximateBoundsFromCenter,
  type SerializableMapState,
} from "./useMapStore";

const initial: SerializableMapState = {
  lat: 51.5,
  lng: -0.12,
  zoom: 12,
  mode: "discover",
  filters: {},
};

describe("useMapStore — bounds track the camera", () => {
  it("seeds bounds from the initial centre so the SERP list can query before onLoad", () => {
    const store = createMapStore(initial);
    expect(store.getState().bounds).toEqual(
      approximateBoundsFromCenter(initial.lat, initial.lng, initial.zoom),
    );
  });

  it("recomputes bounds on hydrateFromURL", () => {
    // Task 4.1: hydrateFromURL used to move lat/lng/zoom and leave `bounds`
    // alone, so a deep link or a back/forward hop left the SERP list querying
    // the PREVIOUS viewport until the map settled and fired onMoveEnd — the
    // list showing one city while the map showed another.
    const store = createMapStore(initial);
    const before = store.getState().bounds;

    store.getState().hydrateFromURL({
      lat: 40.42,
      lng: -3.7,
      zoom: 14,
      mode: "discover",
      filters: {},
    });

    const after = store.getState().bounds;
    expect(after).not.toEqual(before);
    expect(after).toEqual(approximateBoundsFromCenter(40.42, -3.7, 14));
    // The hydrated box must actually contain the hydrated centre.
    expect(after!.south).toBeLessThan(40.42);
    expect(after!.north).toBeGreaterThan(40.42);
    expect(after!.west).toBeLessThan(-3.7);
    expect(after!.east).toBeGreaterThan(-3.7);
  });

  it("setBounds is a no-op for an identical box, so an equal re-push cannot spin a refetch", () => {
    const store = createMapStore(initial);
    const box = { north: 1, south: 0, east: 1, west: 0 };
    store.getState().setBounds(box);
    const first = store.getState().bounds;
    store.getState().setBounds({ ...box });
    expect(store.getState().bounds).toBe(first);
  });
});
