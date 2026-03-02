import { createClient } from '@supabase/supabase-js';

const sbUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const sbKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';

const supabase = createClient(sbUrl, sbKey);

async function test() {
  const { data, error } = await supabase.from('buildings').select('*').limit(1);
  console.log(error || Object.keys(data[0] || {}));
}
test();
