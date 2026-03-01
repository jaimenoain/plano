import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from("user_folder_items")
        .select(`
            collection:collections (
                id, name, slug, is_public, created_at, owner_id,
                collection_items(count),
                collection_contributors(user_id),
                owner:profiles!collections_owner_id_fkey(username)
            )
        `)
        .limit(1);
    console.log(JSON.stringify({ data, error }, null, 2));
}
run();
