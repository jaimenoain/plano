import { createClient } from "@supabase/supabase-js";

// Retrieve keys from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Missing credentials.");
  console.error("Run the script like this:");
  console.error('SUPABASE_URL="https://..." SUPABASE_SERVICE_KEY="ey..." npx tsx backfill-countries.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillCountries() {
  console.log("🚀 Starting backfill process...");

  // 1. Fetch films that are missing country data
  const { data: films, error } = await supabase
    .from("films")
    .select("id, tmdb_id, media_type, title")
    .or("countries.is.null,countries.eq.[]");

  if (error) {
    console.error("❌ Error fetching films:", error);
    return;
  }

  console.log(`📊 Found ${films ? films.length : 0} films to update.`);
  if (!films || films.length === 0) return;

  let successCount = 0;
  let errorCount = 0;

  // 2. Iterate and Update
  for (const film of films) {
    if (!film.tmdb_id) {
        console.log(`⏭️ Skipping "${film.title}" (No TMDB ID)`);
        continue;
    }

    try {
      // Call existing Edge Function
      const { data: tmdbData, error: fnError } = await supabase.functions.invoke("tmdb-movie", {
        body: { movieId: film.tmdb_id, type: film.media_type || "movie" },
      });

      if (fnError || !tmdbData) {
        console.error(`❌ Failed to fetch TMDB data for "${film.title}"`);
        errorCount++;
        continue;
      }

      // Extract countries and ensure simple String Array format ["ES", "US"]
      const countryCodes = tmdbData.production_countries?.map((c: any) => c.iso_3166_1) || [];

      // Update the film record
      const { error: updateError } = await supabase
        .from("films")
        .update({ countries: countryCodes })
        .eq("id", film.id);

      if (updateError) {
        console.error(`❌ DB Update failed for "${film.title}":`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ Updated "${film.title}" [${countryCodes.join(", ")}]`);
        successCount++;
      }

    } catch (err) {
      console.error(`🔥 Unexpected error for "${film.title}"`, err);
      errorCount++;
    }

    // Rate Limiting
    await sleep(200);
  }

  console.log("\n🏁 Backfill Complete!");
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

backfillCountries();
