/**
 * URL params → MapFilters. Extracted from useURLMapState so the state parser
 * stays readable (and under the file-size ratchet); this module owns nothing
 * but the param-to-filter mapping.
 */
import {
  getShowLostFromUrlParams,
  normalizeConstructionStatuses,
} from '@/lib/buildingStatus';
import type { MapFilters, MapMode, MichelinRating } from '@/types/plano-map';

/** Library mode implies the member's own pins — the same statuses useBuildingSearch applies. */
export const LIBRARY_STATUS_FILTERS = ['visited', 'saved', 'pending'];

const getArrayParam = (param: string | null) => (param ? param.split(',') : undefined);
const getBoolParam = (param: string | null) => (param === 'true' ? true : undefined);
const getNumParam = (param: string | null) => (param ? parseInt(param, 10) : undefined);
const getIdListParam = (param: string | null) =>
  param ? param.split(',').map((id) => ({ id, name: id })) : undefined;

const parseMichelin = (param: string | null): MichelinRating | undefined => {
  const n = param ? parseInt(param, 10) : NaN;
  return n === 0 || n === 1 || n === 2 || n === 3 ? n : undefined;
};

/**
 * `mode` is passed in because it implies companion filters: on the library
 * route the map must open on the member's own pins even before
 * useBuildingSearch has written `status` to the URL — otherwise the first
 * cluster fetch is the whole catalogue.
 */
export function parseMapFilters(searchParams: URLSearchParams, mode: MapMode): MapFilters {
  const legacyPeopleUrlKey = 'arch' + 'itects';
  const peopleFromUrl = getIdListParam(searchParams.get('people'));
  const peopleLegacy = getIdListParam(searchParams.get(legacyPeopleUrlKey));
  const statusFromUrl = getArrayParam(searchParams.get('status'));

  return {
    query: searchParams.get('q') || undefined,
    // Explicit params win; a library route with no `status` yet falls back to
    // the mode's implied statuses so the map never opens on the catalogue.
    status: statusFromUrl ?? (mode === 'library' ? LIBRARY_STATUS_FILTERS : undefined),
    hideVisited: getBoolParam(searchParams.get('hideVisited')),
    hideSaved: getBoolParam(searchParams.get('hideSaved')),
    hideHidden: searchParams.get('hideHidden') === 'false' ? false : true,
    hideWithoutImages: getBoolParam(searchParams.get('hideWithoutImages')),
    personalMinRating: getNumParam(searchParams.get('minRating')),
    minRating:
      parseMichelin(searchParams.get('globalMinRating')) ??
      parseMichelin(searchParams.get('min_rating')),
    contactMinRating: parseMichelin(searchParams.get('contactMinRating')),
    category: searchParams.get('category') || undefined,
    typologies: getArrayParam(searchParams.get('typologies')),
    attributes: getArrayParam(searchParams.get('attributes')),
    people: peopleFromUrl ?? peopleLegacy,
    collections: getIdListParam(searchParams.get('collections')),
    folderIds: getArrayParam(searchParams.get('folders')),
    accessLevels: getArrayParam(searchParams.get('accessLevels')),
    accessLogistics: getArrayParam(searchParams.get('accessLogistics')),
    accessCosts: getArrayParam(searchParams.get('accessCosts')),
    ratedBy: getArrayParam(searchParams.get('rated_by')),
    filterContacts: getBoolParam(searchParams.get('filterContacts')),
    creditCompany: (() => {
      const id = searchParams.get('creditCompany');
      if (!id) return undefined;
      return { id, name: id };
    })(),
    creditRoles: getArrayParam(searchParams.get('creditRoles')),
    constructionStatuses: (() => {
      const raw = getArrayParam(searchParams.get('constructionStatuses'));
      return raw ? normalizeConstructionStatuses(raw) : undefined;
    })(),
    showLost: getShowLostFromUrlParams((key) => searchParams.get(key)) || undefined,
    photographyGaps: getBoolParam(searchParams.get('photographyGaps')),
    gapPhotoCounts: searchParams.get('gapPhotoCounts')
      ? searchParams.get('gapPhotoCounts')!.split(',').map(Number)
      : undefined,
    awardId: searchParams.get('awardId') || undefined,
    awardOutcome: searchParams.get('awardOutcome') || undefined,
    awardYearFrom: getNumParam(searchParams.get('awardYearFrom')),
    awardYearTo: getNumParam(searchParams.get('awardYearTo')),
    sizeCategories: getArrayParam(searchParams.get('sizeCategories')),
    minSizeSqm: getNumParam(searchParams.get('minSizeSqm')),
    maxSizeSqm: getNumParam(searchParams.get('maxSizeSqm')),
    minStoreys: getNumParam(searchParams.get('minStoreys')),
    maxStoreys: getNumParam(searchParams.get('maxStoreys')),
    centuries: (() => {
      const raw = searchParams.get('centuries');
      if (!raw) return undefined;
      const parsed = raw
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && (n >= 1 || n === 0));
      return parsed.length > 0 ? parsed : undefined;
    })(),
  };
}
