// @vitest-environment happy-dom
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCollectionItemsInView } from "./useCollectionItemsInView";
import type { CollectionItemWithBuilding, CollectionMarker } from "../types";
import type { DiscoveryBuilding } from "@/features/search";

/** London-ish box. Everything below is placed relative to it. */
const bounds = { north: 51.6, south: 51.4, east: 0.1, west: -0.3 };

function item(id: string, lat: number, lng: number): CollectionItemWithBuilding {
  return {
    id: `item-${id}`,
    building_id: id,
    note: null,
    custom_category_id: null,
    is_hidden: false,
    building: { id, name: id, location_lat: lat, location_lng: lng },
  } as unknown as CollectionItemWithBuilding;
}

function marker(id: string, lat: number, lng: number): CollectionMarker {
  return { id, name: id, lat, lng } as unknown as CollectionMarker;
}

function savedPlace(id: string, lat: number, lng: number): DiscoveryBuilding {
  return {
    id,
    name: id,
    location_lat: lat,
    location_lng: lng,
    personal_rating: null,
    personal_status: null,
  } as unknown as DiscoveryBuilding;
}

const inLondon = item("in", 51.5, -0.1);
const inParis = item("out", 48.85, 2.35);

describe("useCollectionItemsInView", () => {
  it("keeps only the roster rows inside the viewport and counts the rest", () => {
    const { result } = renderHook(() =>
      useCollectionItemsInView({
        items: [inLondon, inParis],
        markers: [marker("m-in", 51.5, -0.12), marker("m-out", 40.4, -3.7)],
        bounds,
        enabled: true,
      }),
    );

    expect(result.current.itemsInView.map((i) => i.building_id)).toEqual(["in"]);
    expect(result.current.markersInView.map((m) => m.id)).toEqual(["m-in"]);
    // One building and one marker fell outside — the counter covers both bands.
    expect(result.current.outOfViewCount).toBe(2);
    expect(result.current.isNarrowed).toBe(true);
  });

  it("passes everything through before the map reports a viewport", () => {
    // Filtering against a null viewport would flash an empty rail on every load.
    const { result } = renderHook(() =>
      useCollectionItemsInView({
        items: [inLondon, inParis],
        markers: [],
        bounds: null,
        enabled: true,
      }),
    );

    expect(result.current.itemsInView).toHaveLength(2);
    expect(result.current.outOfViewCount).toBe(0);
    expect(result.current.isNarrowed).toBe(false);
  });

  it("passes everything through when disabled (the itinerary's day sequence)", () => {
    const { result } = renderHook(() =>
      useCollectionItemsInView({
        items: [inLondon, inParis],
        markers: [],
        bounds,
        enabled: false,
      }),
    );

    expect(result.current.itemsInView).toHaveLength(2);
    expect(result.current.outOfViewCount).toBe(0);
  });

  it("reports nothing out of view when the whole roster is on screen", () => {
    const { result } = renderHook(() =>
      useCollectionItemsInView({ items: [inLondon], markers: [], bounds, enabled: true }),
    );

    expect(result.current.outOfViewCount).toBe(0);
    expect(result.current.isNarrowed).toBe(false);
  });

  it("narrows saved places by viewport and drops ones already collected", () => {
    const { result } = renderHook(() =>
      useCollectionItemsInView({
        items: [],
        markers: [],
        bounds,
        enabled: true,
        savedPlaces: [
          savedPlace("visible", 51.5, -0.1),
          savedPlace("far", 48.85, 2.35),
          savedPlace("already-in", 51.51, -0.11),
        ],
        excludeBuildingIds: new Set(["already-in"]),
      }),
    );

    expect(result.current.savedPlacesInView.map((p) => p.id)).toEqual(["visible"]);
  });

  it("offers no saved places while the layer is off or the viewport is unknown", () => {
    const { result } = renderHook(() =>
      useCollectionItemsInView({
        items: [],
        markers: [],
        bounds: null,
        enabled: true,
        savedPlaces: [savedPlace("visible", 51.5, -0.1)],
      }),
    );

    expect(result.current.savedPlacesInView).toEqual([]);
  });
});
