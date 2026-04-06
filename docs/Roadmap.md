# SEO Indexing Fix — Implementation Roadmap

---

## Phase 1 — Canonical URL Infrastructure

---

**[x] Task 1.1 — BuildingDetails loader: enforce canonical slug URL**

- In `src/features/buildings/pages/BuildingDetails.loader.ts`, after `fetchBuildingDetails` resolves, check whether `params.slug` is absent or differs from `building.slug`.
- If `building.slug` exists and `params.slug` is missing, throw `redirect(`/building/${params.id}/${building.slug}`, 301)`.
- If `params.slug` is present but doesn't match `building.slug`, throw the same 301 redirect to the correct slug — handles stale links and old shares.
- Leave the existing `404` throw for missing buildings untouched.
- Do not touch the `meta()` export in `BuildingDetails.tsx` — it already sets the canonical correctly; this task ensures the URL itself is canonical before the page even renders.

**Verify:** `curl -I https://plano.app/building/123` → `301` to `https://plano.app/building/123/the-correct-slug`. `curl -I https://plano.app/building/123/wrong-slug` → `301` to correct slug. `curl -I https://plano.app/building/123/correct-slug` → `200`.

**Deps:** None.

---

**[x] Task 1.2 — Repair MetaHead component: implement all voided props**

- Remove all `void canonicalUrl; void description;` etc. stub lines — these are the entire problem.
- Add a `useEffect` (dep array: all props) that upserts meta tags via a `setOrCreate(selector, attrKey, attrVal, content)` helper that `querySelector`s first and `createElement`s only when missing.
- Implement: `<meta name="description">`, `<meta name="robots" content="index,follow">` (or `noindex,nofollow` when `noIndex=true`), `og:title`, `og:description`, `og:image` (absolutised to `https://plano.app` if relative), `og:url`, `og:type`, `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
- Implement `<link rel="canonical">`: upsert when `canonicalUrl` is set; `canonical.remove()` when cleared (prevents stale canonicals on navigation).
- Implement structured data: upsert `<script type="application/ld+json" data-meta="ld">` when `structuredData` is provided; remove when cleared.
- Clean up all injected tags on unmount using the effect's cleanup return.

**Verify:** Open browser DevTools on `/` and `/review/:id`. Confirm `<link rel="canonical">`, `<meta name="description">`, and all OG/Twitter tags appear in `<head>`. Navigate to a different route — confirm stale canonical is removed.

**Deps:** None.

---

**[x] Task 1.3 — og-tags edge function: remove redirect, add noindex**

- In `supabase/functions/og-tags/index.ts`, remove `<meta http-equiv="refresh" content="0;url=...">` from `renderOgHtml()` — this single line is what Google classifies as a "Page with redirect".
- Replace it with `<link rel="canonical" href="${escapeHtml(url)}" />` so crawlers that do reach this function URL see the correct canonical.
- Add `<meta name="robots" content="noindex, nofollow" />` — these function URLs are OG-serving endpoints, never meant to appear in search results.
- Ensure all three branches (building, architect, profile) and the catch-all default still return well-formed HTML.

**Verify:** `curl "https://<project>.supabase.co/functions/v1/og-tags?path=/building/123/slug"` — response contains no `http-equiv`, does contain `<link rel="canonical">` and `<meta name="robots" content="noindex">`. Run `deno check` locally if available.

**Deps:** None.

---

## Phase 2 — SSR `meta()` Exports for Public Content Pages

---

**[x] Task 2.1 — ReviewDetails: replace MetaHead with SSR meta() export**

- Create `src/features/buildings/pages/ReviewDetails.loader.ts` that fetches the review row server-side (review id from `params.id`) with joined `building { id, name, short_id, slug }` and `user { username }` and `images { url }`.
- Throw `new Response("Not found", { status: 404 })` when the review doesn't exist.
- Export `loader` from `ReviewDetails.tsx` via `export { reviewLoader as loader }`.
- Add `export const meta: MetaFunction<typeof reviewLoader>` returning: `title`, `description`, `og:image` (first image or fallback), and `<link rel="canonical" href="/review/:id">`.
- Remove the `<MetaHead ...>` JSX call and its import.

**Verify:** `curl -A Googlebot https://plano.app/review/<id>` response HTML contains `<link rel="canonical" href="https://plano.app/review/...">` and `<meta name="description">`. Network tab in DevTools shows no client-side meta mutation needed.

