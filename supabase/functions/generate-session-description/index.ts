
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
  const isAllowed = origin && allowedOrigins.includes(origin);

  if (req.method === "OPTIONS") {
    const headers = { ...corsHeaders };
    if (isAllowed) {
      headers["Access-Control-Allow-Origin"] = origin;
    }
    return new Response(null, { headers });
  }

  // if (!isAllowed) {
  //   return new Response(
  //     JSON.stringify({ error: "Unauthorized Origin" }),
  //     { status: 403, headers: { "Content-Type": "application/json" } }
  //   );
  // }

  const responseHeaders = { ...corsHeaders, "Access-Control-Allow-Origin": origin || "*" };

  try {
    const { films } = await req.json();

    if (!films || !Array.isArray(films) || films.length === 0) {
      return new Response(
        JSON.stringify({ error: "No films provided" }),
        { status: 400, headers: { ...responseHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- MOCK GENERATION LOGIC ---
    // In a real implementation, you would use the OpenAI API here.
    // const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    // ... call OpenAI with a prompt including the film details ...

    const titles = films.map((f: any) => f.title || f.name).join(" and ");

    // Create a mock "generated" description
    let description = "";
    if (films.length === 1) {
        description = `Join us for a special screening of ${titles}. This film is a masterpiece of its genre, offering a unique perspective that is sure to spark conversation. Don't miss this opportunity to experience it on the big screen with fellow cinema lovers!`;
    } else {
        description = `Get ready for an incredible double feature! We're showing ${titles}. These films share a thematic connection that explores deep narratives and stunning visuals. It's going to be a night of cinematic magic you won't want to miss.`;
    }

    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 1500));

    return new Response(
      JSON.stringify({ description }),
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
