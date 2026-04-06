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

  let architectIdsWithProfile = new Set<string>();
  try {
    const { data: verifiedLinks, error: verifiedErr } = await supabase
      .from("profiles")
      .select("verified_architect_id")
      .not("verified_architect_id", "is", null);
    if (verifiedErr) {
      console.error("sitemap: verified_architect_id query error", verifiedErr.message);
    } else {
      architectIdsWithProfile = new Set(
        (verifiedLinks ?? [])
          .map((row) => row.verified_architect_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      );
    }
  } catch (e) {
    console.error("sitemap: verified_architect_id query exception", e);
  }

  let buildings: { short_id: string; slug: string; updated_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("buildings")
      .select("short_id, slug, updated_at")
      .eq("is_deleted", false)
      .not("slug", "is", null)
      .not("short_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10000);
    if (error) {
      console.error("sitemap: buildings query error", error.message);
    } else {
      buildings = data;
    }
  } catch (e) {
    console.error("sitemap: buildings query exception", e);
  }

  let architects: { id: string; created_at: string | null }[] | null = null;
  try {
    const { data, error } = await supabase
      .from("architects")
      .select("id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("sitemap: architects query error", error.message);
    } else {
      architects = data;
    }
  } catch (e) {
    console.error("sitemap: architects query exception", e);
  }

  // Public profile URLs (includes users with verified_architect_id — canonical is /profile/:username, not /architect/:id).
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

  try {
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
        const lastmod = formatLastmod(b.updated_at);
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
        if (architectIdsWithProfile.has(a.id)) continue;
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

    const body = new TextEncoder().encode(xml);
    console.log(`sitemap: xml_bytes=${body.length}`);

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