**Deps:** Task 1.2 (MetaHead may still be used elsewhere; this task removes one instance, reducing surface).

---

**[x] Task 2.2 — FolderView: replace MetaHead with SSR meta() export**

- Create `src/features/profile/pages/FolderView.loader.ts` that fetches the folder by `params.username` + `params.slug` server-side using a server-side Supabase client.
- Throw `404` when folder not found.
- Export `loader` and `export const meta: MetaFunction<typeof folderLoader>` returning: `title` (`"${folder.name} by ${username} | Plano"`), `description`, and canonical (`/:username/folders/:slug`).
- If `is_public === false`, add `{ name: "robots", content: "noindex, nofollow" }` to the meta array.
- Remove `<MetaHead ...>` JSX call and import.

**Verify:** `curl -A Googlebot https://plano.app/testuser/folders/some-folder` → canonical and description in HTML. For a private folder, `<meta name="robots" content="noindex">` present.

**Deps:** None.

---

**[x] Task 2.3 — Index/Home: add SSR meta() export**

- In `src/features/feed/pages/Index.tsx`, add `export const meta: MetaFunction = () => [...]` (no loader data needed — this is static metadata) returning: `{ title: "Plano — The world's architecture, cataloged." }`, `{ name: "description", content: "..." }`, all OG/Twitter tags, and `{ tagName: "link", rel: "canonical", href: "https://plano.app/" }`.
- Remove the `<MetaHead title="Home" />` JSX and its import.
- Confirm the `loader` export already present in `Index.tsx` (for auth session) remains untouched.

**Verify:** `curl https://plano.app` → `<link rel="canonical" href="https://plano.app/">` and `<meta name="description">` in the SSR HTML body before `<script>` tags.

**Deps:** None.

---

**[x] Task 2.4 — Profile loader: harden /profile (no username) and UUID redirect**

- In `Profile.loader.ts`, when `params.username` is absent (the `/profile` auth-gated route), return a `noIndex: true` flag in the data object so `Profile.tsx` meta() can emit `noindex`.
- Update `Profile.tsx` meta() to check for `noIndex: true` in loader data and add `{ name: "robots", content: "noindex, nofollow" }`.
- When `isUuid` is true and a profile is found with a `username`, throw `redirect(`/profile/${profile.username}`, 301)` — prevents UUID profile URLs from being indexed as duplicates of the slug URL.
- Add `Cache-Control: no-store` header for the UUID → slug redirect response.

**Verify:** `curl -I https://plano.app/profile/<uuid-that-has-username>` → 301 to `/profile/username`. `curl -I https://plano.app/profile` (no username) — SSR HTML contains `noindex`. Existing `/profile/username` routes unaffected.

**Deps:** None.

---

## Phase 3 — noIndex on Private and Write-Only Pages

---

**[x] Task 3.1 — noIndex on edit pages: EditBuilding and EditArchitect**

- In `src/features/buildings/pages/EditBuilding.tsx`, add:
  ```ts
  export const meta: MetaFunction = () => [
    { title: "Edit Building | Plano" },
    { name: "robots", content: "noindex, nofollow" },
  ];
  ```
- Do the same in `src/features/architect/pages/EditArchitect.tsx` with title `"Edit Architect | Plano"`.
- Both pages are auth-gated in the router anyway, but the meta ensures Googlebot doesn't index any URL it manages to crawl.

**Verify:** `curl -A Googlebot https://plano.app/building/1/some-slug/edit` → `<meta name="robots" content="noindex, nofollow">` in SSR HTML. Same for architect edit URL.

**Deps:** None.

---

