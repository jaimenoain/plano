import * as Sentry from "@sentry/react";

export function initSentry(): void {
  if (import.meta.env.DEV) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    ignoreErrors: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "ChunkLoadError",
      "dynamically imported module",
      "ResizeObserver loop",
    ],
    beforeSend(event) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.data && typeof bc.data === "object" && "url" in bc.data) {
            const raw = bc.data.url;
            if (typeof raw === "string") {
              try {
                const url = new URL(raw);
                url.searchParams.delete("token");
                url.searchParams.delete("access_token");
                return { ...bc, data: { ...bc.data, url: url.toString() } };
              } catch {
                // not a valid URL
              }
            }
          }
          return bc;
        });
      }
      return event;
    },
  });
}

export function setSentryUser(userId: string | null): void {
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function captureErrorBoundaryException(
  error: unknown,
  componentStack: string | null | undefined,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, {
    contexts: { react: { componentStack: componentStack ?? "" } },
  });
}
