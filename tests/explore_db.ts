
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Exploring DB...");

  // Check films
  const { data: films, error: fe } = await supabase.from("films").select("*").limit(1);
  if (fe) console.error("Error fetching films:", fe.message);
  else console.log("Films table exists. Row 1:", films[0]);

  // Check RPCs
  // We can't list RPCs easily via client, but we can try to call them.
  console.log("Checking merge_buildings...");
  const { error: me } = await supabase.rpc("merge_buildings", { master_id: "00000000-0000-0000-0000-000000000000", duplicate_id: "00000000-0000-0000-0000-000000000000" });
  console.log("merge_buildings result:", me ? me.message : "Success (void)");

  console.log("Checking merge_films...");
  const { error: mfe } = await supabase.rpc("merge_films", { master_id: "00000000-0000-0000-0000-000000000000", duplicate_id: "00000000-0000-0000-0000-000000000000" });
  console.log("merge_films result:", mfe ? mfe.message : "Success (void)");
}

main();
