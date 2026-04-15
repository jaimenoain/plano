## Phase 11 — QA & Regression

> **How to use this phase:** Work through each task top-to-bottom in a single Cursor session after all T1–T18 tasks are marked complete. Each task is a forensic check with explicit pass/fail criteria. Where a check fails, fix the issue in place before continuing — do not defer. Mark `[x]` only when every bullet under that task passes cleanly.

---

### [x] QA1 — Database integrity: verify `city_slug` population and constraints

- Run `SELECT count(*) FROM localities WHERE city_slug IS NULL OR city_slug = '';` — must return **0**.
- Run `SELECT city, country_code, city_slug FROM localities ORDER BY city_slug LIMIT 50;` — spot-check that slugs are lowercase, hyphenated, and free of country-code suffixes (e.g. `paris`, not `paris-fr`).
- Confirm the unique constraint: attempt `INSERT INTO localities (city, country_code, city_slug, slug, country, buildings_count) VALUES ('Paris', 'FR', 'paris', 'paris-fr-dup', 'France', 0);` — must raise a unique-violation error.
- Run `SELECT city, country_code, city_slug FROM localities WHERE city_slug ~ '[^a-z0-9\-]';` — must return **0 rows** (no uppercase, spaces, or special characters).
- Run `SELECT city_slug, country_code, count(*) FROM localities GROUP BY city_slug, country_code HAVING count(*) > 1;` — must return **0 rows** (no duplicates within a country).
- Confirm `region` and `region_slug` columns exist and are nullable: `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'localities' AND column_name IN ('region', 'region_slug');` — both rows should show `YES`.
- **Pass criteria:** All six queries return the expected result with zero anomalies.

---

### [x] QA2 — URL utility unit tests: verify all helper output shapes

- Open `src/utils/url.ts` and confirm the `if (import.meta.vitest)` test block covers all four exported helpers: `getCountryUrl`, `getLocalityUrl`, `getBuildingLocalityUrl`, `getBuildingUrl`.
- Run `bun run test src/utils/url.ts` — all tests must pass.
- Manually verify edge cases not covered by the test block:
  - `getBuildingLocalityUrl('FR', 'paris', '12345', null)` — must produce `/architecture/fr/paris/12345` with no trailing slash.
  - `getBuildingLocalityUrl('FR', 'paris', '12345', 'tour-eiffel')` — must produce `/architecture/fr/paris/12345/tour-eiffel`.
  - `getBuildingUrl('12345', null)` — must still produce `/building/12345` (fallback unchanged).
  - `getEventUrl({ slug: 'open-house', countryCode: null, citySlug: null })` — must produce `/events/open-house`.
  - `getEventUrl({ slug: 'open-house', countryCode: 'GB', citySlug: 'london' })` — must produce `/events/gb/london/open-house`.
- Confirm `ARCHITECTURE_PREFIX` is used inside every helper — run `grep -n 'ARCHITECTURE_PREFIX' src/utils/url.ts` and confirm it appears in the bodies of `getCountryUrl`, `getLocalityUrl`, and `getBuildingLocalityUrl`.
- **Pass criteria:** All tests green; all manual edge cases produce the expected string; `ARCHITECTURE_PREFIX` is not hardcoded separately in any helper.

---

### [x] QA3 — HTTP status codes: redirect chain audit

Run each `curl -sI` command against the local dev server (or a preview deployment) and confirm the **exact** status code and `Location` header shown. A `302` where a `301` is expected is a failure — fix the `redirect()` call to pass the status explicitly.

**Legacy locality redirects:**
- `curl -sI http://localhost:5173/locality/paris-fr` → `301` + `Location: /architecture/fr/paris`
- `curl -sI http://localhost:5173/locality/london-gb` → `301` + `Location: /architecture/gb/london`
- `curl -sI http://localhost:5173/locality/nonexistent-xx` → `404`

