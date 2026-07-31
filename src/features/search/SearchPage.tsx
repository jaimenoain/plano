/**
 * SearchPage — the /search route module. The surface itself lives in
 * SearchPageContent.tsx; this file owns the provider shell that /map
 * (MyMapPage) reuses with a forced mode.
 *
 * `?mode=library` is served here, not redirected to /map: My map is one of the
 * page's three tabs, so the switch has to be instant and in-place. /map remains
 * the library's advertised address — the same view, pinned to the route.
 */
import { MapProvider } from "@/features/maps/providers/MapContext";
import { BuildingSearchProvider } from "./context/BuildingSearchContext";
import { SearchPageContent, type SearchShellProps } from "./SearchPageContent";

/**
 * The one search/map surface, shared by `/search` (free mode switching) and
 * `/map` (pinned to the member's own library). Forking the page would
 * duplicate the bug-hardened orchestration (single-provider URL ownership,
 * find-mode chain, dual sidebar mounts) — thread props instead.
 */
export function SearchPageShell({ forcedMode }: SearchShellProps) {
  return (
    <MapProvider forcedMode={forcedMode}>
      <BuildingSearchProvider forcedMode={forcedMode}>
        <SearchPageContent forcedMode={forcedMode} />
      </BuildingSearchProvider>
    </MapProvider>
  );
}

export default function SearchPage() {
  return <SearchPageShell />;
}
