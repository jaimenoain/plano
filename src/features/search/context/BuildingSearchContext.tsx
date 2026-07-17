/**
 * Single shared useBuildingSearch instance for the search page's control
 * surfaces (mode toggle + filter drawer). Each useBuildingSearch() call owns
 * an independent copy of the filter state and its own URL writer, so two
 * mounted callers clobber each other's params (the PR #1574 bug class).
 * Mounting the hook once in a provider removes that failure mode entirely
 * and lets controls live anywhere in the page layout.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { useBuildingSearch } from '../hooks/useBuildingSearch';

type BuildingSearchState = ReturnType<typeof useBuildingSearch>;

const BuildingSearchContext = createContext<BuildingSearchState | null>(null);

export function BuildingSearchProvider({ children }: { children: ReactNode }) {
  const search = useBuildingSearch();
  return (
    <BuildingSearchContext.Provider value={search}>
      {children}
    </BuildingSearchContext.Provider>
  );
}

export function useBuildingSearchContext(): BuildingSearchState {
  const ctx = useContext(BuildingSearchContext);
  if (!ctx) {
    throw new Error('useBuildingSearchContext must be used within BuildingSearchProvider');
  }
  return ctx;
}
