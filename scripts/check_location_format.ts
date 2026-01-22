
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!; // Changed from ANON_KEY to PUBLISHABLE_KEY based on .env

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLocation() {
  const { data, error } = await supabase
    .from('buildings')
    .select('id, name, location')
    .not('location', 'is', null)
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Building Data:', data);
  if (data && data.length > 0) {
      console.log('Location Type:', typeof data[0].location);
      console.log('Location Value:', data[0].location);
  }
}

checkLocation();
