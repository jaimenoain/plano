import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitExceededResponse } from "../_shared/rate-limit.ts";

const SITE_URL = "https://plano.app";
const S3_BASE = "https://s3.eu-west-2.amazonaws.com/plano.app";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatLastmod(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
};

// ---------------------------------------------------------------------------
// Sitemap index
// ---------------------------------------------------------------------------
function buildSitemapIndex(today: string): string {
  const sitemaps = [
    { loc: `${SITE_URL}/sitemap-buildings.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-localities.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-countries.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-events.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-people.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-companies.xml`, lastmod: today },
    { loc: `${SITE_URL}/sitemap-collections.xml`, lastmod: today },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const s of sitemaps) {
    xml += `  <sitemap>\n    <loc>${escapeXml(s.loc)}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>\n`;
  }
  xml += `</sitemapindex>`;
  return xml;
}

// ---------------------------------------------------------------------------
// Per-type child sitemaps
// ---------------------------------------------------------------------------
async function buildBuildingsSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let buildings: {
    short_id: number;
    slug: string;
    name: string;
    updated_at: string | null;
    created_at: string | null;
    hero_image_url: string | null;
    year_completed: number | null;
    city: string | null;
    country: string | null;
    building_styles: { architectural_styles: { name: string } | null }[];
    building_credits: { id: string }[];
    localities: { country_code: string; city_slug: string } | null;
  }[] = [];

  try {
    const { data, error } = await supabase
      .from("buildings")
      .select(
        "short_id, slug, name, updated_at, created_at, hero_image_url, year_completed, city, country, building_styles(architectural_styles(name)), building_credits(id), localities(country_code, city_slug)",
      )
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .not("short_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/buildings: query error", error.message);
    } else {
      buildings = (data as typeof buildings) ?? [];
    }
  } catch (e) {
    console.error("sitemap/buildings: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset\n  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static pages live in the buildings sitemap as the most prominent type
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/explore", priority: "0.9", changefreq: "daily" },
    { loc: "/search", priority: "0.8", changefreq: "daily" },
    { loc: "/terms", priority: "0.2", changefreq: "yearly" },
  ];
  for (const page of staticPages) {
    xml += `  <url>\n    <loc>${escapeXml(`${SITE_URL}${page.loc}`)}</loc>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
  }

  for (const b of buildings) {
    const lastmod = formatLastmod(b.updated_at ?? b.created_at);
    const locality = b.localities;
    const loc =
      locality?.country_code && locality?.city_slug
        ? `${SITE_URL}/architecture/${locality.country_code.toLowerCase()}/${locality.city_slug}/${b.short_id}/${b.slug}`
        : `${SITE_URL}/building/${b.short_id}/${b.slug}`;
    const hasHero = !!b.hero_image_url;
    const hasCredits = Array.isArray(b.building_credits) && b.building_credits.length > 0;
    const priority = hasHero && hasCredits ? "0.9" : "0.7";

    let imageBlock = "";
    if (hasHero && b.hero_image_url) {
      const rawUrl = b.hero_image_url;
      const imgUrl = rawUrl.startsWith("https://") ? rawUrl : `${S3_BASE}${rawUrl}`;

      const styleNames = Array.isArray(b.building_styles)
        ? b.building_styles
            .map((bs) => bs.architectural_styles?.name)
            .filter(Boolean)
        : [];
      const firstStyle = styleNames[0] ?? null;

      const titleRaw = `${b.name} — ${[b.city, b.country].filter(Boolean).join(", ")}`;
      const title = truncate(titleRaw, 100);

      const captionParts: string[] = [b.name];
      if (b.year_completed) captionParts[0] += ` (${b.year_completed})`;
      captionParts[0] += ".";
      if (firstStyle) captionParts.push(`${firstStyle} architecture`);
      const locationStr = [b.city, b.country].filter(Boolean).join(", ");
      if (locationStr) captionParts.push(`in ${locationStr}`);
      const captionRaw = captionParts.join(" ");
      const caption = truncate(captionRaw, 200);

      imageBlock = `\n    <image:image>\n      <image:loc>${escapeXml(imgUrl)}</image:loc>\n      <image:title>${escapeXml(title)}</image:title>\n      <image:caption>${escapeXml(caption)}</image:caption>\n    </image:image>`;
    }

    xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>${imageBlock}\n  </url>\n`;
  }

  xml += `</urlset>`;
  console.log(`sitemap/buildings: url_count=${buildings.length}`);
  return xml;
}

async function buildLocalitiesSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let localities: {
    country_code: string;
    city_slug: string;
    updated_at: string | null;
    created_at: string | null;
  }[] = [];
  try {
    const { data, error } = await supabase
      .from("localities")
      .select("country_code, city_slug, updated_at, created_at")
      .gt("buildings_count", 0)
      .order("buildings_count", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/localities: query error", error.message);
    } else {
      localities = (data as typeof localities) ?? [];
    }
  } catch (e) {
    console.error("sitemap/localities: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const loc of localities) {
    const lastmod = formatLastmod(loc.updated_at ?? loc.created_at);
    const url = `${SITE_URL}/architecture/${loc.country_code.toLowerCase()}/${loc.city_slug}`;
    xml += `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/localities: url_count=${localities.length}`);
  return xml;
}

