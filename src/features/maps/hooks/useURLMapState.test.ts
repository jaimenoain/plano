import { describe, it, expect } from 'vitest';
import {
  MapStateSchema,
  parseMapStateFromParams,
  DEFAULT_LAT,
  DEFAULT_LNG,
  DEFAULT_ZOOM,
} from './useURLMapState';

describe('parseMapStateFromParams — forced (route-implied) mode', () => {
  // Regression: /map seeds the map store from the URL before useBuildingSearch
  // has written `status`. Without the mode's implied statuses the opening
  // get_map_clusters_v3 call is unfiltered, so My Map paints the entire
  // catalogue while the SERP list (which never runs unfiltered) shows the
  // member's own — a handful of buildings against hundreds of pins.
  it('implies the library statuses when the URL carries no status yet', () => {
    const state = parseMapStateFromParams(new URLSearchParams(''), 'library');
    expect(state.mode).toBe('library');
    expect(state.filters.status).toEqual(['visited', 'saved', 'pending']);
  });

  it('lets an explicit status param win over the implied default', () => {
    const state = parseMapStateFromParams(new URLSearchParams('status=visited'), 'library');
    expect(state.filters.status).toEqual(['visited']);
  });

  it('leaves status unset with no forced mode and no status param (/search browses everything)', () => {
    const state = parseMapStateFromParams(new URLSearchParams(''));
    expect(state.mode).toBeNull();
    expect(state.filters.status).toBeUndefined();
  });

  it('a forced mode overrides a conflicting `mode` param (the route owns the mode)', () => {
    const state = parseMapStateFromParams(new URLSearchParams('mode=discover'), 'library');
    expect(state.mode).toBe('library');
    expect(state.filters.status).toEqual(['visited', 'saved', 'pending']);
  });
});

describe('MapStateSchema', () => {
  it('should parse valid URL params correctly', () => {
    const input = {
      lat: '40.7128',
      lng: '-74.0060',
      zoom: '12',
      mode: 'library',
      filters: '{"minRating": 2}'
    };

    const result = MapStateSchema.parse(input);

    expect(result).toEqual({
      lat: 40.7128,
      lng: -74.0060,
      zoom: 12,
      mode: 'library',
      filters: {} // MapStateSchema always returns an empty object for filters now
    });
  });

  it('should use default values for missing params', () => {
    const input = {
        lat: null,
        lng: '',
        zoom: undefined
    }; // Simulate missing params from URL

    const result = MapStateSchema.parse(input);

    expect(result.lat).toBe(DEFAULT_LAT);
    expect(result.lng).toBe(DEFAULT_LNG);
    expect(result.zoom).toBe(DEFAULT_ZOOM);
    // Default mode is now null (no `mode` param yields the unselected state):
    // DEFAULT_MODE = null and MapModeSchema = enum(['discover','library']).nullable().catch(null).
    expect(result.mode).toBe(null);
    expect(result.filters).toEqual({});
  });

  it('should ignore any input in filters and return empty object', () => {
    const input1 = { filters: '{badjson' };
    const result1 = MapStateSchema.parse(input1);
    expect(result1.filters).toEqual({});

    const input2 = { filters: '123' };
    const result2 = MapStateSchema.parse(input2);
    expect(result2.filters).toEqual({});

    const input3 = { filters: 'null' };
    const result3 = MapStateSchema.parse(input3);
    expect(result3.filters).toEqual({});

    const input4 = { filters: '{"valid":"json"}' };
    const result4 = MapStateSchema.parse(input4);
    expect(result4.filters).toEqual({});
  });
});
