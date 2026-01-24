import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase (Use Service Role Key to bypass RLS for imports)
const supabaseUrl = process.env.VITE_SUPABASE_URL; 
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You need to add this to your .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface AirtableRow {
  Name: string;
  Latitude: string;
  Longitude: string;
  Address: string;
  City: string;
  Country: string;
  Architects: string; // Assuming comma separated "Zaha Hadid, Rem Koolhaas"
  Styles: string;     // Assuming comma separated
  Year: string;
  Image: string;
}

const CSV_FILE_PATH = path.resolve(__dirname, '../data/buildings_export.csv'); // Update with your path

async function importBuildings() {
  const results: AirtableRow[] = [];

  // 1. Read the CSV
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      console.log(`Processing ${results.length} buildings...`);
      
      let added = 0;
      let skipped = 0;
      let errors = 0;

      for (const row of results) {
        try {
          const lat = parseFloat(row.Latitude);
          const lng = parseFloat(row.Longitude);
          const name = row.Name?.trim();

          if (!lat || !lng || !name) {
            console.warn(`Skipping invalid row: ${name || 'Unknown'}`);
            errors++;
            continue;
          }

          // 2. CHECK FOR DUPLICATES
          // We use your existing RPC function 'find_nearby_buildings'
          // logic: search within 100m. If we find a high text similarity match, it's a duplicate.
          const { data: nearby, error: searchError } = await supabase.rpc('find_nearby_buildings', {
            lat: lat,
            long: lng,
            name_query: name,
            radius_meters: 200 // Slightly larger radius to account for GPS drift
          });

          if (searchError) throw searchError;

          // Define what constitutes a "duplicate"
          // Your RPC returns 'similarity_score'. 1.0 is exact match, 0.3 is fuzzy.
          const isDuplicate = nearby?.some((b: any) => {
            // Logic: If it's very close (<50m) OR (reasonably close <200m AND name sounds similar)
            return (b.dist_meters < 50) || (b.similarity_score > 0.6);
          });

          if (isDuplicate) {
            console.log(`❌ Duplicate found: "${name}" matches "${nearby[0].name}" (Dist: ${Math.round(nearby[0].dist_meters)}m, Sim: ${nearby[0].similarity_score.toFixed(2)})`);
            skipped++;
            continue;
          }

          // 3. TRANSFORM DATA
          // Convert comma-separated strings to arrays for Postgres TEXT[] arrays
          const architectArray = row.Architects 
            ? row.Architects.split(',').map(s => s.trim()).filter(Boolean) 
            : [];
            
          const styleArray = row.Styles 
            ? row.Styles.split(',').map(s => s.trim()).filter(Boolean) 
            : [];

          const year = parseInt(row.Year);

          // 4. INSERT
          const { error: insertError } = await supabase.from('buildings').insert({
            name: name,
            // PostGIS Point format
            location: `POINT(${lng} ${lat})`, 
            address: row.Address,
            city: row.City,
            country: row.Country,
            architects: architectArray, 
            styles: styleArray,
            year_completed: isNaN(year) ? null : year,
            main_image_url: row.Image || null,
            is_verified: true, // Mark imported data as verified if trusted
            is_deleted: false
          });

          if (insertError) throw insertError;

          console.log(`✅ Added: "${name}"`);
          added++;

        } catch (err) {
          console.error(`Error processing ${row.Name}:`, err);
          errors++;
        }
      }

      console.log('-----------------------------------');
      console.log(`Import Complete.`);
      console.log(`✅ Added: ${added}`);
      console.log(`⏭️ Skipped (Duplicates): ${skipped}`);
      console.log(`⚠️ Errors: ${errors}`);
    });
}

importBuildings();
