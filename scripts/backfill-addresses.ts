import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // Ensure node-fetch is installed: npm install node-fetch

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsKey = process.env.GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !googleMapsKey) {
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Config
const BATCH_SIZE = 5; // Low batch size to avoid rate limits
const DELAY_MS = 200; // Delay between batches

async function backfillAddresses() {
  console.log('🔄 Fetching buildings without addresses...');

  // Fetch buildings where address is NULL. 
  // We cast PostGIS location to lat/lng for easy use.
  const { data: buildings, error } = await supabase
    .from('buildings')
    .select('id, name, location')
    .is('address', null)
    .not('location', 'is', null);

  if (error) {
    console.error('Error fetching buildings:', error);
    return;
  }

  // If fetching raw PostGIS hex, we might need a stored proc to get lat/lng. 
  // A cleaner way is to use an RPC or raw SQL, but let's try a direct RPC approach 
  // if you have many rows, otherwise, we can use a raw query helper.
  
  // Alternative: Use a raw query to get cleaner data
  // Note: This requires the permissions to run raw sql via rpc if "location" comes back as binary
  const { data: cleanBuildings, error: rawError } = await supabase.rpc('get_buildings_missing_address');
  
  // If you don't have this RPC, create it (SQL provided below script).
  // Fallback if you can't run the RPC right now:
  if (rawError) {
      console.error("❌ RPC 'get_buildings_missing_address' not found. Please run the SQL migration first.");
      return;
  }

  console.log(`found ${cleanBuildings.length} buildings to process.`);

  for (let i = 0; i < cleanBuildings.length; i += BATCH_SIZE) {
    const batch = cleanBuildings.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (b: any) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${b.lat},${b.lng}&key=${googleMapsKey}`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.status === 'OK' && json.results[0]) {
          const result = json.results[0];
          const formattedAddress = result.formatted_address;
          
          // Extract city/country from components
          let city = null;
          let country = null;

          result.address_components.forEach((comp: any) => {
            if (comp.types.includes('locality')) city = comp.long_name;
            if (comp.types.includes('country')) country = comp.long_name;
          });

          // Update Supabase
          const { error: updateError } = await supabase
            .from('buildings')
            .update({ 
              address: formattedAddress,
              city: city || b.city, // Keep existing if Google fails
              country: country || b.country 
            })
            .eq('id', b.id);

          if (updateError) throw updateError;
          console.log(`✅ Updated: ${b.name}`);
        } else {
          console.warn(`⚠️ No address found for: ${b.name} (${json.status})`);
        }
      } catch (err) {
        console.error(`❌ Error updating ${b.name}:`, err);
      }
    }));

    // Rate limit safety delay
    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  }
}

backfillAddresses();
