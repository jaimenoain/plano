
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearch() {
  const query = '55 Bishopsgate';

  const { data: _data, error } = await supabase.rpc('get_buildings_list', {
    min_lat: 51.5,
    min_lng: -0.1,
    max_lat: 51.6,
    max_lng: 0.0,
    filter_criteria: { query },
    page: 1,
    page_size: 20
  });

  if (error) {
    // error
  } else {
    // data found
  }
}

testSearch();