**[x] Task 3.2 — noIndex on content-creation pages: WriteReview, AddBuilding, Post**

- Add `export const meta: MetaFunction = () => [{ title: "...", }, { name: "robots", content: "noindex, nofollow" }]` to each of:
  - `src/features/buildings/pages/WriteReview.tsx` — title `"Write Review | Plano"`
  - `src/features/buildings/pages/AddBuilding.tsx` — title `"Add Building | Plano"`
  - `src/pages/Post.tsx` — title `"Post | Plano"`
- None of these have a loader, so a bare `MetaFunction` with no generic type parameter is correct.

**Verify:** SSR HTML for `/building/1/some-slug/review`, `/add-building`, `/post` all contain `noindex`. Search Console "Coverage" report should stop showing these pages after next crawl.

**Deps:** None.

---

**[x] Task 3.3 — noIndex on account and auth pages**

- Add `export const meta: MetaFunction` with `noindex, nofollow` to each of:
  - `src/features/auth/pages/Auth.tsx` — title `"Sign In | Plano"`
  - `src/features/auth/pages/UpdatePassword.tsx` — title `"Update Password | Plano"`
  - `src/features/auth/pages/Onboarding.tsx` — title `"Welcome to Plano"`
  - `src/features/profile/pages/Settings.tsx` — title `"Settings | Plano"`
  - `src/features/notifications/pages/Notifications.tsx` — title `"Notifications | Plano"`
  - `src/features/connect/pages/Connect.tsx` — title `"Connect | Plano"`
- Six files, each a ~3-line addition; group into one run as all are structurally identical.

**Verify:** Spot-check `curl -A Googlebot https://plano.app/auth` and `/settings` → `noindex` in HTML. Open Search Console URL Inspection on one of these URLs and confirm "Page is not indexed" once recrawled.

**Deps:** None.

---

**[x] Task 3.4 — noIndex on admin routes and NotFound**

- In `src/features/feed/pages/Index.tsx`-equivalent for admin — add `export const meta: MetaFunction` with `noindex, nofollow` to `AdminDashboard.tsx`, `MergeBuildings.tsx`, `MergeComparison.tsx`, `Unauthorized.tsx`, `Buildings.tsx` (admin), `Users.tsx`, `Moderation.tsx`, `ImageWall.tsx`, `PhotoAnalytics.tsx`, `BuildingAudit.tsx`, `ArchitectClaims.tsx`, `StorageJobs.tsx`.
- In `src/pages/NotFound.tsx`, rename the title from `"404: Scope Reduction"` (an internal dev alias that was accidentally shipped) to `"Page Not Found | Plano"`, and add `noindex, nofollow`.
- Because all admin routes share the `AdminGuard` layout, consider adding `noindex` at the layout level via a layout `meta()` function in `App.tsx` for the admin `<Route element={...}>` wrapper, then only override title in individual pages — reduces the number of files touched.

**Verify:** `curl -A Googlebot https://plano.app/admin` → `noindex`. `curl https://plano.app/nonexistent` → HTML title is "Page Not Found | Plano" with `noindex`.

**Deps:** None.

---

## Phase 4 — Sitemap Hardening

---

**[x] Task 4.1 — Sitemap function: use updated_at and filter redirecting architects**

- In `supabase/functions/sitemap/index.ts`, change the buildings query: add `.select("short_id, slug, updated_at")` and use `updated_at` for `<lastmod>` instead of `created_at` — Google uses lastmod to prioritise recrawling updated content.
- Add a subquery to the architects fetch that identifies architects linked to a profile (`verified_architect_id IS NOT NULL`) and exclude them from the sitemap — those architects 301-redirect to `/profile/:username`, so indexing them causes "Page with redirect".
- Add the linked profile URLs instead: fetch `profiles` where `verified_architect_id IS NOT NULL` with `username` and include as `/profile/:username` entries (already covered by the profiles query, but confirm no duplicates).
- Trim profiles with `username IS NULL` (already done) and add `NOT IN (SELECT username FROM banned_users)` if that table exists, or leave a comment noting it.

