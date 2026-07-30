/**
 * SearchPage — the /search route module. The surface itself lives in
 * SearchPageContent.tsx; this file owns the redirect loaders and the
 * provider shell that /map (MyMapPage) reuses with a forced mode.
 */
import {
  redirect,
  type ClientLoaderFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { MapProvider } from "@/features/maps/providers/MapContext";
import { BuildingSearchProvider } from "./context/BuildingSearchContext";
import { SearchPageContent, type SearchShellProps } from "./SearchPageContent";
import { libraryModeRedirectUrl } from "./utils/searchUrlParams";

// `/search?mode=library` is now `/map`. The server loader 302s document
// requests; the clientLoader handles SPA navs without a server round-trip
// (it never calls serverLoader, so plain /search stays client-only).
export function loader({ request }: LoaderFunctionArgs) {
  const to = libraryModeRedirectUrl(request.url);
  return to ? redirect(to) : null;
}

export function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const to = libraryModeRedirectUrl(request.url);
  return to ? redirect(to) : null;
}

/**
 * The one search/map surface, shared by `/search` (free mode switching) and
 * `/map` (pinned to the member's own library). Forking the page would
 * duplicate the bug-hardened orchestration (single-provider URL ownership,
 * find-mode chain, dual sidebar mounts) — thread props instead.
 */
export function SearchPageShell({ forcedMode, masthead }: SearchShellProps) {
  return (
    <MapProvider forcedMode={forcedMode}>
      <BuildingSearchProvider forcedMode={forcedMode}>
        <SearchPageContent forcedMode={forcedMode} masthead={masthead} />
      </BuildingSearchProvider>
    </MapProvider>
  );
}

export default function SearchPage() {
  return <SearchPageShell />;
}
