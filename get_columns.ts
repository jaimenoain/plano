import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://example.supabase.co', 'public-anon-key');
console.log(supabase);
