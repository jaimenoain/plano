import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/integrations/supabase/types";

export const supabase = createBrowserClient<Database>(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
);