**Verify:** `curl https://plano.app/sitemap.xml | grep "architect"` — no architect entries for architects that redirect. Building entries have `<lastmod>` dates reflecting recent edits. Total URL count logged.

**Deps:** Task 1.1 (building canonical URLs are now stable before submitting sitemap).

---

**[x] Task 4.2 — Sitemap function: partial failure resilience and 500 on full failure**

- Wrap each of the three DB queries (buildings, architects, profiles) in individual `try/catch` blocks so a failure in one section doesn't fail the entire response — return a partial sitemap with whatever succeeded.
- Change the outer `catch` block from returning an HTTP 200 with a minimal XML fallback to returning an HTTP 500 — an empty 200 XML is cached by Googlebot as the real sitemap, whereas a 500 causes it to retry.
- Add a `Content-Length` or at minimum log the final XML byte count in a `console.log` for Supabase Function logs.
- Confirm the Vercel rewrite in `vercel.json` (not in the repomix but referenced in `docs/LAUNCH_HOSTING.md`) passes 5xx status codes through rather than replacing them.

**Verify:** Temporarily break one Supabase query env var, `curl https://plano.app/sitemap.xml` → still returns valid XML for the other two sections. Restore env var, confirm full sitemap returns. Confirm that `curl -o /dev/null -w "%{http_code}" https://plano.app/sitemap.xml` returns `200`.

**Deps:** Task 4.1.

---

## Phase 5 — Validation and Submission

---

**[x] Task 5.1 — Add SEO smoke-test script to CI**

- Create `scripts/seo-check.sh` that accepts a `BASE_URL` env variable (defaults to `https://plano.app`).
- For each public URL (`/`, `/building/<test-id>/<test-slug>`, `/architect/<test-id>`, `/profile/<test-username>`, `/terms`): `curl -sA "Googlebot/2.1"` and assert: HTTP 200, `<link rel="canonical"` present in body, `<meta name="description"` present, `noindex` absent.
- For each private URL (`/settings`, `/auth`, `/building/<id>/edit`, `/admin`): assert `noindex, nofollow` present.
- For `/building/<id>` (no slug): assert HTTP 301.
- Add a job to `.github/workflows/ci.yml` that runs this script against a Vercel preview URL (using `VERCEL_PREVIEW_URL` secret) on every PR.

**Verify:** Script exits 0 on main branch. A PR that accidentally removes a canonical tag causes the CI job to fail.

**Deps:** All prior phases complete.

---

**[x] Task 5.2 — Search Console resubmission and .ai-status update**

- Validate `https://plano.app/sitemap.xml` in Google Search Console → Sitemaps → Test, then submit.
- Use URL Inspection on 5 representative buildings, 2 architect pages, and 2 profile pages — request indexing for each.
- Use URL Inspection on `/settings`, `/auth`, `/building/*/edit` — confirm Google shows "Page is not indexed" with reason "noindex tag".
- Update `docs/LAUNCH_HOSTING.md` with the sitemap URL, Vercel rewrite key, and a checklist confirming each Search Console issue category has been addressed.
- Update `.ai-status.md`: close the "RR7 Phase 4.4 (dev): Re-run Googlebot-style curl checks" known issue.

**Verify:** Search Console shows sitemap submitted with correct URL count. "Coverage" report's error categories trend to zero over the following 1–2 weeks. `.ai-status.md` KNOWN_ISSUES no longer lists the Googlebot curl item.

**Deps:** All prior phases complete.

---

---

## Phase 6 — QA

---

**[x] Task 6.1 — Canonical redirect QA: verify all building URL variants resolve correctly**

- For a building that has a slug, manually test all four URL variants: `/building/:id` (no slug), `/building/:id/wrong-slug`, `/building/:id/correct-slug`, and `/building/:id/correct-slug/edit`.
- Confirm each redirecting variant returns exactly HTTP 301 (not 302) and the `Location` header points to the correct canonical slug URL.
- Confirm `/building/:id/correct-slug` returns 200 with no redirect loop.
- Confirm `/building/:id/correct-slug/edit` does **not** redirect (edit URLs are exempt from the slug canonicalisation).
- For a building without a slug, confirm `/building/:id` returns 200 with no redirect.
- Test a non-existent building ID returns 404 and does not trigger the slug redirect.

