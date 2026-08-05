/**
 * /search — permanent redirect to /map. The two routes rendered the same
 * surface (SearchPageShell) forked only by a forced mode; the merge collapsed
 * them onto one address (/map, public, mode in the URL). This module exists
 * purely to keep old /search links and the (now-updated) sitemap entry alive.
 */
import { redirect, type LoaderFunctionArgs } from "react-router";

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  return redirect(`/map${url.search}`, 301);
}
