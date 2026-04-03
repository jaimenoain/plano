# Phase 1 — SSR hardening

**Depends on:** Phase 0 complete and QA passing (all three routes returning HTTP 200,
322 unit tests passing, no console errors on `/search` after hydration).

**Goal:** Close the remaining SSR crash vectors that Phase 0 did not touch, add
the missing resilience exports (`HydrateFallback`, root `ErrorBoundary`) that the
RR7 migration left incomplete, and establish a documented, defensible strategy
for the widespread `react-map-gl` import graph.

**Context from Phase 0 QA:**
- `/search`, `/explore`, and `/` all return HTTP 200.
- `OmniSearchBar` is confirmed unused (file-only) — no action needed this phase.
- The note that `/` and `/explore` often do not include the search `<input>` in
  raw SSR HTML is **expected behaviour**: `/explore` redirects unauthenticated
  users; `/` renders `LandingHero` only inside an auth-conditional branch that
  the server cannot resolve. This is not a bug to fix here.

---

## Tasks

---

### [ ] P1-1 — Guard `@ffmpeg/ffmpeg` against SSR import

**What this is:** `src/utils/video-compression.ts` starts with a top-level
`import { FFmpeg } from '@ffmpeg/ffmpeg'`. That module is imported by
`WriteReview.tsx`, which means the ffmpeg package enters the SSR bundle for
every `/building/:id/:slug/review` and `/building/:id/review` request. If
`@ffmpeg/ffmpeg` reads browser or Worker APIs at module initialisation time, it
will crash the server render. Even if it does not crash today, it inflates the
server bundle unnecessarily and is a maintenance hazard.

**Concrete actions:**

- Open `src/utils/video-compression.ts`. Remove the top-level `import { FFmpeg }
  from '@ffmpeg/ffmpeg'` and the top-level `import { fetchFile, toBlobURL } from
  '@ffmpeg/util'`.
- Inside the private `VideoCompressionService.load()` static method, replace the
  references with dynamic imports: `const { FFmpeg } = await
  import('@ffmpeg/ffmpeg')` and `const { fetchFile, toBlobURL } = await
  import('@ffmpeg/util')`. Both are already inside an `async` method, so no
  structural changes are needed — this is a drop-in replacement.
- Update the local `ffmpeg` variable type inside `load()` to use the dynamically
  imported type: `let ffmpeg: InstanceType<typeof FFmpeg>`. Adjust any TypeScript
  errors that surface from losing the top-level import.
- Do **not** touch `WriteReview.tsx` — the fix is fully contained in
  `video-compression.ts`.
- Run `npm run typecheck` and `npm run build` to confirm the dynamic import types
  resolve correctly. The `@ffmpeg/ffmpeg` package uses ESM; confirm Vite handles
  the dynamic import without adding it to `ssr.noExternal`.

**How to verify:**

- `npm run build` completes without error.
- `npm run typecheck` passes.
- Navigate to `/building/:id/:slug/review` in the running dev server; confirm the
  page loads and that uploading a video triggers compression (the codec loads
  lazily on first use, not on page render).
- Confirm `@ffmpeg/ffmpeg` does **not** appear in the server bundle analysis
  (run `npx vite-bundle-visualizer` or inspect the Vercel function output if
  available).

**Dependencies:** None — independent of all other Phase 1 tasks.

---

### [ ] P1-2 — Add `HydrateFallback` to the three server-loader routes

**What this is:** `Profile.tsx`, `BuildingDetails.tsx`, and `ArchitectDetails.tsx`
each export a `loader` but no `HydrateFallback`. In RR7, the `HydrateFallback` is
shown during the initial hydration window while the route's JS chunk loads on the
client (RR7 code-splits each route automatically). Without it, a client navigating
directly to one of these URLs may see a flash of blank content between the server
HTML arriving and the React tree hydrating. `root.tsx` already exports
`HydrateFallback` (using `<RouteLoadingFallback />`); this task extends that
pattern to the three child routes.

**Concrete actions:**

- **`BuildingDetails.tsx`:** The component already imports `<Skeleton>` (line 38)
  and uses `<AppLayout title="Loading...">` as a runtime loading guard. Export a
  `HydrateFallback` that matches the visual weight of the page: an `<AppLayout>`
  containing a hero image skeleton, a title skeleton (~40% width), and two
  paragraph skeletons. Reuse the existing `<Skeleton>` component. The fallback
  should be ~15–20 lines.
- **`Profile.tsx`:** Export a `HydrateFallback` showing an `<AppLayout>` with an
  avatar skeleton (circular, ~80px), a name skeleton, and a stats row skeleton.
  Match the approximate layout of the profile header — users should not see a
  content jump when hydration completes. ~15–20 lines.
