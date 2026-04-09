# Launch hosting notes (Track B)

## Edge functions: `og-tags` and `sitemap`

Both functions are configured with **`verify_jwt = false`** in [`supabase/config.toml`](../supabase/config.toml) so your CDN or worker can invoke them without a user session. They only use the **anon** Supabase client and public data.

Optional: set **`STORAGE_PUBLIC_URL`** in the Edge Function secrets if the default public asset base differs from `https://s3.eu-west-2.amazonaws.com/plano.app` (used to absolutize relative `hero_image_url` / `avatar_url` values in `og-tags`).

## Social / link-preview routing (`og-tags`)

Route **link-expanding and social preview** user agents to:

`https://<project-ref>.supabase.co/functions/v1/og-tags?path=<url-encoded-path>`

Example: `?path=%2Fbuilding%2F123%2Fslug-here`

### User agents

Use this list for **OG / preview only**. The main SSR app already returns full HTML (including meta tags and JSON-LD) to Googlebot, so this function is now primarily for social preview bots (Slack, Discord, etc.).

Suggested matchers (tune for your platform):

- `facebookexternalhit`, `Facebot`, `Twitterbot`, `LinkedInBot`, `Slackbot-LinkExpanding`
- `WhatsApp`, `TeleBot`, `TelegramBot`, `Discordbot`, `Pinterest`, `Embedly`
- `Quora Link Preview`, `Showyoubot`, `outbrain`, `vkShare`, `W3C_Validator`, `redditbot`, `Applebot`

## Sitemap routing (`sitemap`)

Production serves **`/sitemap.xml`** via a Vercel rewrite in [`vercel.json`](../vercel.json): requests to `/sitemap.xml` are proxied to the Supabase Edge Function:

`https://<project-ref>.supabase.co/functions/v1/sitemap`

(`<project-ref>` for Plano is `lnqxtomyucnnrgeapnzt`, matching the rewrite destination in `vercel.json`.)

The rewrite proxies the upstream response: HTTP status codes from the Edge Function (including **5xx**) are returned to the client as-is, so a failed sitemap build is not masked as `200`.

## `robots.txt`

[`public/robots.txt`](../public/robots.txt) references `https://plano.app/sitemap.xml` — ensure production serves the sitemap URL above at that path.

The stock file uses **`User-agent: *`** + **`Allow: /`** (no `Disallow` rules), so **`/person/`** and **`/company/`** are crawlable unless you add exclusions later.

## Google Search Console (site owner)

**Sitemap URL to submit:** `https://plano.app/sitemap.xml` (same path `robots.txt` advertises; apex may redirect to `www` — either host is fine if the property matches how users reach the site).

**In Google Search Console**

1. Open **Sitemaps**, enter `https://plano.app/sitemap.xml`, use Test then Submit.
2. After processing, confirm the reported discovered URL count is non-zero and errors are addressed (fix code or data, then resubmit).
3. Use **URL Inspection** on a few sample URLs from the sitemap (buildings, `/person/:slug`, `/company/:slug`, profiles) and request indexing where you want faster recrawls.
4. Use **URL Inspection** on private URLs such as `/settings`, `/auth`, and one `/building/<id>/edit` URL — status should be **not indexed**, with **noindex** given as the reason.

**Vercel rewrite (sitemap proxy)** — in [`vercel.json`](../vercel.json):

| Source | Destination |
|--------|-------------|
| `/sitemap.xml` | `https://lnqxtomyucnnrgeapnzt.supabase.co/functions/v1/sitemap` |

Upstream status codes (including **5xx**) are passed through to the client (see **Sitemap routing** above).

### Issue categories vs. implementation (checklist)

Use this when reviewing Search Console **Pages** / **Indexing** reports after the next full crawl:

- **Canonical / duplicate URLs:** Building routes enforce slug canonicalisation (301 when slug missing or wrong).
- **Crawled / not indexed (thin or meta):** Public pages ship SSR `meta` (title, description, canonical, OG/Twitter) from React Router `meta()` exports.
- **Excluded by noindex:** Edit flows, auth, settings, notifications, admin, and similar routes emit `noindex, nofollow` in SSR HTML.
- **Sitemap errors or stale empty sitemap:** Edge function returns partial XML if one section fails; full failure returns **500** (not a fake empty **200**).

### Automated spot-check (2026-04-06, `www.plano.app`, Googlebot UA)

| Check | Result |
|-------|--------|
| `GET /sitemap.xml` | HTTP 200, XML `urlset` |
| `GET /` | `meta name="description"` and `link rel="canonical"` present |
| `GET /building/18242` (no slug, no redirects) | HTTP 301 |
| `GET /settings` | `meta name="robots"` contains noindex + nofollow |

**Note:** `/terms` SSR meta (canonical + description) is in app code (SEO Task 5.1); confirm again after the next production deploy if the live response still omits those tags.

## Legacy `/architect/:id` URLs (Building Credits Phase 3)

The app answers `/architect/<uuid>` with **301** to `/person/<slug>` when the UUID matches `people.id`, or to `/company/<slug>` when it matches `companies.id` (studio rows migrated from `architects`). Invalid UUIDs or unknown IDs get **404** (no redirect loop). Legacy `/architect/<uuid>/edit` maps to the same targets with **`?edit=1`**. In-app navigations use React Router’s `replace` response so the history entry is the canonical `/person/` or `/company/` URL, not the intermediate `/architect/` path — there is no second hop to `/profile/:username`.

### Vercel / `vercel.json`

There is **no** `rewrites` or `redirects` entry for `/architect/*` in [`vercel.json`](../vercel.json). Traffic hits the React Router SSR app; the route loader resolves the UUID to a slug and returns the **301** (see `architectIdRedirect.loader.ts`). Automated checks live in **`architectIdRedirect.loader.test.ts`**.

If TLS terminates at a CDN or proxy in front of Vercel, you usually do **not** need a separate edge rule: letting the request reach the app is enough. Add a static **301** at the edge only if you must redirect without hitting the SSR app (then mirror the same slug rules as the loader, or accept a second hop via the app).
