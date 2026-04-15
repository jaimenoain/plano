import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  let buildings: {
    short_id: number;
    slug: string;
    name: string;
    updated_at: string | null;
    hero_image_url: string | null;
    year_completed: number | null;
    city: string | null;
    country: string | null;
    building_styles: { architectural_styles: { name: string } | null }[];
    building_credits: { id: string }[];
  }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("buildings")
      .select(
        "short_id, slug, name, updated_at, hero_image_url, year_completed, city, country, building_styles(architectural_styles(name)), building_credits(id)",
      )
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .not("short_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10000);
    if (error) {
      console.error("sitemap: buildings query error", error.message);
    } else {
      buildings = data as typeof buildings;
    }
  } catch (e) {
    console.error("sitemap: buildings query exception", e);
  }

  let people: { slug: string; updated_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("people")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: people query error", error.message);
    } else {
      people = data;
    }
  } catch (e) {
    console.error("sitemap: people query exception", e);
  }

  let companies: { slug: string; updated_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("companies")
      .select("slug, updated_at")
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: companies query error", error.message);
    } else {
      companies = data;
    }
  } catch (e) {
    console.error("sitemap: companies query exception", e);
  }

  // Public profile URLs — canonical /profile/:username.
  // No public.banned_users table: exclude banned usernames here if that table is added later.
  let profiles: { username: string; updated_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10000);
    if (error) {
      console.error("sitemap: profiles query error", error.message);
    } else {
      profiles = data;
    }
  } catch (e) {
    console.error("sitemap: profiles query exception", e);
  }

  let collections: { slug: string; updated_at: string }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("collections")
      .select("slug, updated_at")
      .eq("is_public", true)
      .not("slug", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: collections query error", error.message);
    } else {
      collections = data;
    }
  } catch (e) {
    console.error("sitemap: collections query exception", e);
  }

  let events: {
    slug: string;
    updated_at: string;
    start_at: string;
    end_at: string | null;
  }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("slug, updated_at, start_at, end_at")
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .order("start_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: events query error", error.message);
    } else {
      events = data;
    }
  } catch (e) {
    console.error("sitemap: events query exception", e);
  }

  let localities: { slug: string; updated_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("localities")
      .select("slug, updated_at")
      .gt("buildings_count", 0)
      .order("buildings_count", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: localities query error", error.message);
    } else {
      localities = data;
    }
  } catch (e) {
    console.error("sitemap: localities query exception", e);
  }

  // TODO: If the total URL count (buildings + people + companies + collections + events + profiles + localities)
  // exceeds 45,000, switch to a sitemap index that references separate per-entity sitemaps:
  //   /sitemap-buildings.xml, /sitemap-people.xml, /sitemap-companies.xml,
  //   /sitemap-collections.xml, /sitemap-events.xml

  try {
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/explore", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.8", changefreq: "daily" },
      { loc: "/terms", priority: "0.2", changefreq: "yearly" },
    ];

    const now = new Date();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    for (const page of staticPages) {
      xml += `  <url>
    <loc>${escapeXml(`${SITE_URL}${page.loc}`)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    if (buildings) {
      for (const b of buildings) {
        const lastmod = formatLastmod(b.updated_at);
        const loc = `${SITE_URL}/building/${b.short_id}/${b.slug}`;
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

          imageBlock = `
    <image:image>
      <image:loc>${escapeXml(imgUrl)}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
      <image:caption>${escapeXml(caption)}</image:caption>
    </image:image>`;
        }

        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>${imageBlock}
  </url>
`;
      }
    }

    if (people) {
      for (const row of people) {
        const lastmod = formatLastmod(row.updated_at ?? undefined);
        const loc = `${SITE_URL}/person/${row.slug}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    if (companies) {
      for (const row of companies) {
        const lastmod = formatLastmod(row.updated_at ?? undefined);
        const loc = `${SITE_URL}/company/${row.slug}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    if (profiles) {
      for (const p of profiles) {
        const lastmod = formatLastmod(p.updated_at ?? undefined);
        const loc = `${SITE_URL}/profile/${p.username}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.4</priority>
  </url>
`;
      }
    }

    if (collections) {
      for (const c of collections) {
        const lastmod = formatLastmod(c.updated_at);
        const loc = `${SITE_URL}/collection/${c.slug}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    if (events) {
      for (const e of events) {
        const lastmod = formatLastmod(e.updated_at);
        const loc = `${SITE_URL}/events/${e.slug}`;
        const endAt = e.end_at ? new Date(e.end_at) : null;
        const startAt = new Date(e.start_at);
        const isUpcoming = startAt > now || (endAt !== null && endAt > now);
        const changefreq = isUpcoming ? "daily" : "never";
        const priority = isUpcoming ? "0.8" : "0.4";
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>
`;
      }
    }

    if (localities) {
      for (const loc of localities) {
        const lastmod = formatLastmod(loc.updated_at);
        const url = `${SITE_URL}/city/${loc.slug}`;
        xml += `  <url>
    <loc>${escapeXml(url)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    const body = new TextEncoder().encode(xml);
    const totalUrls =
      staticPages.length +
      (buildings?.length ?? 0) +
      (people?.length ?? 0) +
      (companies?.length ?? 0) +
      (profiles?.length ?? 0) +
      (collections?.length ?? 0) +
      (events?.length ?? 0) +
      (localities?.length ?? 0);
    console.log(`sitemap: total_urls=${totalUrls} xml_bytes=${body.length}`);

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("sitemap: response assembly failed", e);
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
});
