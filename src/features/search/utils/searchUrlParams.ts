/**
 * URL param parsers for the search page's filter state. Extracted from
 * useBuildingSearch so the pure parsing layer is testable on its own.
 */
import { CREDIT_ROLES } from "@/features/credits/api/credits";
import type { MapMode } from "@/types/plano-map";

// Same union as @/features/credits/types' CreditRole — derived from the
// canonical list so this module doesn't need a deep cross-feature import.
type CreditRole = (typeof CREDIT_ROLES)[number];

export const getArrayParam = (param: string | null): string[] => param ? param.split(",") : [];

export const getNumArrayParam = (param: string | null): number[] =>
  param
    ? param
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && (n >= 1 || n === 0))
    : [];
export const getBoolParam = (param: string | null, defaultVal: boolean): boolean =>
  param !== null ? param === "true" : defaultVal;
export const getNumParam = (param: string | null, defaultVal: number): number =>
  param ? parseInt(param, 10) : defaultVal;
export const getIdListParam = (param: string | null): { id: string; name: string }[] =>
  param ? param.split(",").map(id => ({ id, name: id })) : []; // Name to be hydrated later

const CREDIT_ROLE_SET = new Set<string>(CREDIT_ROLES);

/**
 * Parse the initial mode and its companion filters from URL params.
 *
 * `mode` is a first-class destination — a bare `/search?mode=library` link
 * must show the library on its own, so the mode implies its companion
 * filters as defaults (library = all personal statuses; discover = hide
 * what you already saved/visited). Explicit params always win over the
 * implied defaults.
 */
export function parseModeParams(getParam: (key: string) => string | null): {
  mode: MapMode;
  statusFilters: string[];
  hideVisited: boolean;
  hideSaved: boolean;
} {
  const m = getParam("mode");
  const mode: MapMode = m === 'discover' || m === 'library' ? m : null;
  const statusFromUrl = getArrayParam(getParam("status"));
  return {
    mode,
    statusFilters: statusFromUrl.length > 0
      ? statusFromUrl
      : mode === 'library' ? ['visited', 'saved', 'pending'] : [],
    hideVisited: getBoolParam(getParam("hideVisited"), mode === 'discover'),
    hideSaved: getBoolParam(getParam("hideSaved"), mode === 'discover'),
  };
}

export function parseCreditRolesParam(param: string | null): CreditRole[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => s.trim())
    .filter((x): x is CreditRole => CREDIT_ROLE_SET.has(x));
}

export function getCreditCompanyParam(param: string | null): { id: string; name: string } | null {
  if (!param || param.length < 32) return null;
  return { id: param.trim(), name: param.trim() };
}
