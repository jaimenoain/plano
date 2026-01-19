// Force update: Attempt 1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "https://gptengineer.app",
  "https://lovable.dev",
  "https://lovable.app",
  // Add your production domain here
];

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (req.method === "OPTIONS") {
    const headers = { ...corsHeaders };
    if (isAllowed && origin) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { headers });
  }

  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: "Unauthorized Origin" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const responseHeaders = { ...corsHeaders };
  if (origin) {
    responseHeaders["Access-Control-Allow-Origin"] = origin;
  }

  try {
    const { movieId, type = "movie" } = await req.json();
    
    if (!movieId) {
      return new Response(
        JSON.stringify({ error: "Movie ID is required" }),
        { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");
    if (!TMDB_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured" }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.themoviedb.org/3/${type}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids,watch/providers,videos`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        // Forward the specific error from TMDB (e.g., 401 Invalid Key, or 404 Not Found)
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
