
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manually if needed
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runTest() {
  console.log('Starting Backend Fuzzy Search Verification (RPC Only)...');

  // NYC
  const lat = 40.7484;
  const lng = -73.9857;
  const query = "Empire";

  console.log(`Calling RPC find_nearby_buildings with query "${query}"...`);

  const { data: searchResults, error: searchError } = await supabase.rpc('find_nearby_buildings', {
    lat: lat,
    long: lng,
    radius_meters: 50000,
    name_query: query
  });

  if (searchError) {
    console.error('Error calling RPC:', searchError);
    if (searchError.message && searchError.message.includes('function not found')) {
        console.error("CRITICAL: The RPC function 'find_nearby_buildings' does not exist on the backend.");
    }
    return;
  }

  console.log(`RPC Call Success. Found ${searchResults.length} results.`);
  console.log(searchResults);
}

runTest().catch(console.error);
