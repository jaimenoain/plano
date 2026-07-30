import { useSearchParams } from 'react-router';
import { z } from 'zod';
import { useMemo, useCallback } from 'react';
import { parseMapFilters } from '../utils/parseMapFilters';
import { MapMode, MapFilters } from '@/types/plano-map';

// Constants
export const DEFAULT_LAT = 20;
export const DEFAULT_LNG = 0;
export const DEFAULT_ZOOM = 2;
const DEFAULT_MODE: MapMode = null;

// Schemas

// Helper to handle empty strings/nulls as undefined for default values
const preprocessNumber = (val: unknown) => {
  if (val === '' || val === null) return undefined;
  return val;
};

// 1. Map Mode Schema
export const MapModeSchema = z.enum(['discover', 'library']).nullable().catch(DEFAULT_MODE);

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
  globalMinRating: z.preprocess(
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
  photographyGaps: z.boolean().optional(),
  gapPhotoCounts: z.array(z.number()).optional(),
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
    // Clamp globalMinRating if present and valid number
    if (typeof newObj.globalMinRating === 'number') {
        newObj.globalMinRating = Math.max(0, Math.min(3, newObj.globalMinRating));
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

export function syncFilterParams(newParams: URLSearchParams, filters: MapFilters) {
  const setOrDelete = (key: string, value?: string | null) => {
    if (value == null || value === '') {
      newParams.delete(key);
      return;
    }
    newParams.set(key, value);
  };

  const setArrayParam = (key: string, values?: string[]) => {
    if (values && values.length > 0) {
      newParams.set(key, values.join(','));
      return;
    }
    newParams.delete(key);
  };

  setOrDelete('q', filters.query?.trim() || undefined);
  setArrayParam('status', filters.status);

  if (filters.hideVisited) newParams.set('hideVisited', 'true');
  else newParams.delete('hideVisited');

  if (filters.hideSaved) newParams.set('hideSaved', 'true');
  else newParams.delete('hideSaved');

  // hideHidden defaults to true in parser, so only persist explicit false.
  if (filters.hideHidden === false) newParams.set('hideHidden', 'false');
  else newParams.delete('hideHidden');

  if (filters.hideWithoutImages) newParams.set('hideWithoutImages', 'true');
  else newParams.delete('hideWithoutImages');

  if ((filters.personalMinRating ?? 0) > 0) {
    newParams.set('minRating', String(filters.personalMinRating));
  } else {
    newParams.delete('minRating');
  }

  if (typeof filters.minRating === 'number') {
    newParams.set('globalMinRating', String(filters.minRating));
  } else {
    newParams.delete('globalMinRating');
  }

  if ((filters.contactMinRating ?? 0) > 0) {
    newParams.set('contactMinRating', String(filters.contactMinRating));
  } else {
    newParams.delete('contactMinRating');
  }

  setOrDelete('category', filters.category);
  setArrayParam('typologies', filters.typologies);
  setArrayParam('attributes', filters.attributes);
  setArrayParam('accessLevels', filters.accessLevels);
  setArrayParam('accessLogistics', filters.accessLogistics);
  setArrayParam('accessCosts', filters.accessCosts);
  setArrayParam('rated_by', filters.ratedBy);

  if (filters.people && filters.people.length > 0) {
    newParams.set('people', filters.people.map((p) => p.id).join(','));
    newParams.delete('architects');
  } else {
    newParams.delete('people');
    newParams.delete('architects');
  }

  if (filters.collections && filters.collections.length > 0) {
    newParams.set('collections', filters.collections.map((c) => c.id).join(','));
  } else {
    newParams.delete('collections');
  }

  setArrayParam('folders', filters.folderIds);

  if (filters.filterContacts) newParams.set('filterContacts', 'true');
  else newParams.delete('filterContacts');

  if (filters.creditCompany?.id) newParams.set('creditCompany', filters.creditCompany.id);
  else newParams.delete('creditCompany');

  setArrayParam('creditRoles', filters.creditRoles);
  setArrayParam('constructionStatuses', filters.constructionStatuses);

  if (filters.showLost) newParams.set('showLost', 'true');
  else newParams.delete('showLost');
  newParams.delete('showDemolished');

  if (filters.photographyGaps) newParams.set('photographyGaps', 'true');
  else newParams.delete('photographyGaps');

  if (filters.gapPhotoCounts && filters.gapPhotoCounts.length > 0) {
    newParams.set('gapPhotoCounts', filters.gapPhotoCounts.join(','));
  } else {
    newParams.delete('gapPhotoCounts');
  }

  if (filters.centuries && filters.centuries.length > 0) {
    newParams.set('centuries', filters.centuries.join(','));
  } else {
    newParams.delete('centuries');
  }

  setOrDelete('awardId', filters.awardId ?? undefined);
  setOrDelete('awardOutcome', filters.awardOutcome ?? undefined);
  if (filters.awardYearFrom != null) newParams.set('awardYearFrom', String(filters.awardYearFrom));
  else newParams.delete('awardYearFrom');
  if (filters.awardYearTo != null) newParams.set('awardYearTo', String(filters.awardYearTo));
  else newParams.delete('awardYearTo');

  setArrayParam('sizeCategories', filters.sizeCategories);
  if (filters.minSizeSqm != null) newParams.set('minSizeSqm', String(filters.minSizeSqm));
  else newParams.delete('minSizeSqm');
  if (filters.maxSizeSqm != null) newParams.set('maxSizeSqm', String(filters.maxSizeSqm));
  else newParams.delete('maxSizeSqm');
  if (filters.minStoreys != null) newParams.set('minStoreys', String(filters.minStoreys));
  else newParams.delete('minStoreys');
  if (filters.maxStoreys != null) newParams.set('maxStoreys', String(filters.maxStoreys));
  else newParams.delete('maxStoreys');
}

/**
 * Parse the full map state (lat/lng/zoom/mode + all filters) out of a
 * URLSearchParams. Extracted so the store's URL-sync (useMapUrlSync) and the
 * legacy useURLMapState hook share ONE parser — no logic fork.
 *
 * `forcedMode` is the route-implied mode (/map = library). It is passed IN
 * rather than patched onto the result because the mode implies its companion
 * filters: without it the first parse yields an empty filter set and the map's
 * opening cluster fetch is the whole catalogue, not the member's library —
 * `status` only arrives once useBuildingSearch has written it to the URL, an
 * effect (and a paint) later.
 */
export function parseMapStateFromParams(
  searchParams: URLSearchParams,
  forcedMode?: Exclude<MapMode, null>
): MapState {
    // specific construct to handle standard params
    const raw = {
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      zoom: searchParams.get('zoom'),
      mode: forcedMode ?? searchParams.get('mode'),
    };
    const parsed = MapStateSchema.parse(raw);
    const filters = parseMapFilters(searchParams, parsed.mode);

    return { ...parsed, filters } as MapState;
}

export const useURLMapState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const mapState = useMemo(() => parseMapStateFromParams(searchParams), [searchParams]);

  const setMapURL = useCallback((updates: Partial<MapState>) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);

      if (updates.lat !== undefined) newParams.set('lat', updates.lat.toString());
      if (updates.lng !== undefined) newParams.set('lng', updates.lng.toString());
      if (updates.zoom !== undefined) newParams.set('zoom', updates.zoom.toString());

      // Mode is synced by useBuildingSearch primarily to avoid double URL updates.
      // But map map update actions (like map move) might trigger setMapURL.
      // Since map moves don't include mode, this is generally safe.
      // If someone explicitly calls setMapURL({ mode }), we still handle it.
      if (updates.mode !== undefined) {
        if (updates.mode === null) newParams.delete('mode');
        else newParams.set('mode', updates.mode);
      }

      if (updates.filters !== undefined) {
        syncFilterParams(newParams, updates.filters);
      }

      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  return {
    ...mapState,
    setMapURL
  };
};
