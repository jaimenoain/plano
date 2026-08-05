/**
 * SearchPage — the /map route module. This is now the ONE map/search surface:
 * `/search` permanently redirects here (SearchRedirect.tsx). The surface
 * itself lives in SearchPageContent.tsx; this file owns the provider shell
 * plus the loader.
 *
 * The page is public and crawlable — anonymous visitors browse the whole
 * catalogue (All / Discover). Only `?mode=library` (My map) needs an account:
 * an empty personal map is a dead end, so signed-out visitors requesting it
 * are bounced to /login and back (Auth honors ?redirect=).
 */
import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { MapProvider } from "@/features/maps/providers/MapContext";
import { BuildingSearchProvider } from "./context/BuildingSearchContext";
import { SearchPageContent } from "./SearchPageContent";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get("mode") !== "library") return null;

  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const target = `/map${url.search}`;
    return redirect(`/login?redirect=${encodeURIComponent(target)}`, {
      headers: responseHeaders,
    });
  }
  return null;
}

// The map surface rewrites the URL on every viewport/filter change via
// setSearchParams — never re-run the server auth loader for those.
export function shouldRevalidate() {
  return false;
}

/**
 * The one search/map surface. Kept as a named export for tests that mount it
 * directly.
 */
export function SearchPageShell() {
  return (
    <MapProvider>
      <BuildingSearchProvider>
        <SearchPageContent />
      </BuildingSearchProvider>
    </MapProvider>
  );
}

export default function SearchPage() {
  return <SearchPageShell />;
}