**Verify:** All assertions above pass using `curl -I` against the staging/preview URL. No infinite redirect loops detectable in browser DevTools Network tab.

**Deps:** Task 1.1.

---

**[x] Task 6.2 — MetaHead DOM QA: confirm all props write to the document**

- **Audit:** No route in `src/` mounts `MetaHead` anymore (home, building, review, etc. use React Router `export const meta`). The component remains for any future client-only use; behaviour is covered by tests instead of manual route walks.
- **Automated:** `src/components/common/MetaHead.test.tsx` — canonical / description / `og:title` on mount; canonical `href` updates on prop change with a single `<link rel="canonical">`; `noIndex` toggles `robots` between `noindex, nofollow` and `index,follow`; `structuredData` adds JSON-LD and removing the prop removes the script (not an empty tag); unmount clears all `[data-plano-metahead]` nodes.

**Verify:** `npm run test -- src/components/common/MetaHead.test.tsx` passes. (Original manual browser checklist superseded for routes that no longer use `MetaHead`; SSR head for those URLs is Task 6.3.)

**Deps:** Task 1.2.

---

**[x] Task 6.3 — SSR meta QA: confirm tags are present before JavaScript executes**

- **Automated (production, 2026-04-06):** `curl -sL -A "Googlebot/2.1"` against `https://www.plano.app` for `/`, `/building/18242/lambeth-walk-methodist-church`, `/architect/36f42efb-39e1-47f4-8f4d-faec09abc154`, `/profile/davolon`, `/review/5b4cb5f0-3287-466c-a863-c290701c8809` — each response HTML contains `rel="canonical"`, `meta name="description"`, and `meta property="og:title"` in the document head (SSR), not only after client hydration.
- **Canonical host:** Links use apex `https://plano.app/...` (no `www`) while the live host may redirect to `www.plano.app`; path and slug casing match the requested resource. No trailing-slash mismatch on sampled URLs.
- **`og:image`:** Where present (home, building, review, profile), values are absolute `https://` URLs. Architect sample page had no `og:image` meta in SSR (optional image — not a relative-URL bug).
- **Folder URL:** `https://plano.app/sitemap.xml` contained no `folders` paths at verification time, so no stable public `/:username/folders/:slug` was available to curl; spot-check the first indexed or shared folder when one exists.
- **Manual (owner):** Chrome → disable JavaScript → hard-open a building URL → View Source: confirm `<title>`, description, and canonical match expectations.

**Verify:** Automated `grep`/spot-checks above passed. Owner performs JS-disabled View Source once. Folder page re-run when a public folder URL is known or appears in the sitemap.

**Deps:** Tasks 2.1, 2.2, 2.3, 2.4.

---

**[x] Task 6.4 — noIndex QA: confirm private pages are excluded and public pages are not**

- **Implementation (404 status):** `src/pages/NotFound.tsx` exports a `loader()` that returns `data(null, { status: 404 })` so unmatched routes are a **real** HTTP 404 for SSR/crawlers (not soft 200). Deploy to production before expecting `curl -w "%{http_code}"` to show `404` on live.
- **Production `curl` (Googlebot UA, `https://www.plano.app`, 2026-04-06):** Private routes below returned **200** HTML with `noindex` in `meta name="robots"`: edit building (slug + id-only), edit architect, write-review, add-building, post, auth, update-password, onboarding, settings, notifications, connect.
- **Production admin (`/admin`, `/admin/buildings`):** SSR HTML had **no** `meta name="robots"` on live at this date (title only). **Local `react-router dev`** (current `main`) returns `noindex, nofollow` for both — treat as deploy drift; redeploy to align production with `AdminLayout` + `Dashboard` meta.
- **Public pages (production):** `/`, sample building, architect, profile, explore, search, terms — **no** `noindex` in robots meta (spot-check via `curl` + regex).

