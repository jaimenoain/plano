import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // 1. Try to fetch a watchlist item directly from log to see structure
    console.log("Fetching a watchlist item from log...");
    const { data: logs, error: logError } = await supabase
        .from('user_buildings')
        .select('*')
        .eq('status', 'pending')
        .limit(1);

    if (logError) {
        console.error("Error fetching logs:", logError);
    } else {
        console.log("Watchlist item sample:", logs);
    }

    // 2. Call get_main_feed and see if we can select 'status'
    console.log("Calling get_main_feed...");
    const { data: feed, error: feedError } = await supabase
        .rpc("get_main_feed", {
            p_limit: 5,
            p_offset: 0,
            p_show_group_activity: true
        })
        .select('id, content, status'); // Try to select status

    if (feedError) {
        console.error("Error calling get_main_feed:", feedError);
    } else {
        console.log("Feed sample (first 2):", feed?.slice(0, 2));
    }
}

main();
