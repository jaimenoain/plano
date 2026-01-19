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

  if (req.method === "OPTIONS") {
    const headers = { ...corsHeaders };
    if (isAllowed) {
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

  const responseHeaders = { ...corsHeaders, "Access-Control-Allow-Origin": origin };

  try {
    const { query, type = "movie", filters } = await req.json();
    const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

    if (!TMDB_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured" }),
        { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper to fetch from TMDB
    const fetchTMDB = async (url: string) => {
      const res = await fetch(url);
      return res.json();
    };

    if (type === "discover_movie" || type === "discover_tv") {
      const mediaType = type === "discover_tv" ? "tv" : "movie";
      const baseUrl = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&include_adult=false&sort_by=popularity.desc&page=1`;
      
      let baseParams = "";
      
      // Common filters (Genres, People, Country)
      if (filters) {
        if (filters.genres && filters.genres.length > 0) {
          baseParams += `&with_genres=${filters.genres.join("|")}`;
        }
        if (filters.people && filters.people.length > 0) {
          baseParams += `&with_people=${filters.people.join(",")}`;
        }
        if (filters.country) {
          const countryParam = Array.isArray(filters.country) 
            ? filters.country.join("|") 
            : filters.country;
          baseParams += `&with_origin_country=${countryParam}`;
        }

        // Availability Filters
        if (filters.watch_region) {
          baseParams += `&watch_region=${filters.watch_region}`;
        }
        if (filters.watch_providers && filters.watch_providers.length > 0) {
          baseParams += `&with_watch_providers=${filters.watch_providers.join("|")}`;
        }
        if (filters.watch_monetization_types && filters.watch_monetization_types.length > 0) {
          baseParams += `&with_watch_monetization_types=${filters.watch_monetization_types.join("|")}`;
        }
      }

      // Handle Multiple Ranges (Decades/Runtimes) logic
      // We must fetch each combination separately and merge results because TMDB doesn't support "OR" for ranges.
      
      const dateRanges = (filters.dates && filters.dates.length > 0) ? filters.dates : [null];
      const runtimeRanges = (filters.runtimes && filters.runtimes.length > 0) ? filters.runtimes : [null];
      
      const promises = [];

      for (const dateRange of dateRanges) {
        for (const runtimeRange of runtimeRanges) {
           let url = baseUrl + baseParams;

           // Apply Date Range
           if (dateRange) {
             const dateField = mediaType === "tv" ? "first_air_date" : "primary_release_date";
             if (dateRange.gte) url += `&${dateField}.gte=${dateRange.gte}`;
             if (dateRange.lte) url += `&${dateField}.lte=${dateRange.lte}`;
           }

           // Apply Runtime Range
           if (runtimeRange) {
             if (runtimeRange.gte) url += `&with_runtime.gte=${runtimeRange.gte}`;
             if (runtimeRange.lte) url += `&with_runtime.lte=${runtimeRange.lte}`;
           }
           
           promises.push(fetchTMDB(url));
        }
      }

      // Execute all queries in parallel
      const resultsArray = await Promise.all(promises);
      
      // Merge and Deduplicate Results
      const allResultsMap = new Map();
      resultsArray.forEach(data => {
        if (data.results) {
          data.results.forEach((item: any) => {
            if (!allResultsMap.has(item.id)) {
              allResultsMap.set(item.id, item);
            }
          });
        }
      });

      // Convert back to array and Sort by Popularity
      const mergedResults = Array.from(allResultsMap.values())
        .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20); // Return top 20

      return new Response(
        JSON.stringify({ results: mergedResults }),
        { headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );

    } else {
      // Standard Text Search
      if (!query) {
        return new Response(
          JSON.stringify({ error: "Query is required for search mode" }),
          { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
        );
      }
      const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`;
      const data = await fetchTMDB(url);

      return new Response(
        JSON.stringify(data),
        { headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...responseHeaders, "Content-Type": "application/json" } }
    );
  }
});
