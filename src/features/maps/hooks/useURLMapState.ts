import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useMemo, useCallback } from 'react';
import { MapMode } from '@/types/plano-map';

// Constants
const DEFAULT_LAT = 20;
const DEFAULT_LNG = 0;
const DEFAULT_ZOOM = 2;
const DEFAULT_MODE: MapMode = 'discover';

// Schemas

// Helper to handle empty strings/nulls as undefined for default values
const preprocessNumber = (val: unknown) => {
  if (val === '' || val === null) return undefined;
  return val;
};

// 1. Map Mode Schema
export const MapModeSchema = z.enum(['discover', 'library']).catch(DEFAULT_MODE);

// 2. Filters Schema (Validation logic for the parsed object)
export const MapFiltersObjectSchema = z.object({
  minRating: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number().optional()
  ),
  min_rating: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number().optional()
  )
}).catchall(z.unknown())
.transform((obj) => {
    const newObj = { ...obj };
    // Clamp minRating if present and valid number
    if (typeof newObj.minRating === 'number') {
        newObj.minRating = Math.max(0, Math.min(3, newObj.minRating));
    }
    // Clamp min_rating if present and valid number (legacy support)
    if (typeof newObj.min_rating === 'number') {
        newObj.min_rating = Math.max(0, Math.min(3, newObj.min_rating));
    }
    return newObj;
});

// 3. Map State Schema (URL Params)
// This schema validates the object constructed from URLSearchParams
export const MapStateSchema = z.object({
  lat: z.preprocess(preprocessNumber, z.coerce.number().catch(DEFAULT_LAT)),
  lng: z.preprocess(preprocessNumber, z.coerce.number().catch(DEFAULT_LNG)),
  zoom: z.preprocess(preprocessNumber, z.coerce.number().catch(DEFAULT_ZOOM)),
  mode: z.preprocess((val) => val === null ? undefined : val, MapModeSchema),
  filters: z.string().optional().transform((str) => {
    if (!str) return {};
    try {
      const parsed = JSON.parse(str);
      if (typeof parsed !== 'object' || parsed === null) return {};
      // Validate/Clamp the parsed object
      return MapFiltersObjectSchema.parse(parsed);
    } catch {
      return {};
    }
  }).catch({})
});

export type MapState = z.infer<typeof MapStateSchema>;

export const useURLMapState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const mapState = useMemo(() => {
    // specific construct to handle standard params
    const raw = {
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      zoom: searchParams.get('zoom'),
      mode: searchParams.get('mode'),
      filters: searchParams.get('filters'),
    };
    return MapStateSchema.parse(raw);
  }, [searchParams]);

  const setMapURL = useCallback((updates: Partial<MapState>) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (updates.lat !== undefined) newParams.set('lat', updates.lat.toString());
      if (updates.lng !== undefined) newParams.set('lng', updates.lng.toString());
      if (updates.zoom !== undefined) newParams.set('zoom', updates.zoom.toString());
      if (updates.mode !== undefined) newParams.set('mode', updates.mode);

      if (updates.filters !== undefined) {
         if (Object.keys(updates.filters).length === 0) {
             newParams.delete('filters');
         } else {
             newParams.set('filters', JSON.stringify(updates.filters));
         }
      }

      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    ...mapState,
    setMapURL
  };
};
