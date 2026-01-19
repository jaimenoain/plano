// Force update: Attempt 1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://gptengineer.app",
  "https://lovable.dev",
  "https://lovable.app",
  "https://cineforum.eu",
  "https://www.cineforum.eu",
];

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const isAllowed = origin && allowedOrigins.includes(origin);

  // Handle CORS Preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
    const headers = { ...corsHeaders };
    if (isAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { headers });
  }

  // Reject unauthorized origins
  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: "Unauthorized Origin" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const responseHeaders = { ...corsHeaders, "Access-Control-Allow-Origin": origin };

  try {
    const { tmdbId, type = "movie", watch_region } = await req.json();

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured" }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    let url;
    if (watch_region && !tmdbId) {
      // Fetch all providers for the region
      url = `https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_API_KEY}&watch_region=${watch_region}&language=en-US`;
    } else {
      // Fetch providers for a specific movie/tv
      if (!tmdbId) {
        return new Response(
          JSON.stringify({ error: "TMDB ID is required when not fetching all providers" }),
          { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
        );
      }
      url = `https://api.themoviedb.org/3/${type}/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        return new Response(
            JSON.stringify(data),
            { status: response.status, headers: { ...responseHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...responseHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
    );
  }
});
