import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://plano.app";

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

  try {
    const { data: buildings } = await supabase
      .from("buildings")
      .select("short_id, slug, created_at")
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .not("short_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(10000);

    const { data: architects } = await supabase
      .from("architects")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("username, updated_at")
      .not("username", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10000);

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/explore", priority: "0.9", changefreq: "daily" },
      { loc: "/search", priority: "0.8", changefreq: "daily" },
      { loc: "/terms", priority: "0.2", changefreq: "yearly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
        const lastmod = formatLastmod(b.created_at);
        const loc = `${SITE_URL}/building/${b.short_id}/${b.slug}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    if (architects) {
      for (const a of architects) {
        const lastmod = formatLastmod(a.created_at);
        const loc = `${SITE_URL}/architect/${a.id}`;
        xml += `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeXml(`${SITE_URL}/`)}</loc><priority>1.0</priority></url>
</urlset>`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      },
    );
  }
});
