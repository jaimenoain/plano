# Plano — React Router v7 SSR Migration Roadmap

**Goal:** Migrate from a Vite + React SPA to React Router v7 framework mode (SSR) so that
building, architect, and profile pages are server-rendered and fully indexable by Googlebot
on first request.

**Hosting:** Vercel (functions pinned to `lhr1`, same region as Supabase `eu-west-2`)  
**Estimated total effort:** 6–7 weeks of focused engineering work.

---

## Architecture overview

### What changes

```
BEFORE (SPA)                          AFTER (SSR)

Browser request                       Browser request
    │                                     │
    ▼                                     ▼
CDN / static host                     Vercel serverless function (lhr1)
    │                                     │
    ▼                                     │  1. Run RR7 loader
index.html (empty shell)                  │  2. Fetch from Supabase (server client)
    │                                     │  3. Render component to HTML
    ▼                                     │
Browser downloads JS                      ▼
    │                               Full HTML with title, meta, OG, JSON-LD
    ▼                                     │
React mounts                              ▼
    │                               Browser receives indexable HTML
    ▼                                     │
Supabase fetch (async)                    ▼
    │                               React hydrates (client takes over)
    ▼                                     │
MetaHead runs (too late for bots)         ▼
                                    Auth-gated fetches run client-side
```

### What does NOT change

- All existing React components, hooks, and UI — reused as-is
- The Supabase database schema and RPCs
- The `supabase/functions/` edge functions (`og-tags`, `sitemap`)
- TanStack Query for client-side data fetching (keeps working alongside loaders)
- The existing auth flow for all non-SSR pages

### SSR scope

**Server-rendered — loaders required:**

| Route | Page | Priority |
|---|---|---|
| `/building/:id/:slug` | BuildingDetails | P0 |
| `/building/:id` | BuildingDetails (slug fallback) | P0 |
| `/architect/:id` | ArchitectDetails | P1 |
| `/profile/:username` | Profile | P1 |

**Stays client-side rendered — no changes required:**

- `/` feed, `/explore`, `/search`, `/post`, `/notifications`, `/connect` (auth-gated, no SEO value)
- `/review/:id`, `/:username/folders/:slug` (excluded from scope — low SEO value)
- All `/admin/*` routes
- `/settings`, `/add-building`, `/building/:id/edit`, `/auth`, `/onboarding`

### Key principle: loaders provide public data only

Server loaders fetch only what is needed for SEO — building name, description, hero image,
architect name, structured data. All auth-gated data (user status, personal notes, reviews
feed) stays as client-side fetches, unchanged. This keeps server responses fast and avoids
session dependency on every page load.

---

## Phase 1 — Prepare (Week 1)

### 1.1 Install packages

- [x] Install React Router v7 and the Vercel adapter:
  ```bash
  npm install react-router@7 @react-router/dev @react-router/vercel
  npm uninstall react-router-dom
  ```
- [x] Install the Supabase SSR package:
  ```bash
  npm install @supabase/ssr
  ```

### 1.2 Rename all `react-router-dom` imports to `react-router`

`react-router-dom` and `react-router` are merged in v7. This is a find-and-replace with
no logic changes.

- [x] Confirm the scope of the rename:
  ```bash
  grep -r "from 'react-router-dom'" src --include="*.tsx" --include="*.ts" | wc -l
  ```
- [x] Run the bulk rename across `src/`:
  ```bash
  find src -type f \( -name "*.tsx" -o -name "*.ts" \) \
    -exec sed -i "s/from 'react-router-dom'/from 'react-router'/g" {} +
  ```
- [x] Run the same rename across any Playwright test files that import from `react-router-dom`.
- [x] Run `npm run typecheck` and confirm zero errors before continuing.

### 1.3 Fix known browser-only code before SSR is enabled

Two files are known to crash the server renderer. Fix them now, before the framework
is enabled, so they are not introduced as breaking changes mid-migration.

- [x] **`src/components/common/MetaHead.tsx`** — replace `window.location.origin` with a
  build-time constant. `window` is undefined on the server.

  ```ts
  // BEFORE
  return `${window.location.origin}${img.startsWith("/") ? "" : "/"}${img}`;

  // AFTER
  const SITE_URL = "https://plano.app";
  return `${SITE_URL}${img.startsWith("/") ? "" : "/"}${img}`;
  ```

