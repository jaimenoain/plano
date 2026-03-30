/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  /** Set by `loadAnalytics()` in `@/lib/consent` after GA script loads. */
  gtag?: (...args: unknown[]) => void;
  dataLayer: unknown[];
}

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
}