- **`ArchitectDetails.tsx`:** Export a `HydrateFallback` showing an `<AppLayout>`
  with a name skeleton and a card grid skeleton (two `<Skeleton>` blocks at the
  height of a building card). ~10–15 lines.
- Place each `HydrateFallback` export **directly above** the existing
  `ErrorBoundary` export in each file, so all three special exports are grouped
  together at the top of the exports section.
- Do **not** import new dependencies — all three files already have access to
  `<Skeleton>` and `<AppLayout>`.

**How to verify:**

- `npm run typecheck` passes.
- In Chrome DevTools, throttle the network to "Slow 3G" and navigate to
  `/building/:id`, `/profile/:username`, and `/architect/:id` via hard refresh.
  Confirm the skeleton layout appears during the loading window rather than a
  blank area or content flash.
- On fast connections, the `HydrateFallback` is invisible (instant hydration) — do
  not remove it if it seems "not to appear" on localhost.

**Dependencies:** None — independent of other Phase 1 tasks, but should be done
after Phase 0 is confirmed stable.

---

### [ ] P1-3 — Add `ErrorBoundary` export to `root.tsx`

**What this is:** `root.tsx` wraps the entire tree in `<AppErrorBoundary>` (a
`react-error-boundary` class wrapper), which catches React render errors. However,
it does **not** export an RR7 `ErrorBoundary` function, which is the mechanism
that catches errors thrown by **loaders** — including the root loader itself. If
`createSupabaseServerClient` throws (e.g. missing env var, Supabase unreachable),
or if any child route's loader throws an unhandled error that bubbles to root,
users currently receive a blank page. This task adds the RR7-native boundary.

**Concrete actions:**

- At the bottom of `src/root.tsx`, add an export:
  ```ts
  export function ErrorBoundary() { ... }
  ```
  Import `useRouteError` and `isRouteErrorResponse` from `react-router` (they
  are likely already imported or can be added to the existing import block).
- The `ErrorBoundary` body should:
  - Call `const error = useRouteError()`.
  - If `isRouteErrorResponse(error)` and status is 404 — render a "page not
    found" message (this case is unlikely at root level but handle it for
    completeness).
  - For all other errors — render the same full-screen error UI already used by
    `AppErrorFallback` in `AppErrorBoundary.tsx`: the `AlertTriangle` icon, "Something
    went wrong", and a "Refresh page" button (`window.location.reload()`). Do
    **not** include a "Try again" button that calls `resetErrorBoundary` — RR7's
    `ErrorBoundary` does not receive that prop; use `useRevalidator` instead if a
    retry action is needed.
  - Do **not** remove `<AppErrorBoundary>` from the `Root` component body. The
    two mechanisms are complementary: `AppErrorBoundary` catches synchronous
    React render panics; the exported `ErrorBoundary` catches loader errors. Both
    should remain.
- The `ErrorBoundary` component must **not** use any hook that requires the full
  provider tree (no `useAuth`, no `useToast`, no `QueryClient`) — it renders
  **outside** the `Root` component tree when a root-level error occurs, so those
  providers are unavailable.

**How to verify:**

- `npm run typecheck` passes.
- Temporarily throw an error from the root `loader` in a local branch
  (`throw new Error("test")`) — confirm that navigating to any page shows the
  error UI rather than a blank page, then revert the test throw.
- Confirm `AppErrorBoundary` is still present inside `Root` (the two should
  coexist).

**Dependencies:** None — independent, but easiest to do alongside P1-2 since both
are edits to the same area of the route files.

---

### [ ] P1-4 — Audit map components in SSR-rendered routes and document the `noExternal` strategy

**What this is:** There are **15+ files** across the codebase that import from
`react-map-gl/maplibre`. Converting them all to dynamic/lazy imports is not in
scope for Phase 1. Instead, this task establishes a clear rule: every component
that imports `react-map-gl` must have an SSR guard, and the `ssr.noExternal:
["react-map-gl"]` setting in `vite.config.ts` must be documented so it is not
accidentally removed.

Phase 0 already handled:
- `PlanoMap` → wrapped in `<ClientOnly>` at the `SearchPage` call site (P0-4).
- `BuildingLocationMap` → has its own `isClient` guard (`useState(false)` +
  `useEffect`).

This task audits the remaining importers for SSR exposure and applies guards where
needed.

**Concrete actions:**

