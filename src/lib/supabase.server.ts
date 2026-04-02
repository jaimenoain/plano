import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!SUPABASE_URL) throw new Error("Missing env var: VITE_SUPABASE_URL");
if (!SUPABASE_ANON_KEY) throw new Error("Missing env var: VITE_SUPABASE_PUBLISHABLE_KEY");

/**
 * Server client is intentionally untyped: merging the legacy snapshot with Plano tables
 * produces a schema wide enough that TypeScript inference on chained `.from().eq()` fails
 * ("Processing node failed"). The browser client in `integrations/supabase/client.ts` stays
 * generic on `Database` for app type safety.
 */
export function createSupabaseServerClient(
  request: Request,
  responseHeaders: Headers
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const parsed = parseCookieHeader(request.headers.get("Cookie") ?? "");
        return parsed.map((c) => ({ name: c.name, value: c.value ?? "" }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          responseHeaders.append(
            "Set-Cookie",
            serializeCookieHeader(name, value, options)
          );
        });
      },
    },
  });
}

