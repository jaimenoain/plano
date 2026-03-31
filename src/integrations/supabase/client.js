import { createClient } from "@supabase/supabase-js";
import { config } from "@/config";
const SUPABASE_URL = config.supabase.url;
const SUPABASE_PUBLISHABLE_KEY = config.supabase.publishableKey;
// Typed client: generated Database lags real schema in places; use assertion so app tables (e.g. user_buildings) typecheck until gen-types matches production.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
    }
});