- Run a grep for all files importing `react-map-gl` under `src/` (exclude `.js`
  compiled duplicates and test files). The expected list includes:
  `PlanoMap.tsx`, `BuildingLocationMap.tsx`, `CollectionMapGL.tsx`,
  `BuildingLocationPicker.tsx`, `BuildingMap.tsx`, `PhotoHeatmapZone.tsx`,
  `NoPhotosMapZone.tsx`, `ItineraryRoutes.tsx`, `AddBuilding.tsx`,
  `MapMarkers.tsx`.
- For each file, check whether it is used in a route that could be SSR-rendered
  (i.e. a non-admin, non-auth-gated route, or any route with a `loader`). Apply
  the following triage:
  - **Admin-only routes** (`/admin/*`): lower priority — these routes are behind
    auth and are not in the SEO-critical path. Note them but do not add guards
    this phase.
  - **`CollectionMapGL.tsx`** (used by `CollectionMapPage` at `/:username/map/:slug`):
    check whether it has an `isClient` guard. If not, add the same `useState(false)`
    + `useEffect` pattern already used in `BuildingLocationMap`. This route has no
    loader but is SSR-rendered.
  - **`BuildingLocationPicker.tsx`** (used by `AddBuilding` and `EditBuilding`):
    both routes require auth (redirect to `/login` if unauthenticated). Confirm
    auth redirect happens before the map component renders server-side; if not,
    add an `isClient` guard.
  - **`ItineraryRoutes.tsx`** and **`MapMarkers.tsx`**: these are sub-components of
    `PlanoMap` and are therefore already covered by the `<ClientOnly>` guard on
    `<PlanoMap>` in `SearchPage`. No additional guard needed.
  - **`AddBuilding.tsx`** imports `react-map-gl` at the top level. Check whether
    the `/add-building` route ever renders server-side without auth. If so, add
    an `isClient` guard to the map render section.
- Add a comment block to `vite.config.ts` above the `ssr.noExternal` line
  explaining **why** it exists and what would break if removed:
  ```ts
  // react-map-gl uses the `react-map-gl/maplibre` subpath export, which Node's
  // ESM resolver cannot resolve (ERR_UNSUPPORTED_DIR_IMPORT). Bundling the
  // package via noExternal fixes this. The package itself is safe to import in
  // Node as long as no map component renders server-side (each must have its own
  // isClient guard or be wrapped in <ClientOnly>). Do not remove without first
  // converting all map imports to dynamic imports.
  ```
- Update `docs/rr7-migration-roadmap.md` (or `docs/Roadmap.md`) with a short
  note recording the decision: "`react-map-gl` stays in `noExternal` for Node ESM
  resolution; all components using it must have an SSR guard."

**How to verify:**

- `npm run build` and `npm run typecheck` pass.
- Navigate to `/:username/map/:slug` (a collection map page) — confirm HTTP 200
  and no map-related server crash.
- Navigate to `/add-building` while logged in — confirm the map renders and no
  console errors appear.
- The `vite.config.ts` comment is present and accurately describes the tradeoff.

**Dependencies:** P0-1 (uses `ClientOnly` if new guards are needed). Can be done
in parallel with P1-2 and P1-3.

---

### [ ] P1-5 — Extend the server environment shim

**What this is:** `src/entry-server-localstorage-shim.ts` currently polyfills only
`localStorage`. This was enough to unblock Phase 0, but any dependency that reads
other browser globals (`sessionStorage`, `window.matchMedia`, `navigator`,
`IntersectionObserver`, `ResizeObserver`) at **module scope** or during server-side
rendering would produce a `ReferenceError` or `TypeError` that is not caught by
the existing shim. This task runs a targeted audit and adds any missing polyfills.

**Concrete actions:**

