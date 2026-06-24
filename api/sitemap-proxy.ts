/**
 * Vercel Edge Function — Sitemap Proxy
 *
 * Injects the SITEMAP_INTERNAL_TOKEN secret as an x-sitemap-token header
 * before proxying sitemap requests to the Supabase Edge Function. Vercel's
 * native rewrites config cannot inject headers into proxied requests, so
 * this thin wrapper is required.
 *
 * Setup:
 *   1. Generate a token:  openssl rand -hex 32
 *   2. Add SITEMAP_INTERNAL_TOKEN to Vercel project environment variables.
 *   3. Add the same value as a Supabase secret:
 *        supabase secrets set SITEMAP_INTERNAL_TOKEN=<value>
 */

export const runtime = "edge";

const SUPABASE_SITEMAP_URL =
  "https://lnqxtomyucnnrgeapnzt.supabase.co/functions/v1/sitemap";

export default async function handler(request: Request): Promise<Response> {
  const incomingUrl = new URL(request.url);
  const type = incomingUrl.searchParams.get("type");

  const upstreamUrl = new URL(SUPABASE_SITEMAP_URL);
  if (type) {
    upstreamUrl.searchParams.set("type", type);
  }

  const token = process.env.SITEMAP_INTERNAL_TOKEN ?? "";

  // Bound the upstream call so a slow/wedged Supabase Edge Function can't hang
  // this proxy (and tie up serverless capacity on crawler traffic) up to the
  // platform limit. 10s is generous for a sitemap render; past that, 504.
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        "x-sitemap-token": token,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response("Sitemap upstream timed out", {
      status: 504,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // Forward the XML body and relevant headers back to the client unchanged.
  const contentType =
    upstreamResponse.headers.get("Content-Type") ??
    "application/xml; charset=utf-8";
  const cacheControl =
    upstreamResponse.headers.get("Cache-Control") ??
    "public, max-age=3600, s-maxage=3600";

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
    },
  });
}
