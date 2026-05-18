// @vitest-environment happy-dom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type maplibregl from 'maplibre-gl';
import { useMapClusterViewport } from './useMapClusterViewport';

function createMockMap(zoom = 10) {
  return {
    getBounds: () => ({
      getNorth: () => 10,
      getSouth: () => 0,
      getEast: () => 10,
      getWest: () => 0,
    }),
    getZoom: () => zoom,
  } as unknown as maplibregl.Map;
}

describe('useMapClusterViewport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates immediately when integer zoom level changes', () => {
    const { result } = renderHook(() => useMapClusterViewport());
    const map = createMockMap(10);

    act(() => {
      result.current.scheduleViewportUpdate(map, 10.2);
    });

    expect(result.current.viewport).toEqual({
      bounds: { north: 10, south: 0, east: 10, west: 0 },
      zoom: 10.2,
    });

    act(() => {
      result.current.scheduleViewportUpdate(map, 11.1);
    });

    expect(result.current.viewport?.zoom).toBe(11.1);
  });

  it('throttles pan-only updates at the same zoom level', () => {
    const { result } = renderHook(() => useMapClusterViewport());
    const map = createMockMap(10);

    act(() => {
      result.current.scheduleViewportUpdate(map, 10.1);
    });

    const firstViewport = result.current.viewport;

    act(() => {
      result.current.scheduleViewportUpdate(map, 10.2);
    });

    expect(result.current.viewport).toBe(firstViewport);

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.viewport?.zoom).toBe(10.2);
  });
});
