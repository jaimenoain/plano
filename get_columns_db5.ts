import { createClient } from '@supabase/supabase-js';

const sbUrl = 'https://gyxspsuctbrxhwiyfvlj.supabase.co';
const sbKey = 'dummy';

const supabase = createClient(sbUrl, sbKey);

async function test() {
  const { data, error } = await supabase.from('buildings').select('*').limit(1);
  console.log(error || Object.keys(data[0] || {}));
}
test();
