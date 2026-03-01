import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useMemo, useCallback } from 'react';
import { MapMode, MapFilters } from '@/types/plano-map';

// Constants
export const DEFAULT_LAT = 20;
export const DEFAULT_LNG = 0;
export const DEFAULT_ZOOM = 2;
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
  ),
  personalMinRating: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') {
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      }
      return val;
    },
    z.number().optional()
  ),
  collectionIds: z.array(z.string()).optional(),
  folderIds: z.array(z.string()).optional(),
  typologies: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  contexts: z.array(z.string()).optional(),
  contacts: z.array(z.object({
    id: z.string(),
    name: z.string(),
    avatar_url: z.string().optional().nullable(),
  })).optional(),
  ratedBy: z.array(z.string()).optional(),
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
    // Clamp personalMinRating if present and valid number
    if (typeof newObj.personalMinRating === 'number') {
        newObj.personalMinRating = Math.max(0, Math.min(3, newObj.personalMinRating));
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
  filters: z.any().transform(() => ({})).catch({}) // Default schema clears filters, but we inject them below
});

export type MapState = Omit<z.infer<typeof MapStateSchema>, 'filters'> & { filters: MapFilters };

export const useURLMapState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const mapState = useMemo(() => {
    // specific construct to handle standard params
    const raw = {
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      zoom: searchParams.get('zoom'),
      mode: searchParams.get('mode'),
    };
    const parsed = MapStateSchema.parse(raw);

    // Parse filters from URL for map consumption
    const getArrayParam = (param: string | null) => param ? param.split(",") : undefined;
    const getBoolParam = (param: string | null) => param === "true" ? true : undefined;
    const getNumParam = (param: string | null) => param ? parseInt(param, 10) : undefined;
    const getIdListParam = (param: string | null) => param ? param.split(",").map(id => ({ id, name: id })) : undefined;

    const filters: MapFilters = {
       query: searchParams.get("q") || undefined,
       status: getArrayParam(searchParams.get("status")),
       hideVisited: getBoolParam(searchParams.get("hideVisited")),
       hideSaved: getBoolParam(searchParams.get("hideSaved")),
       hideHidden: searchParams.get("hideHidden") === "false" ? false : true,
       hideWithoutImages: getBoolParam(searchParams.get("hideWithoutImages")),
       personalMinRating: getNumParam(searchParams.get("minRating")),
       contactMinRating: getNumParam(searchParams.get("contactMinRating")),
       category: searchParams.get("category") || undefined,
       typologies: getArrayParam(searchParams.get("typologies")),
       attributes: getArrayParam(searchParams.get("attributes")),
       architects: getIdListParam(searchParams.get("architects")),
       collections: getIdListParam(searchParams.get("collections")),
       folderIds: getArrayParam(searchParams.get("folders")),
       accessLevels: getArrayParam(searchParams.get("accessLevels")),
       accessLogistics: getArrayParam(searchParams.get("accessLogistics")),
       accessCosts: getArrayParam(searchParams.get("accessCosts")),
       ratedBy: getArrayParam(searchParams.get("rated_by")),
       filterContacts: getBoolParam(searchParams.get("filterContacts")),
    };

    return { ...parsed, filters } as MapState;
  }, [searchParams]);

  const setMapURL = useCallback((updates: Partial<MapState>) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (updates.lat !== undefined) newParams.set('lat', updates.lat.toString());
      if (updates.lng !== undefined) newParams.set('lng', updates.lng.toString());
      if (updates.zoom !== undefined) newParams.set('zoom', updates.zoom.toString());
      if (updates.mode !== undefined) newParams.set('mode', updates.mode);

      // We explicitly ignore updates.filters here to let useBuildingSearch handle it
      // and prevent dual-writes or overwriting flat params.
      // But MapContext currently expects `setMapURL({ filters })` to work, which is
      // now handled internally by Context/Search instead of useURLMapState for the URL part.
      // Actually wait, MapContext uses setMapURL to set URL state. If we drop it here,
      // MapContext's filters state will NOT be in the URL unless MapContext passes it down
      // to useBuildingSearch, OR MapContext just keeps it in local state.
      // The instructions state: "URL parameter synchronization must be handled by a single layer
      // (preferably within useBuildingSearch.ts which already possesses the foundation for flat params)."

      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    ...mapState,
    setMapURL
  };
};
