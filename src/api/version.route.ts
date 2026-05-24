/**
 * GET /api/version
 *
 * Returns the currently deployed build id (per-deploy, e.g. git SHA). The
 * client polls this and reloads when it differs from the build id baked
 * into its own bundle — the ultimate fallback for when the SW
 * updatefound / controllerchange path fails to fire (common on iOS PWAs).
 *
 * Must stay cache-free (no-store) so the response always reflects the live
 * server build, bypassing both CDN and service worker caches.
 */
export function loader() {
  return Response.json(
    { buildId: __BUILD_ID__, version: __APP_VERSION__ },
    { headers: { "Cache-Control": "no-store" } },
  );
}