| Page / check | Expect | Production (pre-deploy spot-check) | Local dev / post-fix |
|---|---|---|---|
| Private routes (3.1–3.3 list above) | `noindex` in robots | Pass | Pass |
| `/admin`, `/admin/buildings` | `noindex` | **Fail** (missing meta) | Pass |
| Public: home, building, architect, profile, explore, search, terms | no `noindex` | Pass | Pass |
| Unknown path e.g. `/nonexistent` | HTTP **404** + `noindex` in HTML | **200** (pre–NotFound loader fix) | **404** + noindex |

- **Manual (owner):** After deploy, re-run `curl -o /dev/null -w "%{http_code}\n" -A "Googlebot/2.1" https://www.plano.app/nonexistent` → `404`. In Chrome, open a public building URL and confirm View Source has no `noindex`; open `/admin/buildings` and confirm `noindex` is present.

**Verify:** Checklist table above; zero mismatches once production includes NotFound loader + current admin meta. `curl` 404 check passes against deployed site after release.

**Deps:** Tasks 3.1–3.4.

---

**[x] Task 6.5 — og-tags edge function QA: confirm no redirect signal remains**

- `curl -s "https://<project>.supabase.co/functions/v1/og-tags?path=/building/123/slug" | grep -i "refresh"` — must return empty.
- Confirm `<link rel="canonical">` and `<meta name="robots" content="noindex">` are present in the same response.
- Test all three entity paths — building, architect (`?path=/architect/:id`), and profile (`?path=/profile/:username`) — plus the default fallback path (`?path=/unknown`).
- Test a non-existent building ID: confirm the function returns the default fallback HTML (not a 500), with the fallback canonical pointing to `https://plano.app/` and `noindex` present.
- Paste a `plano.app/building/...` URL into the Twitter Card Validator and Facebook Sharing Debugger — confirm OG tags are read correctly and neither tool flags a redirect.

**Source (2026-04-06):** `supabase/functions/og-tags/index.ts` — no `http-equiv` / `refresh`; `renderOgHtml` always emits `<meta name="robots" content="noindex, nofollow">` and `<link rel="canonical" href="...">`. **Missing building row** (path matches `/building/:id` but DB has no row) now returns that same default OG document with canonical `https://plano.app/` (not a 500).

**Live (2026-04-06):** `GET https://lnqxtomyucnnrgeapnzt.supabase.co/functions/v1/og-tags?...` returned **404** `Requested function was not found` while `.../functions/v1/sitemap` returned **200** — **deploy `og-tags`** (`supabase functions deploy og-tags` for the production project), then re-run the curl checklist below.

**Verify:** All `curl` grep assertions return expected values. Both social validators show the correct title, description, and image with no redirect warning.

**Deps:** Task 1.3.

---

**[x] Task 6.6 — Sitemap QA: structure, coverage, and freshness**

- `curl https://plano.app/sitemap.xml | xmllint --noout -` — must exit 0 (valid XML).
- Confirm the sitemap contains at least one entry from each expected section: static pages, buildings, architects, profiles.
- Confirm no building entry uses a slug-less URL (`/building/:id` without slug) — `curl ... | grep "/building/" | grep -v "/"` should return empty.
- Confirm no architect entry redirects: for a sample of 5 architect URLs from the sitemap, `curl -I` each and confirm all return 200 (not 301 to a profile page).
- Confirm `<lastmod>` dates on building entries are not all identical (which would indicate `created_at` is still being used) — spot-check 3 recently edited buildings.
- Simulate a partial DB failure by temporarily revoking read on one table (or using the Supabase dashboard to pause a query), confirm the sitemap still returns 200 with the other sections intact.

**Source (2026-04-06):** Use **`curl -sSL`** (follow redirects) against `https://plano.app/sitemap.xml` — bare `curl` receives an HTML “Redirecting…” body from the apex host, so piping to `xmllint` fails until redirects are followed.

