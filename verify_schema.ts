import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('group_members')
    .select('status')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Data:', data);
  }
}

main();