**Legacy building redirects:**
- `curl -sI http://localhost:5173/building/1/some-slug` → `301` + `Location: /architecture/<cc>/<city>/1/some-slug`
- `curl -sI http://localhost:5173/building/1` → `301` + `Location: /architecture/<cc>/<city>/1/some-slug` (slug appended)
- `curl -sI http://localhost:5173/building/999999999` → `404`

**Building locality-mismatch redirects:**
- Pick a real building with a known locality (e.g. short_id `1`, city `paris`, country `fr`). Request `/architecture/gb/london/1/its-slug` → `301` + `Location: /architecture/fr/paris/1/its-slug`.

**Slug-correction redirect (existing behaviour, must still work):**
- `curl -sI http://localhost:5173/architecture/fr/paris/1/wrong-slug` → `301` + `Location: /architecture/fr/paris/1/correct-slug`
- `curl -sI http://localhost:5173/architecture/fr/paris/1` (no slug) → `301` + `Location: /architecture/fr/paris/1/correct-slug`

**New canonical pages (must return 200):**
- `curl -sI http://localhost:5173/architecture/fr` → `200`
- `curl -sI http://localhost:5173/architecture/fr/paris` → `200`
- `curl -sI http://localhost:5173/architecture/fr/paris/1/tour-eiffel` → `200`
- `curl -sI http://localhost:5173/architecture/zz` → `404` (unknown country code)

**Event routing:**
- `curl -sI http://localhost:5173/events/some-physical-event-slug` (event has `country_code`/`city_slug` set) → `301` + `Location: /events/<cc>/<city>/some-physical-event-slug`
- `curl -sI http://localhost:5173/events/some-virtual-event-slug` (event has null location) → `200`

**Pass criteria:** Every status code and Location header matches exactly. Zero `302`s. Zero chains longer than one hop (a request to `/building/1/slug` must resolve in a single redirect, not `/building/1/slug` → `/building/1/correct-slug` → `/architecture/fr/paris/1/correct-slug`).

---

### [x] QA4 — Canonical tag audit across all page types

For each page type, load the page in the dev server, view source (`⌘U`), and locate `<link rel="canonical" href="...">`. Confirm the href matches the expected canonical URL exactly (no trailing slash discrepancies, no `http` vs `https` mismatch in production).

| Page | Expected canonical |
|---|---|
| Country | `https://plano.app/architecture/fr` |
| City | `https://plano.app/architecture/fr/paris` |
| Building (with locality) | `https://plano.app/architecture/fr/paris/1/tour-eiffel` |
| Building (no locality) | `https://plano.app/building/1/tour-eiffel` *(fallback)* |
| Physical event | `https://plano.app/events/gb/london/open-house-2025` |
| Virtual event | `https://plano.app/events/virtual-conference` |
| Person | `https://plano.app/person/le-corbusier` *(unchanged)* |
| Company | `https://plano.app/company/oma` *(unchanged)* |

- Confirm that no `noindex` pages (settings, auth, admin, edit flows) accidentally emit a canonical pointing to a public URL — check one `/architecture/*/edit` path if it exists.
- **Pass criteria:** Every canonical href matches the table; no page emits two `<link rel="canonical">` tags; private/edit pages have no canonical or emit `noindex`.

---

### [x] QA5 — JSON-LD structured data audit

