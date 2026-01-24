import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Testing find_nearby_buildings RPC ---');
  console.log('NOTE: This script verifies the fix for find_nearby_buildings.');
  console.log('If the migration 20260526000000_fix_find_nearby_buildings_type.sql has not been applied, this script will fail with a type error.');

  // 1. First, search for ANY building to get a valid location
  console.log('Finding a reference building...');
  const { data: buildings, error: searchError } = await supabase
    .from('buildings')
    .select('id, name, location, address')
    .limit(1);

  if (searchError) {
    console.error('Error fetching building:', searchError);
    return;
  }

  if (!buildings || buildings.length === 0) {
    console.log('No buildings found in DB to test against.');
    return;
  }

  const refBuilding = buildings[0];
  console.log(`Reference Building: ${refBuilding.name} (${refBuilding.id})`);
  // location is usually returned as GeoJSON or similar depending on the driver, but here we might need to parse it if we were reading directly.
  // However, we need lat/long for the RPC.
  // We can't easily extract lat/long from the select output if it's a binary geometry.
  // So let's use the RPC to find it by name if possible, or just guess.
  // Actually, the RPC returns lat/long. Let's use the RPC to find *something*.

  // 2. Search blindly around London (default) to see if we find anything
  const londonLat = 51.5074;
  const londonLng = -0.1278;

  const { data: nearby, error: nearbyError } = await supabase.rpc('find_nearby_buildings', {
    lat: londonLat,
    long: londonLng,
    radius_meters: 5000000, // Huge radius to find SOMETHING
    name_query: ""
  });

  if (nearbyError) {
    console.error('RPC Error (Blind Search):', nearbyError);
    return;
  }

  if (!nearby || nearby.length === 0) {
     console.log('No buildings found via RPC even with huge radius.');
     return;
  }

  const target = nearby[0];
  console.log(`Target Building found: ${target.name} at [${target.location_lat}, ${target.location_lng}]`);
  console.log(`Address: ${target.address}`);

  // 3. Now simulate the "Add Building" check at the EXACT SAME location
  console.log('\n--- Simulating Duplicate Check (Exact Location) ---');
  const { data: locationCheck, error: locError } = await supabase.rpc('find_nearby_buildings', {
    lat: target.location_lat,
    long: target.location_lng,
    radius_meters: 50,
    name_query: ""
  });

  if (locError) console.error('Location Check Error:', locError);
  else {
    console.log(`Location Check Found: ${locationCheck.length} buildings`);
    locationCheck.forEach((b: any) => console.log(` - ${b.name} (${b.dist_meters}m)`));
  }

  // 4. Simulate Name Check (Same Name, Close Location)
  console.log('\n--- Simulating Name Check (Same Name, 50km radius) ---');
  const { data: nameCheck, error: nameError } = await supabase.rpc('find_nearby_buildings', {
    lat: target.location_lat,
    long: target.location_lng,
    radius_meters: 50000,
    name_query: target.name
  });

  if (nameError) console.error('Name Check Error:', nameError);
  else {
    console.log(`Name Check Found: ${nameCheck.length} buildings`);
    // Filter like frontend does
    const validNameMatches = nameCheck.filter((d: any) =>
        d.dist_meters <= 50 || target.name.length >= 3
    );
    console.log(`Filtered Matches (Frontend Logic): ${validNameMatches.length}`);
    validNameMatches.forEach((b: any) => console.log(` - ${b.name} (${b.dist_meters}m, score: ${b.similarity_score})`));
  }

}

main();
