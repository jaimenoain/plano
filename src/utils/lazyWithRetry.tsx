import { lazy, ComponentType } from "react";

/**
 * A wrapper around React.lazy that attempts to reload the page if the import fails due to
 * a chunk loading error. This commonly happens after a new deployment when old chunks are deleted.
 *
 * It uses sessionStorage to prevent infinite reload loops if the error persists.
 */
export const lazyWithRetry = <T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      // Check if the error is related to dynamic import failure
      const isChunkLoadError =
        error.name === 'ChunkLoadError' ||
        error.message?.includes('dynamically imported module') ||
        error.message?.includes('error loading dynamically imported module');

      if (isChunkLoadError) {
        const storageKey = 'last-force-refresh-timestamp';
        const now = Date.now();
        const lastRefresh = window.sessionStorage.getItem(storageKey);

        // If we haven't refreshed recently (within 10 seconds), try refreshing
        if (!lastRefresh || (now - parseInt(lastRefresh, 10)) > 10000) {
          window.sessionStorage.setItem(storageKey, now.toString());
          window.location.reload();

          // Return a never-resolving promise to suspend rendering while reloading
          return new Promise<{ default: T }>(() => {});
        }
      }

      // If not a chunk error or we just refreshed, re-throw
      throw error;
    }
  });
