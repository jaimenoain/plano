import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/integrations/supabase/types';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

async function verifySearch() {
  console.log('--- Verifying Search RPC ---');

  // Check tables
  console.log('\n--- Checking Tables ---');
  const { error: buildingsError } = await supabase.from('buildings').select('*').limit(1);
  if (buildingsError) {
      console.log('❌ Table "buildings" access failed:', buildingsError.message);
  } else {
      console.log('✅ Table "buildings" exists.');
  }

  const { error: filmsError } = await supabase.from('films').select('*').limit(1);
  if (filmsError) {
      console.log('✅ Table "films" access failed (Good, should be gone):', filmsError.message);
  } else {
      console.log('❌ Table "films" EXISTS (Legacy table still present).');
  }

  // 1. Search for Architect
  console.log('\n1. Searching for Architect: "Zaha Hadid"');
  const { data: architectData, error: architectError } = await supabase.rpc('search_buildings', {
    query_text: 'Zaha Hadid',
    location_coordinates: { lat: 51.5074, lng: -0.1278 }, // London
    radius_meters: 5000000 // Large radius
  });

  if (architectError) {
    console.error('Error searching architect:', architectError);
  } else {
    console.log(`Found ${architectData?.length || 0} results.`);
    if (architectData && architectData.length > 0) {
      console.log('Sample result:', JSON.stringify(architectData[0], null, 2));
      // Check structure
      const first = architectData[0];
      if ('id' in first && 'name' in first && 'location_lat' in first) {
        console.log('✅ Structure verification passed.');
      } else {
        console.error('❌ Structure verification failed. Missing expected columns.');
      }

      // Check if it's not a movie
      // @ts-ignore
      if (first.overview || first.poster_path || first.title) {
          console.error('❌ Detected legacy movie fields! Migration failed?');
      } else {
          console.log('✅ No legacy movie fields detected.');
      }

    } else {
        console.log("⚠️ No results found for 'Zaha Hadid'.");
    }
  }

  // 2. Search for Style
  console.log('\n2. Searching for Style: "Brutalist"');

  // 2a. Text Query
  console.log('--- Text Query "Brutalist" ---');
  const { data: styleData, error: styleError } = await supabase.rpc('search_buildings', {
    query_text: 'Brutalist',
    location_coordinates: { lat: 51.5074, lng: -0.1278 },
    radius_meters: 5000000
  });

  if (styleError) {
    console.error('Error searching style (text):', styleError);
  } else {
    console.log(`Found ${styleData?.length || 0} results for text query 'Brutalist'.`);
  }

  // 2b. Filter
  console.log('--- Filter Query "Brutalist" ---');
  const { data: styleFilterData, error: styleFilterError } = await supabase.rpc('search_buildings', {
    location_coordinates: { lat: 51.5074, lng: -0.1278 },
    radius_meters: 5000000,
    filters: { styles: ['Brutalist'] }
  });

  if (styleFilterError) {
    console.error('Error searching style (filter):', styleFilterError);
  } else {
    console.log(`Found ${styleFilterData?.length || 0} results for style filter 'Brutalist'.`);
  }
}

verifySearch().catch(console.error);