async function buildCountriesSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let rows: { country_code: string; updated_at: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("localities")
      .select("country_code, updated_at")
      .gt("buildings_count", 0)
      .limit(45000);
    if (error) {
      console.error("sitemap/countries: query error", error.message);
    } else {
      rows = (data as typeof rows) ?? [];
    }
  } catch (e) {
    console.error("sitemap/countries: query exception", e);
  }

  // Deduplicate by country_code, keeping the most recent updated_at
  const countryMap = new Map<string, string | null>();
  for (const row of rows) {
    const existing = countryMap.get(row.country_code);
    if (existing === undefined || (row.updated_at && (!existing || row.updated_at > existing))) {
      countryMap.set(row.country_code, row.updated_at);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const [cc, updatedAt] of countryMap) {
    const lastmod = formatLastmod(updatedAt);
    const url = `${SITE_URL}/architecture/${cc.toLowerCase()}`;
    xml += `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/countries: url_count=${countryMap.size}`);
  return xml;
}

async function buildEventsSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let events: {
    slug: string;
    country_code: string | null;
    city_slug: string | null;
    updated_at: string | null;
    created_at: string | null;
  }[] = [];
  try {
    const { data, error } = await supabase
      .from("events")
      .select("slug, country_code, city_slug, updated_at, created_at")
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/events: query error", error.message);
    } else {
      events = (data as typeof events) ?? [];
    }
  } catch (e) {
    console.error("sitemap/events: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const ev of events) {
    const lastmod = formatLastmod(ev.updated_at ?? ev.created_at);
    const url =
      ev.country_code && ev.city_slug
        ? `${SITE_URL}/events/${ev.country_code.toLowerCase()}/${ev.city_slug}/${ev.slug}`
        : `${SITE_URL}/events/${ev.slug}`;
    xml += `  <url>\n    <loc>${escapeXml(url)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/events: url_count=${events.length}`);
  return xml;
}

async function buildPeopleSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let people: { slug: string; updated_at: string | null; created_at: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("people")
      .select("slug, updated_at, created_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/people: query error", error.message);
    } else {
      people = (data as typeof people) ?? [];
    }
  } catch (e) {
    console.error("sitemap/people: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const row of people) {
    const lastmod = formatLastmod(row.updated_at ?? row.created_at);
    const loc = `${SITE_URL}/person/${row.slug}`;
    xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/people: url_count=${people.length}`);
  return xml;
}

async function buildCompaniesSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let companies: { slug: string; updated_at: string | null; created_at: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("slug, updated_at, created_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/companies: query error", error.message);
    } else {
      companies = (data as typeof companies) ?? [];
    }
  } catch (e) {
    console.error("sitemap/companies: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const row of companies) {
    const lastmod = formatLastmod(row.updated_at ?? row.created_at);
    const loc = `${SITE_URL}/company/${row.slug}`;
    xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/companies: url_count=${companies.length}`);
  return xml;
}

async function buildCollectionsSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  let collections: { slug: string; updated_at: string | null; created_at: string | null }[] = [];
  try {
    const { data, error } = await supabase
      .from("collections")
      .select("slug, updated_at, created_at")
      .eq("is_public", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(45000);
    if (error) {
      console.error("sitemap/collections: query error", error.message);
    } else {
      collections = (data as typeof collections) ?? [];
    }
  } catch (e) {
    console.error("sitemap/collections: query exception", e);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  for (const c of collections) {
    const lastmod = formatLastmod(c.updated_at ?? c.created_at);
    const loc = `${SITE_URL}/collection/${c.slug}`;
    xml += `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
  }
  xml += `</urlset>`;
  console.log(`sitemap/collections: url_count=${collections.length}`);
  return xml;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Rate limit by caller IP
  const ip =
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { limited, retryAfter } = checkRateLimit(ip, { max: 20, windowMs: 60_000 });
  if (limited) {
    return rateLimitExceededResponse(retryAfter);
  }

  // Internal token verification — prevents direct calls to the Supabase URL
  // bypassing the Vercel proxy. Returns 404 to avoid revealing the mechanism.
  const internalToken = Deno.env.get("SITEMAP_INTERNAL_TOKEN");
  if (internalToken) {
    const requestToken = req.headers.get("x-sitemap-token") ?? "";
    const encoder = new TextEncoder();
    const a = encoder.encode(internalToken);
    const b = encoder.encode(requestToken);
    // Pad shorter buffer so timingSafeEqual can compare equal-length arrays
    const aFull = new Uint8Array(Math.max(a.length, b.length));
    const bFull = new Uint8Array(aFull.length);
    aFull.set(a);
    bFull.set(b);
    let match = a.length === b.length;
    // Always run the comparison to avoid short-circuit timing leaks
    const equal = crypto.subtle.timingSafeEqual(aFull, bFull);
    if (!match || !equal) {
      return new Response(null, { status: 404 });
    }
  } else {
    console.warn("sitemap: SITEMAP_INTERNAL_TOKEN is not set — token check skipped (local dev / CI)");
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // No type → return sitemap index
    if (!type) {
      const today = new Date().toISOString().split("T")[0] ?? "";
      const xml = buildSitemapIndex(today);
      return new Response(xml, { headers: XML_HEADERS });
    }

    // Dispatch to per-type builder
    let xml: string;
    switch (type) {
      case "buildings":
        xml = await buildBuildingsSitemap(supabase);
        break;
      case "localities":
        xml = await buildLocalitiesSitemap(supabase);
        break;
      case "countries":
        xml = await buildCountriesSitemap(supabase);
        break;
      case "events":
        xml = await buildEventsSitemap(supabase);
        break;
      case "people":
        xml = await buildPeopleSitemap(supabase);
        break;
      case "companies":
        xml = await buildCompaniesSitemap(supabase);
        break;
      case "collections":
        xml = await buildCollectionsSitemap(supabase);
        break;
      default:
        return new Response("Unknown sitemap type", {
          status: 400,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
    }

    const body = new TextEncoder().encode(xml);
    return new Response(xml, {
      headers: { ...XML_HEADERS, "Content-Length": String(body.length) },
    });
  } catch (e) {
    console.error("sitemap: response assembly failed", e);
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
});
