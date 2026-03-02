import { createClient } from '@supabase/supabase-js';
import { Database } from './src/integrations/supabase/types';

const supabase = createClient<Database>('https://example.supabase.co', 'public-anon-key');

const q = supabase
    .from("buildings")
    .select(`
        id,
        name,
        city,
        country,
        building_images(
        id,
        storage_path
        )
    `)
    .eq("architect_id", "some-id");
