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
    const buildingMatch = path.match(/^\/building\/(\d+)(?:\/([^/]+))?/);
    if (buildingMatch) {
      const shortId = parseInt(buildingMatch[1], 10);
      const { data: building } = await supabase
        .from("buildings")
        .select("name, city, country, year_completed, hero_image_url, slug, short_id")
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
        const pathSuffix = building.slug ? `/${building.slug}` : "";
        const canonicalUrl = `${SITE_URL}/building/${building.short_id}${pathSuffix}`;

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

    const architectMatch = path.match(/^\/architect\/([^/]+)/);
    if (architectMatch) {
      const architectId = architectMatch[1];
      const { data: architect } = await supabase
        .from("architects")
        .select("name, type")
        .eq("id", architectId)
        .maybeSingle();

      if (architect) {
        const title = `${architect.name} — Architect on Plano`;
        const description = `Explore buildings by ${architect.name} on Plano.`;
        return new Response(
          renderOgHtml({
            title,
            description,
            image: DEFAULT_IMAGE,
            url: `${SITE_URL}/architect/${architectId}`,
          }),
          { headers: corsHeaders },
        );
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
