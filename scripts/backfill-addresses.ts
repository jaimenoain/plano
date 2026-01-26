import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !googleMapsKey) {
  console.error('❌ Missing credentials (SUPABASE_URL, SERVICE_KEY, or GOOGLE_MAPS_API_KEY) in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const BATCH_SIZE = 5;      // Process 5 items concurrently
const DELAY_MS = 250;      // Wait 250ms between batches to be nice to Google API

async function backfillAddresses() {
  console.log('🔄 Fetching buildings missing addresses...');

  // 1. Get buildings using the RPC function we just created
  const { data: buildings, error } = await supabase.rpc('get_buildings_missing_address');

  if (error) {
    console.error('❌ Error fetching buildings:', error.message);
    return;
  }

  if (!buildings || buildings.length === 0) {
    console.log('✅ No buildings found needing address backfill.');
    return;
  }

  console.log(`📍 Found ${buildings.length} buildings to process.`);

  // 2. Process in batches
  for (let i = 0; i < buildings.length; i += BATCH_SIZE) {
    const batch = buildings.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (b: any) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${b.lat},${b.lng}&key=${googleMapsKey}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'OK' && json.results?.[0]) {
          const result = json.results[0];
          const formattedAddress = result.formatted_address;
          
          // Extract cleaner city/country if needed, or stick with what we have
          let googleCity = null;
          let googleCountry = null;

          result.address_components.forEach((comp: any) => {
            if (comp.types.includes('locality')) googleCity = comp.long_name;
            if (comp.types.includes('country')) googleCountry = comp.long_name;
          });

          // 3. Update Supabase
          const { error: updateError } = await supabase
            .from('buildings')
            .update({ 
              address: formattedAddress,
              // Only overwrite city/country if we didn't have them originally
              city: b.city || googleCity,
              country: b.country || googleCountry
            })
            .eq('id', b.id);

          if (updateError) {
             console.error(`❌ DB Error ${b.name}:`, updateError.message);
          } else {
             console.log(`✅ Updated: ${b.name} -> ${formattedAddress}`);
          }
        } else {
          console.warn(`⚠️ Google couldn't find address for: ${b.name} (${json.status})`);
        }
      } catch (err) {
        console.error(`❌ Network Error ${b.name}:`, err);
      }
    }));

    // Rate limit pause
    if (i + BATCH_SIZE < buildings.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('🎉 Backfill complete!');
}

backfillAddresses();
