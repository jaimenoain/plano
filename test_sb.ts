import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://example.com', 'key');
console.log(sb.auth.getUser.length); // Check number of arguments