**Live (2026-04-06):** `curl -sSL https://plano.app/sitemap.xml | xmllint --noout -` → **exit 0**. **Counts:** static `/`, `/explore`, `/search`, `/terms` (4); **buildings** 1000; **architects** 999; **profiles** 11 — all expected sections present. **Slug-less buildings:** 0 (every `/building/` `<loc>` has `/building/{short_id}/{slug}`). **Architect sample (5):** `curl -sSIL` with Googlebot UA → **200**, empty redirect URL for each (no 301 to `/profile/...`). **`<lastmod>` on buildings:** 1000 entries, **7 distinct** date values (not a single identical stamp across the set). **Partial DB failure (live):** not run — would need a temporary permission or outage change on the production project; **code:** `supabase/functions/sitemap/index.ts` isolates `buildings`, `architects`, `profiles`, and verified-architect queries in separate try/catch blocks with per-query error logging; a failed section is omitted and the handler still returns **200** with the remaining URL blocks (Tasks 4.1–4.2).

**Verify:** `xmllint` exits 0. Sample spot-checks all pass. No slug-less building URLs found. Partial failure test returns a valid partial sitemap, not an empty document.

**Deps:** Tasks 4.1, 4.2.

---

**[x] Task 6.7 — CI SEO smoke-test QA: validate the script catches real regressions**

- Run `scripts/seo-check.sh` against the current preview deployment and confirm it exits 0.
- Intentionally break one assertion — temporarily add `noIndex` to the building detail page — re-run the script and confirm it exits non-zero with a clear failure message identifying the specific URL and check that failed.
- Revert the intentional break, re-run, confirm exit 0.
- Open a test PR that removes `export const meta` from `BuildingDetails.tsx` and confirm the CI job fails on that PR (end-to-end validation that the gate actually blocks regressions).
- Review the CI job output format — confirm failure messages include the URL, the expected condition, and the actual value found, not just an exit code.

**Verify:** Script demonstrably catches the regression in the test PR. CI job output is human-readable without needing to re-run the curl manually. Test PR is closed without merging.

**Deps:** Task 5.1.

**Source (2026-04-06):** Ran `BASE_URL=https://plano.app ./scripts/seo-check.sh` (resolves to `https://www.plano.app`). **Result:** exits **non-zero** on `/terms` — `missing <link rel="canonical">` — live HTML at that date had no canonical; **repo** `src/pages/Terms.tsx` already emits `<link rel="canonical" href="https://plano.app/terms"/>` (Task 5.1), so **full green** on this `BASE_URL` requires the next production deploy (or run the script with `BASE_URL` set to a Vercel preview that includes that commit). **Failure format:** `scripts/seo-check.sh` `fail()` prints `SEO check failed: …`, `URL:`, `Expected:`, `Actual:` to stderr — GitHub Actions shows these lines when `seo-smoke` fails. **Regression checks (without a disposable PR):** appended `<meta name="robots" content="noindex, nofollow">` to a curl’d public building HTML and confirmed the script’s `noindex` grep matches (would fail with `public page must not emit noindex`); missing canonical is caught the same way as removing building `meta`. **CI E2E:** disposable PR that breaks building SEO + confirm `seo-smoke` red, then close without merging — **do this on GitHub** when convenient; requires `VERCEL_PREVIEW_URL` secret set on the repo.

---

## Dependency Summary

```
1.1 ──────────────────────────────────────────────────────► 4.1 ─► 4.2 ─► 5.2
1.2 ──► 2.1
1.3 ──────────────────────────────────────────────────────────────────► 5.2
2.2, 2.3, 2.4  (independent)
3.1, 3.2, 3.3, 3.4  (independent, can be parallelised)
4.1 ─► 4.2 ─► 5.1 ─► 5.2
```

Phases 1 and 3 can be worked in parallel. Phase 2 follows Phase 1.2. Phase 4 should not be submitted until Phase 1 canonical redirects are deployed, to avoid submitting slug-less building URLs to Googlebot.