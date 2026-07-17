/**
 * useGlobalEntitySearch tests
 *
 * Guards the Find vs Browse dispatch and the browse-mode loading/error surface:
 * - no query + bounds → discover_people/discover_companies fire (name-search RPCs do not)
 * - no query + no bounds yet → discover queries are disabled AND report loading
 *   (so the People/Companies tabs show a spinner, not the empty state)
 * - query ≥ 2 chars → name-search RPCs fire, discover does not
 * - a failing discover query surfaces as peopleError/companiesError
 * - discover queries pass placeholderData: keepPreviousData (no pan-blanking)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSearchPeople = vi.hoisted(() => vi.fn());
const mockDiscoverPeople = vi.hoisted(() => vi.fn());
const mockSearchCompanies = vi.hoisted(() => vi.fn());
const mockDiscoverCompanies = vi.hoisted(() => vi.fn());

// Captured useQuery options + a set of query keys to force into an error state.
const queryCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);
const errorKeys = vi.hoisted(() => new Set<string>());
const KEEP_PREVIOUS = vi.hoisted(() => Symbol("keepPreviousData"));

vi.mock("@/features/credits/api/people", () => ({
  searchPeople: mockSearchPeople,
  discoverPeople: mockDiscoverPeople,
}));
vi.mock("@/features/credits/api/companies", () => ({
  searchCompanies: mockSearchCompanies,
  discoverCompanies: mockDiscoverCompanies,
}));
vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));
vi.mock("@tanstack/react-query", () => ({
  keepPreviousData: KEEP_PREVIOUS,
  useQuery: (opts: Record<string, unknown>) => {
    queryCalls.push(opts);
    const key = Array.isArray(opts.queryKey) ? String(opts.queryKey[0]) : String(opts.queryKey);
    if (!opts.enabled) return { data: undefined, isLoading: false, isError: false };
    if (errorKeys.has(key)) return { data: undefined, isLoading: false, isError: true };
    const data = (opts.queryFn as () => unknown)();
    return { data, isLoading: false, isError: false };
  },
}));

import { useGlobalEntitySearch } from "./useGlobalEntitySearch";

const BOUNDS = { north: 51.6, south: 51.4, east: 0.1, west: -0.2 };

beforeEach(() => {
  mockSearchPeople.mockReset();
  mockDiscoverPeople.mockReset();
  mockSearchCompanies.mockReset();
  mockDiscoverCompanies.mockReset();
  mockDiscoverPeople.mockResolvedValue([]);
  mockDiscoverCompanies.mockResolvedValue([]);
  mockSearchPeople.mockResolvedValue([]);
  mockSearchCompanies.mockResolvedValue([]);
  queryCalls.length = 0;
  errorKeys.clear();
});

describe("useGlobalEntitySearch", () => {
  it("browse mode (no query) with bounds fires the discover RPCs, not the search RPCs", () => {
    useGlobalEntitySearch({ searchQuery: "", bounds: BOUNDS });

    expect(mockDiscoverPeople).toHaveBeenCalledWith(BOUNDS);
    expect(mockDiscoverCompanies).toHaveBeenCalledWith(BOUNDS);
    expect(mockSearchPeople).not.toHaveBeenCalled();
    expect(mockSearchCompanies).not.toHaveBeenCalled();
  });

  it("browse mode with no bounds yet disables discover and reports loading", () => {
    const result = useGlobalEntitySearch({ searchQuery: "", bounds: null });

    expect(mockDiscoverPeople).not.toHaveBeenCalled();
    expect(mockDiscoverCompanies).not.toHaveBeenCalled();
    expect(result.peopleLoading).toBe(true);
    expect(result.companiesLoading).toBe(true);
  });

  it("find mode (query ≥ 2 chars) fires the search RPCs, not discover", () => {
    useGlobalEntitySearch({ searchQuery: "piano", bounds: BOUNDS });

    expect(mockSearchPeople).toHaveBeenCalledWith("piano");
    expect(mockSearchCompanies).toHaveBeenCalledWith("piano");
    expect(mockDiscoverPeople).not.toHaveBeenCalled();
    expect(mockDiscoverCompanies).not.toHaveBeenCalled();
  });

  it("surfaces a failing discover query as peopleError / companiesError", () => {
    errorKeys.add("discover-people");
    errorKeys.add("discover-companies");

    const result = useGlobalEntitySearch({ searchQuery: "", bounds: BOUNDS });

    expect(result.peopleError).toBe(true);
    expect(result.companiesError).toBe(true);
  });

  it("passes placeholderData: keepPreviousData to the discover queries", () => {
    useGlobalEntitySearch({ searchQuery: "", bounds: BOUNDS });

    const discoverPeopleCall = queryCalls.find(
      (c) => Array.isArray(c.queryKey) && c.queryKey[0] === "discover-people",
    );
    const discoverCompaniesCall = queryCalls.find(
      (c) => Array.isArray(c.queryKey) && c.queryKey[0] === "discover-companies",
    );
    expect(discoverPeopleCall?.placeholderData).toBe(KEEP_PREVIOUS);
    expect(discoverCompaniesCall?.placeholderData).toBe(KEEP_PREVIOUS);
  });
});
