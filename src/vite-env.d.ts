/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vitest/import-meta" />
/// <reference types="google.maps" />

interface Window {
  /** Set by `loadAnalytics()` in `@/lib/consent` after GA script loads. */
  gtag?: (...args: unknown[]) => void;
  dataLayer: unknown[];
}

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  /** Comma-separated emails allowed to open `/superadmin/cards` without `admin` / `app_admin` role. */
  readonly VITE_SUPERADMIN_EMAILS?: string;
}

declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

// Side-effect-only imports of untyped .mjs entry points (see src/entry.server.tsx).
// TS 6 flags side-effect imports that resolve to a module without type declarations.
declare module "*@react-router/node/dist/index.mjs";