- Search the codebase for the following patterns **outside of `useEffect` /
  event handlers / conditional blocks** (i.e. at module scope or at the top of
  a component's function body before any hook):
  - `sessionStorage.`
  - `window.matchMedia(`
  - `navigator.`
  - `new IntersectionObserver(`
  - `new ResizeObserver(`
  - `new BroadcastChannel(`
  Focus on files in the SSR render path: `root.tsx`, components imported by
  `root.tsx`, and any file imported by the three loader routes without a
  `ClientOnly` / `isClient` guard.
- For each finding, determine whether it is in a `useEffect` (safe — effects
  don't run during SSR) or genuinely at render/module scope (unsafe).
- For each **unsafe** finding, choose the least-invasive fix:
  - If the call is in a third-party dependency and cannot be moved, add a shim to
    `entry-server-localstorage-shim.ts`.
  - If the call is in first-party code, move it inside a `useEffect` or wrap with
    `if (typeof window !== 'undefined')`. Prefer fixing the source over adding a
    shim.
- Common shims to add if needed (add only what the audit finds is actually
  missing — do not pre-emptively add every possible polyfill):
  ```ts
  // sessionStorage — same no-op pattern as localStorage
  // window.matchMedia — return a MediaQueryList-like object with matches: false
  // navigator — return { userAgent: '', language: 'en', onLine: true }
  // IntersectionObserver — no-op constructor (for libs that check existence)
  // ResizeObserver — no-op constructor
  ```
- Document each shim with a one-line comment identifying which dependency or
  component triggered the need for it.

**How to verify:**

- `npm run build` and `npm run typecheck` pass.
- `npm run test` — 322 or more tests pass (no regressions).
- If any shims were added: restart `react-router dev`, load the three previously
  working routes (`/search`, `/explore`, `/building/:id`), and confirm no new
  errors in the server console.
- If no new shims were needed: document this in the QA report as "shim audit
  complete — no additional globals found at server scope."

**Dependencies:** None — independent investigation and fix task.

---

### [ ] P1-6 — Phase 1 QA report

**What this is:** A structured verification pass after all P1-1 through P1-5 are
merged. Produces the report to paste into the planning chat before Phase 2
(migration cleanup) begins.

**Concrete actions:**

- **Build gate:** `npm run build` — exits 0. Paste the final line.
- **Type gate:** `npm run typecheck` — exits 0. List any new type errors introduced
  this phase.
- **Test gate:** `npm run test` — passes (≥ 322). List any new failures.
- **Lint gate:** `npm run lint` — exits 0. Note any new warnings.
- **`@ffmpeg` verification (P1-1):** Navigate to `/building/:id/review` in dev.
  Attach a short video file. Confirm compression runs without errors. Confirm
  `@ffmpeg/ffmpeg` is NOT listed in the Vercel server function's module graph (or
  note if bundle analysis was not run).
- **HydrateFallback verification (P1-2):** In Chrome DevTools Network tab, set
  throttling to "Slow 3G". Hard-navigate to `/building/:id`, `/profile/:username`,
  and `/architect/:id`. Describe what shows during the loading window — skeleton,
  blank, or previous route. Confirm "skeleton" for all three.
- **Root ErrorBoundary verification (P1-3):** Temporarily add `throw new
  Error("P1-3 test")` to the root `loader`. Navigate to any route — confirm the
  error UI appears (not blank). Revert the test throw before merging.
- **Map audit results (P1-4):** List each component audited, its verdict (already
  guarded / guard added / admin-only deferred), and the `vite.config.ts` comment
  status.
- **Shim audit results (P1-5):** State whether any new shims were added. If yes,
  list each shim and the dependency that triggered it.
- **Regression check:** Navigate to `/search` (map + search input), `/building/:id`
  (map + loader), `/profile/:username` (loader), and the logged-in home feed.
  Confirm no new errors.

**Report format to paste into the planning chat:**

```
## Phase 1 QA report

**Build:** [PASS / FAIL — paste last build line]
**Typecheck:** [PASS / FAIL — list any new errors]
**Unit tests:** [PASS / n failures — list new failures if any]
**Lint:** [PASS / FAIL]

**@ffmpeg guard (P1-1):**
- WriteReview page loads without crash: [Yes ✓ / No ✗]
- Video compression triggered successfully: [Yes ✓ / Not tested]
- @ffmpeg absent from server bundle: [Confirmed ✓ / Not verified]

**HydrateFallback (P1-2):**
- /building/:id on Slow 3G: [Skeleton ✓ / Blank ✗ / Flash ✗]
- /profile/:username on Slow 3G: [Skeleton ✓ / Blank ✗ / Flash ✗]
- /architect/:id on Slow 3G: [Skeleton ✓ / Blank ✗ / Flash ✗]

**Root ErrorBoundary (P1-3):**
- Test throw shows error UI (not blank): [Yes ✓ / No ✗]
- AppErrorBoundary still present: [Yes ✓ / No ✗]

**Map component audit (P1-4):**
- CollectionMapGL: [Already guarded / Guard added / N/A]
- BuildingLocationPicker: [Already guarded / Guard added / N/A]
- AddBuilding: [Already guarded / Guard added / N/A]
- vite.config.ts comment added: [Yes ✓ / No ✗]
- noExternal decision documented: [Yes ✓ / No ✗]

**Shim audit (P1-5):**
- New shims added: [None / List: ...]
- First-party fixes applied: [None / List: ...]

**Regressions on /search, /building/:id, /profile/:username, feed:** [None ✓ / list]

**Anything unexpected that needs discussion before Phase 2 (migration cleanup):**
[Free text — leave blank if none]
```

**Dependencies:** P1-1 through P1-5 all merged.