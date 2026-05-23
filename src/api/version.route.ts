/**
 * GET /api/version
 *
 * Returns the currently deployed app version. Used by the client to detect
 * when a new deployment has landed so it can trigger a forced reload even
 * when the service worker update mechanism fails to fire a page reload.
 *
 * Must stay cache-free (no-store) so the response always reflects the live
 * server version, bypassing both CDN and service worker caches.
 */
export function loader() {
  return Response.json(
    { version: __APP_VERSION__ },
    { headers: { "Cache-Control": "no-store" } },
  );
}
