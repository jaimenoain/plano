import { describe, it, expect } from 'vitest';
import { MapStateSchema, DEFAULT_LAT, DEFAULT_LNG, DEFAULT_ZOOM } from './useURLMapState';

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
    expect(result.mode).toBe('discover'); // Default mode
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
