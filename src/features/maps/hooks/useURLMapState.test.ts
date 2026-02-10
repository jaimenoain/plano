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
      filters: { minRating: 2 }
    });
  });

  it('should parse new filter fields correctly', () => {
    const filters = {
      collectionIds: ['1', '2'],
      personalMinRating: 2,
      typologies: ['t1'],
      materials: ['m1'],
      styles: ['s1'],
      contexts: ['c1']
    };

    const input = {
      filters: JSON.stringify(filters)
    };

    const result = MapStateSchema.parse(input);

    expect(result.filters).toEqual(expect.objectContaining(filters));
  });

  it('should clamp invalid ratings', () => {
    // Input rating > 3, expect 3
    const inputHigh = {
      filters: '{"minRating": 5, "personalMinRating": 5}'
    };
    const resultHigh = MapStateSchema.parse(inputHigh);
    expect(resultHigh.filters).toEqual(expect.objectContaining({ minRating: 3, personalMinRating: 3 }));

    // Input rating < 0, expect 0
    const inputLow = {
      filters: '{"minRating": -1}'
    };
    const resultLow = MapStateSchema.parse(inputLow);
    expect(resultLow.filters).toEqual(expect.objectContaining({ minRating: 0 }));

    // Test legacy min_rating if applicable (based on schema)
    const inputLegacy = {
      filters: '{"min_rating": 4}'
    };
    const resultLegacy = MapStateSchema.parse(inputLegacy);
    expect(resultLegacy.filters).toEqual(expect.objectContaining({ min_rating: 3 }));
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

  it('should handle malformed JSON in filters', () => {
    const input = {
      filters: '{badjson'
    };

    const result = MapStateSchema.parse(input);

    expect(result.filters).toEqual({});
  });

  it('should handle non-object JSON in filters', () => {
      const input = {
          filters: '123'
      };
      const result = MapStateSchema.parse(input);
      expect(result.filters).toEqual({});
  });

  it('should handle null JSON in filters', () => {
      const input = {
          filters: 'null'
      };
      const result = MapStateSchema.parse(input);
      expect(result.filters).toEqual({});
  });
});
