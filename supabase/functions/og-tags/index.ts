import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "text/html; charset=utf-8",
};

const SITE_URL = "https://plano.app";
const DEFAULT_IMAGE = `${SITE_URL}/cover.jpg`;
const DEFAULT_TITLE = "Plano — The world's architecture, cataloged.";
const DEFAULT_DESCRIPTION =
  "Track your architecture visits, rate buildings, and discover what friends are exploring.";

function storagePublicBase(): string {
  const fromEnv = Deno.env.get("STORAGE_PUBLIC_URL")?.replace(/\/$/, "");
  return fromEnv ?? "https://s3.eu-west-2.amazonaws.com/plano.app";
}

function absoluteHeroImage(hero: string | null | undefined): string {
  if (!hero?.trim()) return DEFAULT_IMAGE;
  const t = hero.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (t.startsWith("/")) return `${SITE_URL}${t}`;
  const base = storagePublicBase();
  return `${base}/${t.replace(/^\//, "")}`;
}

function renderOgHtml({
  title,
  description,
  image,
  url,
  type = "website",
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(url)}" />
  <meta property="og:type" content="${escapeHtml(type)}" />
  <meta property="og:site_name" content="Plano" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="${escapeHtml(url)}" />
</head>
<body>
  <p><a href="${escapeHtml(url)}">${escapeHtml(title)}</a> — Plano</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "/";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    // /architecture/:cc/:city/:id/:slug  (new building path)
    // /architecture/:cc/:city/:id        (slug-less canonical redirect path)
    const archBuildingMatch = path.match(/^\/architecture\/([^/]+)\/([^/]+)\/(\d+)(?:\/([^/]+))?/);
    if (archBuildingMatch) {
      const shortId = parseInt(archBuildingMatch[3], 10);
      const { data: building } = await supabase
        .from("buildings")
        .select("name, city, country, year_completed, hero_image_url, slug, short_id, locality:localities(country_code, city_slug)")
        .eq("short_id", shortId)
        .maybeSingle();

      if (building) {
        const title = `${building.name}${building.city ? ` — ${building.city}` : ""}${
          building.year_completed ? ` (${building.year_completed})` : ""
        }`;
        const description = `Discover ${building.name}${
          building.city ? ` in ${building.city}` : ""
        }${building.country ? `, ${building.country}` : ""} on Plano.`;
        const image = absoluteHeroImage(building.hero_image_url);
        const loc = building.locality as { country_code: string; city_slug: string } | null;
        const canonicalUrl = loc
          ? `${SITE_URL}/architecture/${loc.country_code.toLowerCase()}/${loc.city_slug}/${building.short_id}${building.slug ? `/${building.slug}` : ""}`
          : `${SITE_URL}/building/${building.short_id}${building.slug ? `/${building.slug}` : ""}`;

        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }

      return new Response(
        renderOgHtml({
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          image: DEFAULT_IMAGE,
          url: `${SITE_URL}/`,
        }),
        { headers: corsHeaders },
      );
    }

    // /architecture/:cc/:city  (locality page)
    const archLocalityMatch = path.match(/^\/architecture\/([^/]+)\/([^/]+)$/);
    if (archLocalityMatch) {
      const cc = archLocalityMatch[1];
      const citySlug = archLocalityMatch[2];
      const { data: locality } = await supabase
        .from("localities")
        .select("city, country, country_code, city_slug, buildings_count, hero_image_url, meta_title, meta_description")
        .eq("country_code", cc.toUpperCase())
        .eq("city_slug", citySlug)
        .maybeSingle();

      if (locality) {
        const title = locality.meta_title || `Architecture in ${locality.city}, ${locality.country} — Plano`;
        const description = locality.meta_description || `Explore architecture in ${locality.city}. Discover ${locality.buildings_count} buildings on Plano.`;
        const image = absoluteHeroImage(locality.hero_image_url);
        const canonicalUrl = `${SITE_URL}/architecture/${locality.country_code.toLowerCase()}/${locality.city_slug}`;
        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }
    }

    // /architecture/:cc  (country page)
    const archCountryMatch = path.match(/^\/architecture\/([^/]+)$/);
    if (archCountryMatch) {
      const cc = archCountryMatch[1];
      const { data: localities } = await supabase
        .from("localities")
        .select("city, country, country_code, buildings_count, hero_image_url")
        .eq("country_code", cc.toUpperCase())
        .gt("buildings_count", 0)
        .order("buildings_count", { ascending: false });

      if (localities && localities.length > 0) {
        const countryName = localities[0].country;
        const totalBuildings = localities.reduce((sum: number, l: { buildings_count: number }) => sum + (l.buildings_count || 0), 0);
        const title = `Architecture in ${countryName} — Plano`;
        const description = `Explore ${totalBuildings} buildings across ${localities.length} cities in ${countryName} on Plano.`;
        const image = absoluteHeroImage(localities[0].hero_image_url);
        const canonicalUrl = `${SITE_URL}/architecture/${cc.toLowerCase()}`;
        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }
    }

    // /events/:cc/:city/:slug  (location-scoped event)
    const archEventMatch = path.match(/^\/events\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (archEventMatch) {
      const eventSlug = archEventMatch[3];
      const { data: event } = await supabase
        .from("events")
        .select("title, description, slug, cover_image_url, country_code, city_slug")
        .eq("slug", eventSlug)
        .maybeSingle();

      if (event) {
        const title = `${event.title} — Plano`;
        const description = event.description
          ? event.description.slice(0, 160)
          : `Join ${event.title} on Plano.`;
        const image = absoluteHeroImage(event.cover_image_url);
        const canonicalUrl = event.country_code && event.city_slug
          ? `${SITE_URL}/events/${event.country_code.toLowerCase()}/${event.city_slug}/${event.slug}`
          : `${SITE_URL}/events/${event.slug}`;
        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }
    }

    // /events/:slug  (virtual/online event — no location params)
    const virtualEventMatch = path.match(/^\/events\/([^/]+)$/);
    if (virtualEventMatch) {
      const eventSlug = virtualEventMatch[1];
      const { data: event } = await supabase
        .from("events")
        .select("title, description, slug, cover_image_url, country_code, city_slug")
        .eq("slug", eventSlug)
        .maybeSingle();

      if (event) {
        const title = `${event.title} — Plano`;
        const description = event.description
          ? event.description.slice(0, 160)
          : `Join ${event.title} on Plano.`;
        const image = absoluteHeroImage(event.cover_image_url);
        const canonicalUrl = event.country_code && event.city_slug
          ? `${SITE_URL}/events/${event.country_code.toLowerCase()}/${event.city_slug}/${event.slug}`
          : `${SITE_URL}/events/${event.slug}`;
        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }
    }

    // Legacy: /building/:id/:slug
    const buildingMatch = path.match(/^\/building\/(\d+)(?:\/([^/]+))?/);
    if (buildingMatch) {
      const shortId = parseInt(buildingMatch[1], 10);
      const { data: building } = await supabase
        .from("buildings")
        .select("name, city, country, year_completed, hero_image_url, slug, short_id, locality:localities(country_code, city_slug)")
        .eq("short_id", shortId)
        .maybeSingle();

      if (building) {
        const title = `${building.name}${building.city ? ` — ${building.city}` : ""}${
          building.year_completed ? ` (${building.year_completed})` : ""
        }`;
        const description = `Discover ${building.name}${
          building.city ? ` in ${building.city}` : ""
        }${building.country ? `, ${building.country}` : ""} on Plano.`;
        const image = absoluteHeroImage(building.hero_image_url);
        const loc = building.locality as { country_code: string; city_slug: string } | null;
        const canonicalUrl = loc
          ? `${SITE_URL}/architecture/${loc.country_code.toLowerCase()}/${loc.city_slug}/${building.short_id}${building.slug ? `/${building.slug}` : ""}`
          : `${SITE_URL}/building/${building.short_id}${building.slug ? `/${building.slug}` : ""}`;

        return new Response(
          renderOgHtml({ title, description, image, url: canonicalUrl }),
          { headers: corsHeaders },
        );
      }

      return new Response(
        renderOgHtml({
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          image: DEFAULT_IMAGE,
          url: `${SITE_URL}/`,
        }),
        { headers: corsHeaders },
      );
    }

    // Legacy share URLs: /architect/:uuid → app 301s to /person/:slug or /company/:slug (same UUID as migrated rows).
    const architectMatch = path.match(/^\/architect\/([^/]+)/);
    if (architectMatch) {
      const entityId = architectMatch[1];
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRe.test(entityId)) {
        const { data: person } = await supabase
          .from("people")
          .select("name, slug")
          .eq("id", entityId)
          .maybeSingle();
        if (person?.slug) {
          const canonicalUrl = `${SITE_URL}/person/${person.slug}`;
          const title = `${person.name} — Plano`;
          const description = `Explore buildings credited to ${person.name} on Plano.`;
          return new Response(
            renderOgHtml({ title, description, image: DEFAULT_IMAGE, url: canonicalUrl }),
            { headers: corsHeaders },
          );
        }
        const { data: company } = await supabase
          .from("companies")
          .select("name, slug")
          .eq("id", entityId)
          .maybeSingle();
        if (company?.slug) {
          const canonicalUrl = `${SITE_URL}/company/${company.slug}`;
          const title = `${company.name} — Plano`;
          const description = `Explore buildings credited to ${company.name} on Plano.`;
          return new Response(
            renderOgHtml({ title, description, image: DEFAULT_IMAGE, url: canonicalUrl }),
            { headers: corsHeaders },
          );
        }
      }
    }

    const profileMatch = path.match(/^\/profile\/([^/]+)/);
    if (profileMatch) {
      const username = profileMatch[1];
      if (username !== "photos") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, bio, avatar_url")
          .eq("username", username)
          .maybeSingle();

        if (profile) {
          const title = `${profile.username} on Plano`;
          const description =
            profile.bio || `See what ${profile.username} is discovering on Plano.`;
          const image = absoluteHeroImage(profile.avatar_url);
          return new Response(
            renderOgHtml({
              title,
              description,
              image,
              url: `${SITE_URL}/profile/${username}`,
            }),
            { headers: corsHeaders },
          );
        }
      }
    }

    return new Response(
      renderOgHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        url: `${SITE_URL}${path === "/" ? "" : path}`,
      }),
      { headers: corsHeaders },
    );
  } catch {
    return new Response(
      renderOgHtml({
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        image: DEFAULT_IMAGE,
        url: `${SITE_URL}${path === "/" ? "" : path}`,
      }),
      { headers: corsHeaders },
    );
  }
});
