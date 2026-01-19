import { createClient } from "@supabase/supabase-js";

// Retrieve keys from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Missing credentials.");
  console.error("Run the script like this:");
  console.error('SUPABASE_URL="https://..." SUPABASE_SERVICE_KEY="ey..." npx tsx backfill-availability.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 🎯 We only backfill these countries to keep the DB size manageable
const TARGET_COUNTRIES = ["ES", "GB"]; 

async function backfillAvailability() {
  console.log("🚀 Starting availability backfill process...");

  // 1. Fetch all films
  // We need TMDB ID to ask the API, and ID to update our DB
  const { data: films, error } = await supabase
    .from("films")
    .select("id, tmdb_id, media_type, title");

  if (error) {
    console.error("❌ Error fetching films:", error);
    return;
  }

  console.log(`📊 Found ${films ? films.length : 0} films in database.`);
  if (!films || films.length === 0) return;

  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  // 2. Iterate and Update
  for (const film of films) {
    if (!film.tmdb_id) {
        console.log(`⏭️ Skipping "${film.title}" (No TMDB ID)`);
        skipCount++;
        continue;
    }

    // Check if we already have data for this film to allow resuming if script stops
    // We check if *any* availability data exists for this film
    const { data: existing } = await supabase
        .from("film_availability")
        .select("id")
        .eq("film_id", film.id)
        .limit(1);
    
    if (existing && existing.length > 0) {
        // Optional: Comment this out if you want to force-update everything
        process.stdout.write("."); // Compact progress dot for skips
        skipCount++;
        continue; 
    }

    console.log(`\n🔄 Processing "${film.title}"...`);

    try {
      // Call your existing Edge Function
      // This function returns providers for ALL regions, so we only need to call it once per film
      const { data: tmdbData, error: fnError } = await supabase.functions.invoke("tmdb-providers", {
        body: { tmdbId: film.tmdb_id, type: film.media_type || "movie" },
      });

      if (fnError || !tmdbData || !tmdbData.results) {
        console.error(`❌ Failed to fetch TMDB data for "${film.title}"`);
        errorCount++;
        continue;
      }

      // Loop through our target countries and save data for each
      let updatesForFilm = 0;
      for (const country of TARGET_COUNTRIES) {
          const results = tmdbData.results[country];
          
          // Even if results are empty (undefined), we save empty arrays
          // This prevents the UI from trying to re-fetch it later
          const stream = results?.flatrate || [];
          const rent = results?.rent || [];
          const buy = results?.buy || [];

          const { error: upsertError } = await supabase
            .from("film_availability")
            .upsert({
                film_id: film.id,
                country_code: country,
                stream,
                rent,
                buy,
                last_updated: new Date().toISOString()
            }, { onConflict: 'film_id, country_code' });

          if (upsertError) {
              console.error(`  ❌ Failed to save ${country}:`, upsertError.message);
              errorCount++;
          } else {
              updatesForFilm++;
          }
      }

      if (updatesForFilm > 0) {
          console.log(`  ✅ Saved availability for ${updatesForFilm} countries.`);
          successCount++;
      }

    } catch (err) {
      console.error(`🔥 Unexpected error for "${film.title}"`, err);
      errorCount++;
    }

    // Rate Limiting (250ms delay to be safe with TMDB API limits)
    await sleep(250);
  }

  console.log("\n\n🏁 Backfill Complete!");
  console.log(`✅ Processed: ${successCount}`);
  console.log(`⏭️ Skipped (Already existed): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

backfillAvailability();
