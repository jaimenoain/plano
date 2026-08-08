import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCollectionClusters } from './useCollectionClusters';
import type { DiscoveryBuilding } from '@/features/search';
import { MAP_MARKER_FILL } from '../constants/mapMarkerFills';

// Task 4.3: a collection cluster's colour must reflect its highest-rated pin.
// useCollectionClusters aggregates max_tier via getEffectivePinRank so the
// cluster's rank can never disagree with the rank a member pin would render.

const building = (overrides: Partial<DiscoveryBuilding>): DiscoveryBuilding =>
  ({
    id: overrides.id ?? '1',
    name: 'Test Building',
    location_lat: 40,
    location_lng: -3,
    credits: null,
    styles: null,
    year_completed: null,
    city: null,
    country: null,
    ...overrides,
  }) as DiscoveryBuilding;

const emptyItineraryMap = new Map<string, { dayIndex: number; sequence: number }>();

describe('useCollectionClusters', () => {
  it('reports max_tier 5 for a cluster containing one black (brandPrimary) pin among muted pins', () => {
    const buildings = [
      building({ id: '1', location_lat: 40.0, location_lng: -3.0, color: MAP_MARKER_FILL.surfaceMuted }),
      building({ id: '2', location_lat: 40.001, location_lng: -3.001, color: MAP_MARKER_FILL.surfaceMuted }),
      building({ id: '3', location_lat: 40.002, location_lng: -3.002, color: MAP_MARKER_FILL.brandPrimary }),
    ];

    const { result } = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 2));
    const clusters = result.current;

    expect(clusters).toHaveLength(1);
    expect(clusters[0].is_cluster).toBe(true);
    expect(clusters[0].count).toBe(3);
    expect(clusters[0].max_tier).toBe(5);
  });

  it('reports a lower max_tier for an all-muted cluster', () => {
    const buildings = [
      building({ id: '1', location_lat: 40.0, location_lng: -3.0, color: MAP_MARKER_FILL.surfaceMuted }),
      building({ id: '2', location_lat: 40.001, location_lng: -3.001, color: MAP_MARKER_FILL.surfaceMuted }),
    ];

    const { result } = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 2));
    const clusters = result.current;

    expect(clusters).toHaveLength(1);
    expect(clusters[0].max_tier).toBe(2);
  });

  it('folds an itinerary stop into the cluster as rank 5', () => {
    const buildings = [
      building({ id: '1', location_lat: 40.0, location_lng: -3.0, color: MAP_MARKER_FILL.surfaceMuted }),
      building({ id: '2', location_lat: 40.001, location_lng: -3.001, color: MAP_MARKER_FILL.surfaceMuted }),
    ];
    const itineraryMap = new Map([['1', { dayIndex: 0, sequence: 1 }]]);

    const { result } = renderHook(() => useCollectionClusters(buildings, itineraryMap, 2));
    const clusters = result.current;

    expect(clusters).toHaveLength(1);
    expect(clusters[0].max_tier).toBe(5);
  });

  it('leaves counts, ids and non-cluster passthrough unchanged when points do not merge', () => {
    const buildings = [
      building({ id: 'far-1', location_lat: 10, location_lng: 10, color: MAP_MARKER_FILL.brandPrimary }),
      building({ id: 'far-2', location_lat: -10, location_lng: -10, color: MAP_MARKER_FILL.surfaceMuted }),
    ];

    const { result } = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 2));
    const clusters = result.current;

    expect(clusters).toHaveLength(2);
    for (const c of clusters) {
      expect(c.is_cluster).toBe(false);
      expect(c.count).toBe(1);
    }
    expect(clusters.map((c) => c.id).sort()).toEqual(['far-1', 'far-2']);
  });

  // ADR 0033: a member-chosen colour with an explicit size token ranks by size,
  // not hue — a large light-coloured pin must still be able to carry rank 5.
  it('ranks a large member-coloured pin (size lg) above a small one, regardless of hue', () => {
    const buildings = [
      building({ id: '1', location_lat: 40.0, location_lng: -3.0, color: '#ffd54f', markerSize: 'sm' }),
      building({ id: '2', location_lat: 40.001, location_lng: -3.001, color: '#ff00aa', markerSize: 'lg' }),
    ];

    const { result } = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 2));
    const clusters = result.current;

    expect(clusters).toHaveLength(1);
    expect(clusters[0].max_tier).toBe(5);
  });

  it('splits a merged cluster back into individual pins at high zoom', () => {
    const buildings = [
      building({ id: '1', location_lat: 40.0, location_lng: -3.0, color: MAP_MARKER_FILL.brandPrimary }),
      building({ id: '2', location_lat: 40.5, location_lng: -3.5, color: MAP_MARKER_FILL.surfaceMuted }),
    ];

    const zoomedOut = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 2));
    const zoomedIn = renderHook(() => useCollectionClusters(buildings, emptyItineraryMap, 18));

    expect(zoomedOut.result.current.length).toBeLessThanOrEqual(zoomedIn.result.current.length);
    expect(zoomedIn.result.current.every((c) => !c.is_cluster)).toBe(true);
  });
});
