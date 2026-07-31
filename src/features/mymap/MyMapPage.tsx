/**
 * /map — My Map, the member's personal library as a first-class address.
 *
 * Reuses the whole search/map surface (SearchPageShell) pinned to library
 * mode: the mode is implied by the route and never appears in the URL. The
 * mode toggle still renders with My map selected — its other two segments
 * navigate to /search — and the stats masthead + first-run state (MyMapChrome)
 * come with library mode itself, wherever it is shown.
 */
import { redirect, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "@/lib/supabase.server";
import { SearchPageShell } from "@/features/search";

export async function loader({ request }: LoaderFunctionArgs) {
  const responseHeaders = new Headers();
  const supabase = createSupabaseServerClient(request, responseHeaders);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // An empty personal map is a dead end — send visitors to log in and
    // bounce them straight back here (Auth honors ?redirect=).
    const url = new URL(request.url);
    const search = url.searchParams.toString();
    const target = `/map${search ? `?${search}` : ""}`;
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

export default function MyMapPage() {
  return <SearchPageShell forcedMode="library" />;
}