For each of the three new page tiers, copy the JSON-LD from page source and paste into the [Google Rich Results Test](https://search.google.com/test/rich-results) (or validate locally with `@google/structured-data-testing-tool`).

**Country page (`/architecture/fr`):**
- Contains a `BreadcrumbList` with exactly 2 items: `Home` → `Architecture in France` (or similar).
- Contains an `ItemList` with one entry per locality.
- All `item.id` URLs in the breadcrumb use the absolute `https://plano.app/architecture/...` form — no relative paths.

**City page (`/architecture/fr/paris`):**
- Contains a `BreadcrumbList` with exactly 3 items: `Home` → `France` → `Paris`.
- `item[1].id` = `https://plano.app/architecture/fr`
- `item[2].id` = `https://plano.app/architecture/fr/paris`

**Building page (`/architecture/fr/paris/1/tour-eiffel`):**
- Contains a `BreadcrumbList` with exactly 4 items: `Home` → `France` → `Paris` → building name.
- Contains an `ArchitecturalStructure` (or `LandmarkOrHistoricalBuilding`) block — confirm it still exists and was not accidentally removed during the loader rewrite.
- All breadcrumb `item.id` URLs resolve to `200` (run a quick `curl` spot-check on each).

**Fallback building page (no locality):**
- BreadcrumbList must fall back gracefully — confirm it emits 2 items (`Home` → building name) rather than crashing or emitting `null` values in the breadcrumb array.

- **Pass criteria:** Zero structured-data errors in the Rich Results Test for all three page types; no `null`, `undefined`, or relative-path values in any JSON-LD `id` field.

---

### [x] QA6 — Sitemap completeness and format

- Fetch each sitemap endpoint and validate:
  ```
  curl https://<project>.supabase.co/functions/v1/sitemap?type=localities
  curl https://<project>.supabase.co/functions/v1/sitemap?type=countries
  curl https://<project>.supabase.co/functions/v1/sitemap?type=buildings
  curl https://<project>.supabase.co/functions/v1/sitemap?type=events
  ```
- Paste each XML response into an [XML sitemap validator](https://www.xml-sitemaps.com/validate-xml-sitemap.html) — must report zero errors.
- Confirm **no** `/locality/` URLs appear anywhere in any sitemap: `curl ... | grep '/locality/'` must return nothing.
- Confirm **no** `/building/` URLs appear anywhere in the buildings sitemap for rows that have locality data: `curl ... | grep '/building/'` should return only buildings whose `locality_id IS NULL`.
- Confirm the localities sitemap emits `/architecture/<cc>/<city>` format: `curl ... | grep '<loc>' | head -5` — visually verify the format.
- Confirm the countries sitemap exists and contains at least one `<url>` entry.
- Confirm `/sitemap-countries.xml` is accessible via Vercel rewrite: `curl -sI https://<preview-url>/sitemap-countries.xml` → `200`.
- Confirm `robots.txt` `Sitemap:` directive still points to `https://plano.app/sitemap.xml` and has not been accidentally changed.
- **Pass criteria:** All four sitemaps return valid XML with zero validator errors; no legacy URL formats present; country sitemap accessible via Vercel rewrite.

---

### [x] QA7 — OG tags edge function: path-parsing correctness

Test each path shape against the deployed `og-tags` edge function using `curl`. Confirm `og:title`, `og:description`, and `og:image` are all populated and not `undefined` or empty.

```bash
# Country
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Farchitecture%2Ffr"

# City
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Farchitecture%2Ffr%2Fparis"

# Building (with locality)
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Farchitecture%2Ffr%2Fparis%2F1%2Ftour-eiffel"

# Building (slug-less — id only)
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Farchitecture%2Ffr%2Fparis%2F1"

# Physical event
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Fevents%2Fgb%2Flondon%2Fopen-house-2025"

# Old building path (should still work during transition period)
curl "https://<project>.supabase.co/functions/v1/og-tags?path=%2Fbuilding%2F1%2Ftour-eiffel"
```

- Confirm the old `/building/:id/:slug` path still returns valid OG data (not broken during the path-parsing update).
- Confirm the old `/locality/:slug` path still returns valid OG data or gracefully falls back — it will still be hit by crawlers that cached the old URL before the sitemap update propagates.
- Confirm `og:image` is an absolute URL (starts with `https://`) for all page types — not a relative path or `null`.
- **Pass criteria:** All six new paths return HTTP 200 with fully-populated `og:title`, `og:description`, and `og:image`; old `/building/` and `/locality/` paths do not error.

---

### [x] QA8 — Internal link hygiene: no hardcoded legacy URLs in source

Run each of the following `grep` commands from the repo root. Each must return **zero hits** outside of the explicitly permitted files (redirect loaders and the URL utility itself).

```bash
# Must return zero results outside of LocalityRedirect.tsx and url.ts
grep -rn '"/locality/' src/ --include="*.ts" --include="*.tsx" \
  | grep -v LocalityRedirect | grep -v url.ts

# Must return zero results outside of BuildingRedirect.tsx and url.ts
grep -rn '"/building/' src/ --include="*.ts" --include="*.tsx" \
  | grep -v BuildingRedirect | grep -v url.ts

# Catch template-literal forms too
grep -rn '`/locality/' src/ --include="*.ts" --include="*.tsx"
grep -rn '`/building/' src/ --include="*.ts" --include="*.tsx" \
  | grep -v BuildingRedirect | grep -v url.ts

# Confirm no old-style event links remain (except virtual-event fallback via getEventUrl)
grep -rn 'to="/events/' src/ --include="*.tsx" | grep -v getEventUrl
grep -rn 'href="/events/' src/ --include="*.tsx" | grep -v getEventUrl
```

- Open the `AppLayout` navigation component and confirm locality/explore links use `getLocalityUrl` or `getCountryUrl`, not string literals.
- Open the `DiscoveryBuildingCard` component and confirm the `<Link to={...}>` uses `getBuildingLocalityUrl` or `getBuildingUrl` — not a hardcoded path.
- **Pass criteria:** All `grep` commands return zero unexpected hits; navigation and card components use the URL utility helpers.

---

### [x] QA9 — `TODO` locality enrichment audit

- Run `grep -rn 'TODO: enrich DTO with locality' src/` — collect every call site flagged during T11.
- For each hit, open the file and check whether the DTO it uses could reasonably be enriched without a separate query (i.e. the parent query already joins the locality table). If so, fix it now — add `locality_country_code` and `locality_city_slug` to the SELECT and switch the call to `getBuildingLocalityUrl`.
- Document any remaining `TODO` items that genuinely require a new query or a separate RPC change — create a brief comment block above each one explaining what the blocker is, so the next developer has clear context.
- Re-run `bun run build` — zero TypeScript errors required.
- **Pass criteria:** Any enrichable call sites are upgraded; remaining `TODO` items have explanatory comments; build is clean.

---

### [x] QA10 — Redirect chain length: confirm single-hop resolution

A user arriving from an old indexed URL must reach the final page in at most **one redirect hop**. Two or more hops (e.g. `/building/1` → `/building/1/slug` → `/architecture/fr/paris/1/slug`) waste crawl budget and slow users.

- Use `curl -sIL http://localhost:5173/building/1/some-slug` and count the number of `HTTP/` status lines in the output — must be exactly **2** (`301` then `200`).
- Use `curl -sIL http://localhost:5173/locality/paris-fr` — must be exactly **2** (`301` then `200`).
- Use `curl -sIL http://localhost:5173/architecture/fr/paris/1/wrong-slug` — must be exactly **2** (`301` then `200`).
- Use `curl -sIL http://localhost:5173/architecture/gb/paris/1/some-slug` (wrong country) — must be exactly **2** (`301` then `200`).
- Use `curl -sIL http://localhost:5173/building/1` (no slug) — must be exactly **2** (`301` then `200`). If this is **3** hops (`/building/1` → `/building/1/slug` → `/architecture/...`), the `BuildingRedirect` loader needs to be fixed to include the slug in its redirect target rather than deferring to the slug-correction logic.
- **Pass criteria:** Every legacy entry point resolves to a `200` in exactly 2 HTTP responses (one `301`, one `200`). No chains of 3 or more.

---

### [x] QA11 — `noindex` guard: private routes must not be crawlable

Confirm that the URL restructure has not accidentally changed the `noindex` behaviour of private routes.

- Request `/architecture/fr/paris/1/tour-eiffel/edit` (or whichever edit path exists) — it must either return `404`, or return `200` with `<meta name="robots" content="noindex, nofollow">` in the `<head>`.
- Request `/settings` — confirm `noindex` still present.
- Request `/auth/callback` — confirm `noindex` or `404`.
- Request `/admin` — confirm `noindex` or `404`.
- Check `robots.txt`: confirm `Disallow: /building/*/edit` and `Disallow: /architecture/*/edit` (if applicable) are both present.
- Run `grep -rn 'noindex' src/` to identify all places where `noindex` is set — confirm none of them were accidentally removed or their conditions altered during the loader rewrites in T6, T9, or T13.
- **Pass criteria:** No private or edit-mode URL is crawlable; `robots.txt` disallows match reality; no regression in `noindex` logic.

---

### [x] QA12 — TypeScript build and type coverage: final clean build

- Run `bun run build` from the repo root — must exit with code `0`, zero errors, zero warnings that were not present before this feature branch.
- Run `bun run typecheck` (or `tsc --noEmit`) — zero type errors.
- Confirm `LocalityDTO` (both the snake_case DB-mapped interface and the camelCase variant) include `city_slug`, `region`, and `region_slug` — run `grep -n 'city_slug\|regionSlug' src/features/localities/types.ts`.
- Confirm `EventDTO` includes `localityId`, `countryCode`, `citySlug` — run `grep -n 'localityId\|countryCode\|citySlug' src/features/events/types.ts`.
- Confirm there are no `as any` or `@ts-ignore` comments introduced during this feature — `grep -rn 'as any\|@ts-ignore' src/` should return no new hits compared to the base branch.
- Run `bun run test` (full test suite) — zero regressions; all pre-existing tests pass.
- **Pass criteria:** Clean build, zero type errors, zero new `as any` suppressions, full test suite green.

---

### [x] QA13 — Cross-browser and SSR hydration smoke test

- Open the following URLs in both Chrome and Firefox (or Safari) with DevTools Network tab open. Confirm:
  - `/architecture/fr` — no hydration errors in console; page content visible before JS executes (check by disabling JS and reloading).
  - `/architecture/fr/paris` — same checks.
  - `/architecture/fr/paris/1/tour-eiffel` — same checks; confirm the building name, credits, and hero image all render.
  - `/events/gb/london/some-event` — same checks.
- In each case, confirm the `HydrateFallback` skeleton appears briefly on slow connections (throttle to Slow 3G in DevTools) and resolves correctly — no layout shift or blank flash after hydration.
- Confirm the `<title>` tag is set correctly in the SSR HTML (visible in View Source before JS runs) — not `undefined` or empty.
- **Pass criteria:** No console errors on any page; correct SSR `<title>` on all three new page types; `HydrateFallback` skeletons render and resolve without visual glitches.

---

### [x] QA14 — Final regression: pre-existing routes still work

Confirm that nothing in T1–T18 accidentally broke any route that was not part of this feature.

- `/person/le-corbusier` (or any real person slug) → `200`, canonical unchanged.
- `/company/oma` (or any real company slug) → `200`, canonical unchanged.
- `/:username/collections/:slug` → `200`, canonical unchanged.
- `/search` → `200`.
- `/explore` → `200`.
- `/building/new` → `200` or redirect-to-login; crucially, must **not** be caught by the `/building/:id` redirect loader (static segment must still win).
- `/login` and `/signup` → `200`.
- The home feed (`/`) → `200`.
- Pick one review URL `/review/:id` → `200`.
- Confirm the `architect/:uuid` → `/person/:slug` legacy redirect (pre-existing, unrelated to this feature) still works: `curl -sI /architect/<some-uuid>` → `301` to `/person/:slug`.
- **Pass criteria:** Every pre-existing route returns the same status code and page content as before; the `/building/new` static route is not swallowed by the dynamic redirect.

---

## Out of scope (deferred)

| Feature | Reason deferred |
|---|---|
| Subregion pages (`/architecture/fr/ile-de-france`) | `region` / `region_slug` columns added in T2; routing and pages built only once content density justifies it |
| Neighbourhood pages (`/architecture/gb/london/hackney`) | Requires a `neighbourhoods` table with spatial boundaries; no building-level neighbourhood field exists yet |
| Event form locality picker | UX work required to surface locality auto-complete in `EventForm`; T12 adds the DB fields so this can be a standalone task |
| Google Search Console re-submission | Post-deployment operational task; submit updated sitemap URLs once T14 + T16 are in production |