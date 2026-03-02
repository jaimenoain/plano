import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'http://localhost:54321', process.env.VITE_SUPABASE_ANON_KEY || 'dummy');
const q = supabase
    .from("building_architects")
    .select(`
        building:buildings(
            id,
            name,
            city,
            country,
            building_images(
                id,
                storage_path
            )
        )
    `)
    .eq("architect_id", "some-id");
