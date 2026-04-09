import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import type { Session, SupabaseClient } from "@supabase/supabase-js";

// Use Vite-inlined `import.meta.env` so SSR bundles get URL/key from the build
// (Vercel build env). `process.env.VITE_*` is often unset in the serverless runtime.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL) throw new Error("Missing env var: VITE_SUPABASE_URL");
if (!SUPABASE_ANON_KEY)
  throw new Error("Missing env var: VITE_SUPABASE_PUBLISHABLE_KEY");

/**
 * SSR: validates the JWT via `getUser()`, then copies tokens from `getSession()` without
 * reading `session.user` (cookie-sourced user triggers `insecureUserWarningProxy` on serialize).
 */
export async function getSessionForClientHydration(
  supabase: SupabaseClient
): Promise<Session | null> {
  const {
    data: { user: verifiedUser },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError || !verifiedUser) {
    return null;
  }

  const {
    data: { session: rawSession },
  } = await supabase.auth.getSession();

  if (!rawSession) {
    return null;
  }

  return {
    provider_token: rawSession.provider_token,
    provider_refresh_token: rawSession.provider_refresh_token,
    access_token: rawSession.access_token,
    refresh_token: rawSession.refresh_token,
    expires_in: rawSession.expires_in,
    expires_at: rawSession.expires_at,
    token_type: rawSession.token_type,
    user: verifiedUser,
  };
}

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