- [x] **`vite.config.ts`** — add `strategies` and `devOptions` to VitePWA to prevent the
  service worker from intercepting SSR dev server responses:

  ```ts
  VitePWA({
    strategies: "generateSW",       // add
    registerType: "prompt",
    devOptions: { enabled: false }, // add
    // ... rest of existing config unchanged
  })
  ```

  > The browser Supabase client (`src/integrations/supabase/client.ts`) also uses
  > `localStorage`, which crashes the server. Do not fix it here — it is handled in
  > Phase 3 as part of the full auth migration.

### 1.4 Create `.env.example`

- [x] Create `.env.example` at the project root:
  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_PUBLISHABLE_KEY=
  VITE_GOOGLE_MAPS_API_KEY=
  VITE_PUBLIC_STORAGE_URL=
  VITE_SENTRY_DSN=
  VITE_GA_MEASUREMENT_ID=
  ```
- [x] Confirm `.env` is listed in `.gitignore`.
- [x] Add all real values to Vercel's environment variable dashboard under Production,
  Preview, and Development environments.

---

## Phase 2 — Framework mode bootstrap (Week 2)

The goal of this phase is to get the app running in RR7 framework mode with zero functional
changes. Everything stays CSR — no loaders yet. This is a structural migration only.

### 2.1 Create `react-router.config.ts`

- [x] Create `react-router.config.ts` at the project root:
  ```ts
  import type { Config } from "@react-router/dev/config";

  export default {
    ssr: true,
    // Required: source files live in src/, not app/ (RR7's default)
    appDirectory: "src",
  } satisfies Config;
  ```
  > Without `appDirectory: "src"`, RR7 looks for routes, entry files, and root in an
  > `app/` folder at the project root. Since this project's source is in `src/`, all
  > file paths in `routes.ts`, `root.tsx`, and the entry files must be under `src/` and
  > this config option must be set to match.

### 2.2 Migrate the route tree to `app/routes.ts`

Config-based routing preserves the existing `App.tsx` route tree almost verbatim.
`AdminGuard` remains a pure React component with no changes. `MainLayout` receives the
tracker hooks in section 2.3 but its route registration here is unchanged.

- [x] Create `app/routes.ts`:
  ```ts
  import {
    type RouteConfig,
    route,
    layout,
    index,
  } from "@react-router/dev/routes";

  export default [
    // Public / Standalone
    route("/auth", "features/auth/pages/Auth.tsx"),
    route("/update-password", "features/auth/pages/UpdatePassword.tsx"),
    route("/onboarding", "features/auth/pages/Onboarding.tsx"),
    route("/terms", "pages/Terms.tsx"),
    route("/admin/unauthorized", "features/admin/pages/Unauthorized.tsx"),
    route("/admin/merge", "features/admin/pages/MergeBuildings.tsx"),
    route("/admin/merge/:targetId/:sourceId", "features/admin/pages/MergeComparison.tsx"),

    // Admin (AdminGuard remains as a wrapper component inside AdminLayout)
    layout("features/admin/components/AdminLayout.tsx", [
      route("/admin", "features/admin/pages/Dashboard.tsx"),
      route("/admin/buildings", "features/admin/pages/Buildings.tsx"),
      route("/admin/users", "features/admin/pages/Users.tsx"),
      route("/admin/moderation", "features/admin/pages/Moderation.tsx"),
      route("/admin/images", "features/admin/pages/ImageWall.tsx"),
      route("/admin/photos", "features/admin/pages/PhotoAnalytics.tsx"),
      route("/admin/audit", "features/admin/pages/BuildingAudit.tsx"),
      route("/admin/claims", "features/admin/pages/ArchitectClaims.tsx"),
      route("/admin/storage-jobs", "features/admin/pages/StorageJobs.tsx"),
      route("/admin/system", "pages/AdminSystemPlaceholder.tsx"),
    ]),

    // Main app (MainLayout wraps all user-facing routes)
    layout("components/layout/MainLayout.tsx", [
      index("features/feed/pages/Index.tsx"),
      route("/explore", "features/explore/pages/Explore.tsx"),
      route("/search", "features/search/SearchPage.tsx"),
      route("/post", "pages/Post.tsx"),
      route("/notifications", "features/notifications/pages/Notifications.tsx"),
      route("/add-building", "features/buildings/pages/AddBuilding.tsx"),
      route("/connect", "features/connect/pages/Connect.tsx"),
      route("/groups/*", "pages/NotFound.tsx"),
      route("/profile", "features/profile/pages/Profile.tsx"),
      route("/profile/:username", "features/profile/pages/Profile.tsx"),
      route("/profile/photos", "features/profile/pages/UserPhotoGallery.tsx"),
      route("/profile/:username/photos", "features/profile/pages/UserPhotoGallery.tsx"),
      route("/settings", "features/profile/pages/Settings.tsx"),
      route("/:username/map/:slug", "features/collections/components/CollectionMapPage.tsx"),
      route("/:username/folders/:slug", "features/profile/pages/FolderView.tsx"),
      route("/building/:id/:slug", "features/buildings/pages/BuildingDetails.tsx"),
      route("/building/:id", "features/buildings/pages/BuildingDetails.tsx"),
      route("/building/:id/:slug/edit", "features/buildings/pages/EditBuilding.tsx"),
      route("/building/:id/edit", "features/buildings/pages/EditBuilding.tsx"),
      route("/building/:id/:slug/review", "features/buildings/pages/WriteReview.tsx"),
      route("/building/:id/review", "features/buildings/pages/WriteReview.tsx"),
      route("/architect/dashboard", "features/architect/pages/ArchitectDashboard.tsx"),
      route("/architect/:id", "features/architect/pages/ArchitectDetails.tsx"),
      route("/architect/:id/edit", "features/architect/pages/EditArchitect.tsx"),
      route("/review/:id", "features/buildings/pages/ReviewDetails.tsx"),
      route("*", "pages/NotFound.tsx"),
    ]),
  ] satisfies RouteConfig;
  ```

### 2.3 Move `useLoginTracker` and `usePresenceTracker` into `MainLayout`

In the current `App.tsx`, these hooks are called inside `AppContent`, which wraps the
entire router. In RR7, there is no equivalent wrapper — `root.tsx` renders before the
route tree is known and cannot call auth-dependent hooks. Both hooks belong in
`MainLayout`, which already wraps every user-facing route and has access to `useAuth`.

- [x] Open `src/components/layout/MainLayout.tsx` and add the two hook calls:
  ```tsx
  import { useLoginTracker } from "@/features/auth/hooks/useLoginTracker";
  import { usePresenceTracker } from "@/features/auth/hooks/usePresenceTracker";

  export function MainLayout() {
    useLoginTracker();
    usePresenceTracker();
    // ... rest of existing MainLayout unchanged
  }
  ```

  The global error handlers (`logDiagnosticError` on `window.addEventListener('error', ...)`)
  and the `setSentryUser` call also currently live in `AppContent`. Move those into
  `MainLayout` in the same step, since `MainLayout` has access to `useAuth` and renders
  on every user-facing navigation.

### 2.4 Create `app/root.tsx`

Replaces the top-level `App.tsx` wrapper. Provides the HTML document shell and all global
providers. The `AppContent` component from the old `App.tsx` is dissolved — its providers
all move here.

- [x] Create `app/root.tsx`:
  ```tsx
  import {
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
  } from "react-router";
  import { useState } from "react";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { HelmetProvider } from "react-helmet-async";
  import { AuthProvider } from "@/features/auth/hooks/useAuth";
  import { Toaster } from "@/components/ui/toaster";
  import { Toaster as Sonner } from "@/components/ui/sonner";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { PwaProvider } from "@/hooks/usePwaInstall";
  import { GoogleAnalytics } from "@/components/GoogleAnalytics";
  import { CookieConsent } from "@/components/common/CookieConsent";
  import { PwaPrompt } from "@/components/pwa/PwaPrompt";
  import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";

  export function Layout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="theme-color" content="#ffffff" />
          <Links />
          <Meta />
        </head>
        <body>
          {children}
          <ScrollRestoration />
          <Scripts />
        </body>
      </html>
    );
  }

  function makeQueryClient() {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        },
      },
    });
  }

  export default function Root() {
    const [queryClient] = useState(makeQueryClient);

    return (
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <HelmetProvider>
            <AuthProvider>
              <TooltipProvider>
                <PwaProvider>
                  <GoogleAnalytics />
                  <CookieConsent />
                  <PwaPrompt />
                  <Toaster />
                  <Sonner />
                  <Outlet />
                </PwaProvider>
              </TooltipProvider>
            </AuthProvider>
          </HelmetProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    );
  }
  ```

### 2.5 Create entry files

- [x] Create `app/entry.client.tsx`:
  ```tsx
  import { startTransition, StrictMode } from "react";
  import { hydrateRoot } from "react-dom/client";
  import { HydratedRouter } from "react-router/dom";
  import { initSentry } from "@/lib/sentry";
  import { getConsent, loadAnalytics } from "@/lib/consent";

  initSentry();
  if (getConsent() === "granted") loadAnalytics();

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
  });
  ```

- [x] Create `app/entry.server.tsx` (Node.js / Vercel):
  ```tsx
  import { PassThrough } from "node:stream";
  import { renderToPipeableStream } from "react-dom/server";
  import { ServerRouter } from "react-router";
  import type { EntryContext } from "react-router";

  export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    routerContext: EntryContext
  ) {
    return new Promise((resolve, reject) => {
      const { pipe } = renderToPipeableStream(
        <ServerRouter context={routerContext} url={request.url} />,
        {
          onShellReady() {
            responseHeaders.set("Content-Type", "text/html");
            const stream = new PassThrough();
            resolve(
              new Response(stream as unknown as ReadableStream, {
                status: responseStatusCode,
                headers: responseHeaders,
              })
            );
            pipe(stream);
          },
          onShellError: reject,
        }
      );
    });
  }
  ```

### 2.6 Update `vite.config.ts`

- [x] Replace `@vitejs/plugin-react-swc` with the RR7 Vite plugin:
  ```ts
  import { defineConfig } from "vite";
  import { reactRouter } from "@react-router/dev/vite";
  import path from "path";
  import { VitePWA } from "vite-plugin-pwa";

  export default defineConfig({
    plugins: [
      reactRouter(), // replaces @vitejs/plugin-react-swc
      VitePWA({
        strategies: "generateSW",
        registerType: "prompt",
        devOptions: { enabled: false },
        includeAssets: [
          "robots.txt",
          "android-chrome-192x192.png",
          "android-chrome-512x512.png",
          "apple-touch-icon.png",
        ],
        manifest: {
          name: "Plano — The world's architecture, cataloged.",
          short_name: "Plano",
          description: "Track your architecture visits, rate buildings, and discover what friends are exploring.",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: "/",
          icons: [
            { src: "android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          maximumFileSizeToCacheInBytes: 5000000,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "mapbox-gl": "maplibre-gl",
      },
    },
  });
  ```

### 2.7 Phase 2 checkpoint

- [x] `npm run dev` serves the app in SSR mode with all routes working identically to before.
- [x] No page-level SEO loaders exist yet — all content pages are still CSR shells.
      (The root session loader added in Phase 3 does not count against this condition.)
- [x] `npm run test` passes with zero failures.
- [x] Manual smoke test: auth flow, a building page, an admin page.

---

## Phase 3 — Auth & Supabase SSR (Week 3)

The current Supabase client stores sessions in `localStorage`, which the server cannot
read. Phase 3 replaces it with cookie-based auth so that loaders can access the session
from the incoming request.

### 3.1 Create the server-side Supabase client

Used exclusively in loaders and actions — never imported by components.

- [x] Create `app/lib/supabase.server.ts`:
  ```ts
  import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
  import type { Database } from "@/integrations/supabase/types";

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

  export function createSupabaseServerClient(request: Request, responseHeaders: Headers) {
    return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            responseHeaders.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            );
          });
        },
      },
    });
  }
  ```

### 3.2 Update the browser-side Supabase client

- [x] Replace the `localStorage`-based client in `src/integrations/supabase/client.ts`
  with `createBrowserClient` from `@supabase/ssr`. The `supabase` export is a drop-in
  replacement — all component code continues to work without modification:
  ```ts
  import { createBrowserClient } from "@supabase/ssr";
  import type { Database } from "@/integrations/supabase/types";

  export const supabase = createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL as string,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
  );
  ```
  Sessions are now stored in cookies instead of `localStorage`.

### 3.3 Add a root loader and wire session into `AuthProvider`

- [x] Add the `loader` export to `app/root.tsx`:
  ```ts
  import type { LoaderFunctionArgs } from "react-router";
  import { createSupabaseServerClient } from "~/lib/supabase.server";

  export async function loader({ request }: LoaderFunctionArgs) {
    const headers = new Headers();
    const supabase = createSupabaseServerClient(request, headers);
    const { data: { session } } = await supabase.auth.getSession();
    return Response.json({ session }, { headers });
  }
  ```

- [x] Update `AuthProvider` in `src/features/auth/hooks/useAuth.tsx` to accept an
  `initialSession` prop, skipping the loading state when a session is already known:
  ```tsx
  export function AuthProvider({
    children,
    initialSession,
  }: {
    children: ReactNode;
    initialSession?: Session | null;
  }) {
    const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
    const [session, setSession] = useState<Session | null>(initialSession ?? null);
    const [loading, setLoading] = useState(!initialSession);
    // ... rest unchanged
  }
  ```

- [x] Pass `session` from the root loader into `AuthProvider` in `Root()`:
  ```tsx
  import { useLoaderData } from "react-router";

  export default function Root() {
    const { session } = useLoaderData<typeof loader>();
    return (
      <AuthProvider initialSession={session}>
        {/* ... */}
      </AuthProvider>
    );
  }
  ```

### 3.4 Auth flow verification

- [ ] Sign in persists across page refreshes (cookie is set, not localStorage).
- [ ] Sign out clears the session and redirects correctly.
- [ ] Unauthenticated users are redirected to `/auth` from all previously protected pages.
- [ ] Admin guard still works correctly.
- [ ] Cookie `SameSite` and `Secure` attributes are correct for `plano.app`.

---

## Phase 4 — SSR loaders for SEO-critical pages (Weeks 4–5)

### Loader design pattern

Each loader follows the same three steps:
1. Fetch the minimal public data needed for meta tags and above-the-fold content.
2. Return it as JSON via `Response.json()`.
3. The component reads it with `useLoaderData()` for the initial render; all user-specific
   data continues to be fetched client-side after hydration, exactly as before.

### 4.1 BuildingDetails loader

`fetchBuildingData` in `BuildingDetails.tsx` makes 10+ Supabase calls. The loader needs
only two: the building record and its hero image. All other calls (reviews feed, user
status, links, collections, follows) stay as client-side fetches — unchanged.

- [ ] Audit `fetchBuildingDetails` in `src/utils/supabaseFallback.ts` for any browser-only
  APIs (`window`, `localStorage`, `document`). Fix any found before proceeding.

- [ ] Add an optional `client` parameter to `fetchBuildingDetails` so the loader can pass
  a server client without touching `localStorage`:
  ```ts
  export async function fetchBuildingDetails(id: string, client?: SupabaseClient) {
    const db = client ?? supabase;
    // ... rest unchanged
  }
  ```

- [ ] Create `src/features/buildings/pages/BuildingDetails.loader.ts`:
  ```ts
  import type { LoaderFunctionArgs } from "react-router";
  import { createSupabaseServerClient } from "~/lib/supabase.server";
  import { fetchBuildingDetails } from "@/utils/supabaseFallback";
  import { getBuildingImageUrl } from "@/utils/image";

  export async function buildingLoader({ request, params }: LoaderFunctionArgs) {
    const headers = new Headers();
    const supabase = createSupabaseServerClient(request, headers);
    const building = await fetchBuildingDetails(params.id!, supabase);
    if (!building) throw new Response("Not found", { status: 404 });

    let heroImageUrl: string | null = null;
    if (building.hero_image_id) {
      const { data } = await supabase
        .from("review_images")
        .select("storage_path")
        .eq("id", building.hero_image_id)
        .single();
      if (data) heroImageUrl = getBuildingImageUrl(data.storage_path) ?? null;
    }

    return Response.json({ building, heroImageUrl }, { headers });
  }
  ```

- [ ] Update `BuildingDetails.tsx` to export the loader, initialise state from loader
  data, and pass SEO props to `MetaHead`:
  ```tsx
  export { buildingLoader as loader } from "./BuildingDetails.loader";

  export default function BuildingDetails() {
    const { building: initialBuilding, heroImageUrl: initialHeroImageUrl } =
      useLoaderData<typeof buildingLoader>();

    const [building, setBuilding] = useState(initialBuilding);
    const [heroImageUrl, setHeroImageUrl] = useState(initialHeroImageUrl);
    const [loading, setLoading] = useState(false); // no longer true on initial render

    // Rename fetchBuildingData → fetchUserSpecificData and remove the building/hero
    // fetches from it — that data now comes from the loader above.
    useEffect(() => {
      if (id) fetchUserSpecificData();
    }, [id, user]);

    return (
      <AppLayout title={building.name} showBack>
        <MetaHead
          title={building.name}
          description={buildingDescription(building)}
          image={heroImageUrl ?? undefined}
          canonicalUrl={`https://plano.app/building/${building.short_id}/${building.slug}`}
          structuredData={buildingStructuredData(building)}
        />
        {/* ... rest unchanged */}
      </AppLayout>
    );
  }
  ```

### 4.2 ArchitectDetails loader

- [ ] Audit `useArchitect` hook for any browser-only APIs. Fix any found before proceeding.

- [ ] Create `src/features/architect/pages/ArchitectDetails.loader.ts`:
  ```ts
  import type { LoaderFunctionArgs } from "react-router";
  import { createSupabaseServerClient } from "~/lib/supabase.server";

  export async function architectLoader({ request, params }: LoaderFunctionArgs) {
    const headers = new Headers();
    const supabase = createSupabaseServerClient(request, headers);

    const { data: architect } = await supabase
      .from("architects")
      .select("id, name, type, nationality, bio")
      .eq("id", params.id!)
      .maybeSingle();

    if (!architect) throw new Response("Not found", { status: 404 });

    // Fetched here to support the existing redirect-to-profile logic
    const { data: linkedUser } = await supabase
      .from("profiles")
      .select("username")
      .eq("verified_architect_id", architect.id)
      .maybeSingle();

    return Response.json({ architect, linkedUser }, { headers });
  }
  ```

- [ ] Update `src/features/architect/hooks/useArchitect.ts` to accept initial data from
  the loader. The hook should use the initial values as its starting state and skip the
  first fetch if they are already present:
  ```ts
  interface UseArchitectOptions {
    initialArchitect?: Architect | null;
    initialLinkedUser?: { username: string } | null;
  }

  export function useArchitect(id: string | undefined, options: UseArchitectOptions = {}) {
    const { initialArchitect = null, initialLinkedUser = null } = options;

    const [architect, setArchitect] = useState<Architect | null>(initialArchitect);
    const [linkedUser, setLinkedUser] = useState<{ username: string } | null>(initialLinkedUser);
    const [buildings, setBuildings] = useState<ArchitectBuilding[]>([]);
    // Only show loading state if we have no initial data to display
    const [loading, setLoading] = useState(!initialArchitect);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      if (!id) return;
      // If the loader already provided the architect, skip the redundant fetch
      // but still fetch buildings (not provided by loader)
      fetchArchitectData(id, { skipArchitect: !!initialArchitect });
    }, [id]);

    // ... rest of hook unchanged; fetchArchitectData checks skipArchitect flag
    // and omits the architect/linkedUser query if true
  }
  ```

- [ ] Update `ArchitectDetails.tsx` to export the loader and initialise with loader data:
  ```tsx
  export { architectLoader as loader } from "./ArchitectDetails.loader";

  export default function ArchitectDetails() {
    const { architect: loaderArchitect, linkedUser: loaderLinkedUser } =
      useLoaderData<typeof architectLoader>();

    const { architect, buildings, linkedUser, loading } = useArchitect(id, {
      initialArchitect: loaderArchitect,
      initialLinkedUser: loaderLinkedUser,
    });

    return (
      <AppLayout showBack>
        <MetaHead
          title={architect.name}
          description={`Explore buildings and works by ${architect.name} on Plano.`}
          canonicalUrl={`https://plano.app/architect/${architect.id}`}
          structuredData={architectStructuredData(architect)}
        />
        {/* ... unchanged */}
      </AppLayout>
    );
  }
  ```

### 4.3 Profile loader

- [ ] Create `src/features/profile/pages/Profile.loader.ts`:
  ```ts
  import type { LoaderFunctionArgs } from "react-router";
  import { createSupabaseServerClient } from "~/lib/supabase.server";

  export async function profileLoader({ request, params }: LoaderFunctionArgs) {
    const headers = new Headers();
    if (!params.username) {
      // /profile with no username requires auth — no SSR needed
      return Response.json({ profile: null }, { headers });
    }

    const supabase = createSupabaseServerClient(request, headers);
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio")
      .ilike("username", params.username)
      .maybeSingle();

    return Response.json({ profile }, { headers });
  }
  ```

- [ ] Update `Profile.tsx` to export the loader, initialise profile state from loader
  data, and pass all SEO props to `MetaHead` on first render:
  ```tsx
  export { profileLoader as loader } from "./Profile.loader";

  export default function Profile() {
    const { profile: loaderProfile } = useLoaderData<typeof profileLoader>();
    const [profile, setProfile] = useState(loaderProfile);

    // fetchProfileData still runs client-side to populate favorites, stats, etc.

    return (
      <AppLayout>
        <MetaHead
          title={`${profile?.username} (@${profile?.username})`}
          description={profile?.bio || `Check out ${profile?.username}'s reviews on Plano.`}
          image={avatarUrl}
          canonicalUrl={`https://plano.app/profile/${profile?.username}`}
        />
        {/* ... unchanged */}
      </AppLayout>
    );
  }
  ```

### 4.4 Phase 4 checkpoint

- [ ] `curl -A "Googlebot" https://[staging-url]/building/1/some-slug` returns HTML
  with the building name in `<title>` and `<meta name="description">`. No empty `<div id="root">`.
