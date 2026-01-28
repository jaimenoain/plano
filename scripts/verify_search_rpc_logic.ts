
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySearchRpc() {
  console.log('Verifying search_buildings RPC...');

  // 1. Test Empty Filter (Should return results)
  const { data: allBuildings, error: error1 } = await supabase.rpc('search_buildings', {
    filters: {}
  });

  if (error1) {
    console.error('Error fetching all buildings:', error1);
  } else {
    console.log(`Fetched ${allBuildings?.length} buildings (no filters).`);
  }

  // 2. Test Architect Filter (UUIDs)
  // Replace with a valid Architect UUID from your DB if known, or pick one from allBuildings if available
  const sampleArchitect = allBuildings?.[0]?.architects?.[0]?.id;
  if (sampleArchitect) {
    console.log(`Testing Architect Filter with ID: ${sampleArchitect}`);
    const { data: archBuildings, error: error2 } = await supabase.rpc('search_buildings', {
      filters: {
        architects: [sampleArchitect] // Array of UUIDs
      }
    });

    if (error2) {
      console.error('Error filtering by architect:', error2);
    } else {
      console.log(`Fetched ${archBuildings?.length} buildings for architect ${sampleArchitect}.`);
      // Verification: Check if returned buildings actually have the architect
      const invalid = archBuildings?.some(b => !b.architects.some((a: any) => a.id === sampleArchitect));
      if (invalid) {
        console.error('FAILED: Found building without the requested architect.');
      } else {
        console.log('PASSED: All buildings have the requested architect.');
      }
    }
  }

  // 3. Test Category Filter (UUIDs)
  // Requires knowing a valid category ID.
  // We can try to guess or skip if we don't have one.
  console.log('Testing Category Filter (Mock UUID)...');
  const mockCategoryId = '00000000-0000-0000-0000-000000000000'; // Likely to return 0
  const { data: catBuildings, error: error3 } = await supabase.rpc('search_buildings', {
    filters: {
      category_ids: [mockCategoryId]
    }
  });

  if (error3) {
     // If the RPC hasn't been updated yet to accept category_ids, this might fail or ignore it.
    console.error('Error filtering by category:', error3);
  } else {
    console.log(`Fetched ${catBuildings?.length} buildings for category ${mockCategoryId} (Expected 0).`);
  }

  // 4. Test Text Search (Name/Address)
  const searchTerm = 'House';
  console.log(`Testing Text Search: "${searchTerm}"`);
  const { data: textBuildings, error: error4 } = await supabase.rpc('search_buildings', {
    query_text: searchTerm
  });

  if (error4) {
    console.error('Error searching text:', error4);
  } else {
    console.log(`Fetched ${textBuildings?.length} buildings matching "${searchTerm}".`);
  }

  console.log('Verification Complete.');
}

verifySearchRpc().catch(console.error);
