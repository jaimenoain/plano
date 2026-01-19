import { createClient } from "@supabase/supabase-js";

// Retrieve keys from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Missing credentials.");
  console.error("Run the script like this:");
  console.error('SUPABASE_URL="https://..." SUPABASE_SERVICE_KEY="ey..." npx tsx backfill-trailers.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function backfillTrailers() {
  console.log("🚀 Starting trailer backfill process...");

  // 1. Fetch films that are missing trailer data
  const { data: films, error } = await supabase
    .from("films")
    .select("id, tmdb_id, media_type, title")
    .or("trailer.is.null,trailer.eq.");

  if (error) {
    console.error("❌ Error fetching films:", error);
    return;
  }

  console.log(`📊 Found ${films ? films.length : 0} films to update.`);
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

    try {
      // Call existing Edge Function
      const { data: tmdbData, error: fnError } = await supabase.functions.invoke("tmdb-movie", {
        body: { movieId: film.tmdb_id, type: film.media_type || "movie" },
      });

      // DEBUG: Log the full response body for the first movie
      if (successCount + errorCount + skipCount === 0) {
        console.log(`\n🐛 DEBUG: Response analysis for first movie "${film.title}":`);
        console.log("Keys:", Object.keys(tmdbData || {}));
        if (tmdbData?.videos) {
            console.log("Videos found:", tmdbData.videos.results?.length || 0);
        } else {
            console.warn("⚠️ 'videos' key is MISSING in TMDB response!");
            console.log("Full response dump:", JSON.stringify(tmdbData, null, 2));
        }
        console.log("--------------------------------------------------\n");
      }

      if (fnError || !tmdbData) {
        console.error(`❌ Failed to fetch TMDB data for "${film.title}"`);
        if (fnError) console.error("Function Error:", fnError);
        errorCount++;
        continue;
      }

      // Extract best trailer
      const videos = tmdbData.videos?.results || [];

      const getBestTrailer = (vids: any[]) => {
        // Case-insensitive check for YouTube
        const youtubeVideos = vids.filter((v: any) => v.site?.toLowerCase() === "youtube");
        const typePriority = ["trailer", "teaser", "clip"];

        for (const type of typePriority) {
          // Case-insensitive check for Type
          const match = youtubeVideos.find((v: any) => v.type?.toLowerCase() === type);
          if (match) return match;
        }
        return null;
      };

      const trailer = getBestTrailer(videos);

      if (!trailer) {
          console.log(`⚠️ No trailer/teaser found for "${film.title}"`);
          if (videos.length > 0) {
             console.log(`   ℹ️ Available videos: ${videos.map((v:any) => `${v.site} (${v.type})`).join(", ")}`);
          }
          // Leaving the field NULL so it might be picked up later if added,
          // or we can run a separate cleanup later if we want to mark "no trailer".
          skipCount++;
          continue;
      }

      const trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;

      // Update the film record
      const { error: updateError } = await supabase
        .from("films")
        .update({ trailer: trailerUrl })
        .eq("id", film.id);

      if (updateError) {
        console.error(`❌ DB Update failed for "${film.title}":`, updateError.message);
        errorCount++;
      } else {
        console.log(`✅ Updated "${film.title}" [${trailerUrl}]`);
        successCount++;
      }

    } catch (err) {
      console.error(`🔥 Unexpected error for "${film.title}"`, err);
      errorCount++;
    }

    // Rate Limiting
    await sleep(250);
  }

  console.log("\n🏁 Backfill Complete!");
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️ Skipped: ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
}

backfillTrailers();