- [ ] Same test passes for `/architect/<id>` and `/profile/<username>`.

---

## Phase 5 — Structured data & meta exports (Week 6)

### 5.1 Add structured data helpers

- [ ] Create `src/features/buildings/utils/structuredData.ts` with helpers for all
  three SSR page types:
  ```ts
  const SITE_URL = "https://plano.app";

  export function buildingStructuredData(building: BuildingDetails) {
    return {
      "@context": "https://schema.org",
      "@type": "LandmarkOrBuilding",
      "name": building.name,
      ...(building.alt_name && { "alternateName": building.alt_name }),
      "url": `${SITE_URL}/building/${building.short_id}/${building.slug}`,
      ...(building.address && {
        "address": {
          "@type": "PostalAddress",
          "streetAddress": building.address,
          "addressLocality": building.city ?? undefined,
          "addressCountry": building.country ?? undefined,
        },
      }),
      ...(building.year_completed && { "dateCreated": String(building.year_completed) }),
      ...(building.architects?.length > 0 && {
        "architect": building.architects.map(a => ({
          "@type": "Person",
          "name": a.name,
          "url": `${SITE_URL}/architect/${a.id}`,
        })),
      }),
      ...(building.styles?.length > 0 && {
        "additionalType": building.styles.map(s => s.name),
      }),
    };
  }

  export function buildingDescription(building: BuildingDetails): string {
    const parts: string[] = [];
    if (building.city && building.country)
      parts.push(`Located in ${building.city}, ${building.country}.`);
    if (building.year_completed)
      parts.push(`Completed in ${building.year_completed}.`);
    if (building.architects?.length > 0)
      parts.push(`Designed by ${building.architects.map(a => a.name).join(", ")}.`);
    if (parts.length === 0)
      return `Discover ${building.name} on Plano — the world's architecture, cataloged.`;
    return `${building.name}. ${parts.join(" ")} Discover this building on Plano.`;
  }

  export function architectStructuredData(architect: { id: string; name: string }) {
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": architect.name,
      "url": `${SITE_URL}/architect/${architect.id}`,
      "jobTitle": "Architect",
    };
  }
  ```

### 5.2 Migrate from `react-helmet-async` to RR7 `meta` exports

`react-helmet-async` modifies `<head>` after React mounts on the client. RR7's native
`meta` export runs on the server and inlines meta tags in the initial HTML — this is the
highest-impact SEO change in the entire migration.

- [ ] Replace `<MetaHead>` in `BuildingDetails.tsx` with a `meta` export:
  ```tsx
  import type { MetaFunction } from "react-router";

  export const meta: MetaFunction<typeof buildingLoader> = ({ data }) => {
    if (!data?.building) return [{ title: "Plano" }];
    const { building, heroImageUrl } = data;
    const description = buildingDescription(building);
    const image = heroImageUrl ?? "https://plano.app/cover.jpg";
    const canonical = `https://plano.app/building/${building.short_id}/${building.slug}`;
    return [
      { title: `${building.name} | Plano` },
      { name: "description", content: description },
      { property: "og:title", content: `${building.name} | Plano` },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${building.name} | Plano` },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { tagName: "link", rel: "canonical", href: canonical },
      { "script:ld+json": buildingStructuredData(building) },
    ];
  };
  ```

- [ ] Apply the same `meta` export pattern to `ArchitectDetails.tsx`.
- [ ] Apply the same `meta` export pattern to `Profile.tsx`.
- [ ] Remove `react-helmet-async` and `<HelmetProvider>` from `app/root.tsx` and
  uninstall the package:
  ```bash
  npm uninstall react-helmet-async
  ```

### 5.3 Update `og-tags` edge function documentation

- [ ] Update `docs/LAUNCH_HOSTING.md`: Googlebot now receives full HTML from the SSR
  app directly. Remove the "do not send Googlebot here" caveat from the `og-tags`
  section. The function remains useful for social preview bots (Slack, Discord, etc.)
  but is no longer required for SEO.

---

## Phase 6 — Deployment & CI (Week 7)

### 6.1 Add Vercel config

- [ ] Create `vercel.json` at the project root:
  ```json
  {
    "framework": "react-router",
    "regions": ["lhr1"]
  }
  ```

### 6.2 Update CI

- [ ] Update `.github/workflows/ci.yml` to read Supabase credentials from GitHub secrets
  rather than hardcoded placeholder values:
  ```yaml
  - name: Production build (SSR)
    run: npm run build
    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      VITE_SENTRY_DSN: ""
  ```
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to GitHub repository
  secrets. Vercel deploys automatically via its GitHub integration — no explicit deploy
  step is needed in CI.

### 6.3 Production smoke tests

- [ ] `curl https://plano.app/building/1/some-slug` returns HTML with `<title>` matching the building name.
- [ ] `curl https://plano.app/architect/<id>` returns HTML with `<title>` matching the architect name.
- [ ] `curl https://plano.app/profile/<username>` returns HTML with `<title>` matching the username.
- [ ] Google Search Console — submit updated sitemap and use URL Inspection to confirm all three page types are indexable.
- [ ] Auth: sign in, sign out, protected-page redirect, and admin guard all work correctly.
- [ ] Cookie auth: session persists across a hard page refresh.
- [ ] PWA: service worker registers successfully; install prompt appears.
- [ ] Sentry: errors are captured with the correct environment tag.
- [ ] Google Analytics: pageview events fire on client-side navigation.

---

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `fetchBuildingDetails` uses browser-only APIs internally | Medium | Server loader crashes | Audit task in 4.1 catches this before the loader is written |
| `useArchitect` hook has browser-only dependencies | Medium | Loader cannot reuse hook logic | Audit task in 4.2; extract initial query into a shared fetcher |
| VitePWA service worker intercepts SSR dev responses | Medium | Dev server broken | Resolved in Phase 1 via `devOptions: { enabled: false }` |
| Cookie `SameSite` attribute blocks auth on staging subdomain | Low | Auth fails in staging | Set `SameSite=Lax; Secure` explicitly in `@supabase/ssr` cookie options |
| Playwright tests import from `react-router-dom` | Low | CI fails after Phase 1 rename | Covered in task 1.2 — rename test files alongside source files |
| `maplibre-gl` / `react-map-gl` crash server renderer | Low | Explore page errors | These routes are excluded from SSR scope; do not add loaders to them |

---

## Summary timeline

| Week | Phase | Deliverable |
|---|---|---|
| 1 | Prepare | Packages installed, imports renamed, browser-only code fixed, `.env.example` created |
| 2 | Framework bootstrap | App runs in RR7 SSR mode; all existing routes work; no loaders yet |
| 3 | Auth & Supabase SSR | Cookie-based auth in place; root loader provides initial session; all auth flows verified |
| 4–5 | SSR loaders | Buildings, architects, and profiles return full HTML to Googlebot on first request |
| 6 | Structured data & meta | `schema.org` JSON-LD, canonical URLs, and RR7 `meta` exports on all three SSR pages |
| 7 | Deployment & CI | Production live on Vercel; Google Search Console updated; all smoke tests passing |