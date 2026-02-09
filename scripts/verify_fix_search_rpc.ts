import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
  console.log('Verifying fix for search_buildings RPC...');
  console.log('NOTE: This script assumes the migration "20270401000000_fix_search_buildings_rpc.sql" has been applied to the database.');

  // 1. Test Coordinate Signature (p_lat, p_lng)
  console.log('\n1. Testing Coordinate Signature (p_lat, p_lng)...');
  const { data: res1, error: err1 } = await supabase.rpc('search_buildings', {
    p_lat: 51.5074,
    p_lng: -0.1278,
    radius_meters: 5000,
    filters: {}
  });

  if (err1) {
    console.error('FAILED: Error calling RPC with p_lat/p_lng:', err1.message);
    if (err1.message.includes('function') && err1.message.includes('does not exist')) {
        console.error('  -> This confirms the migration has NOT been applied yet (old signature still active).');
    }
    // Also check for parameter mismatch
    if (err1.message.includes('argument') || err1.message.includes('signature')) {
        console.error('  -> Argument mismatch. Database expects old signature.');
    }
  } else {
    console.log(`PASSED: Successfully called RPC with p_lat/p_lng. Found ${res1?.length} buildings.`);
  }

  // 2. Test Architect Filter (architect_ids vs architects)
  console.log('\n2. Testing Architect Filter Compatibility...');
  // Use a dummy UUID if we don't have a real one.
  const dummyId = '00000000-0000-0000-0000-000000000000';

  const { data: res2, error: err2 } = await supabase.rpc('search_buildings', {
    filters: {
      architect_ids: [dummyId]
    }
  });

  if (err2) {
    console.error('FAILED: Error calling RPC with architect_ids:', err2.message);
  } else {
    console.log(`PASSED: Successfully called RPC with architect_ids. Found ${res2?.length} buildings (likely 0, but call succeeded).`);
  }

  // 3. Test Query Fallback (filters.query)
  console.log('\n3. Testing Search Query Fallback...');
  const { data: res3, error: err3 } = await supabase.rpc('search_buildings', {
    query_text: '', // Empty main argument
    filters: {
      query: 'House' // Fallback in filters
    }
  });

  if (err3) {
    console.error('FAILED: Error calling RPC with query fallback:', err3.message);
  } else {
    console.log(`PASSED: Successfully called RPC with query in filters. Found ${res3?.length} buildings.`);
    if (res3 && res3.length > 0) {
        console.log(`  -> First result name: ${res3[0].name}`);
    }
  }
}

verifyFix().catch(console.error);
