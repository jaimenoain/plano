/**
 * In-process rate limiter for Supabase Edge Functions.
 *
 * SCOPE LIMITATION: State is stored in a per-isolate Map. Each Supabase
 * Edge Function isolate enforces limits independently, so limits are not
 * coordinated globally across concurrent isolates. This is acceptable for
 * most abuse scenarios (each isolate still blocks sustained per-IP bursts).
 *
 * UPGRADE PATH: Replace the Map with calls to a Redis-backed store (e.g.
 * Upstash Redis via the `@upstash/redis` Deno-compatible client) for a
 * globally consistent counter that survives across isolate cold-starts.
 */

interface BucketEntry {
  count: number;
  reset: number; // epoch ms at which the window resets
}

const store = new Map<string, BucketEntry>();

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the window. Default: 30 */
  max?: number;
  /** Window duration in milliseconds. Default: 60_000 (1 minute) */
  windowMs?: number;
}

export interface RateLimitResult {
  limited: boolean;
  /** Seconds until the current window resets (only meaningful when limited === true) */
  retryAfter: number;
}

/**
 * Check whether `key` has exceeded the rate limit.
 *
 * @param key     Typically an IP address, but can be any string bucket.
 * @param options Optional overrides for max requests and window duration.
 */
export function checkRateLimit(
  key: string,
  options?: RateLimitOptions,
): RateLimitResult {
  const max = options?.max ?? 30;
  const windowMs = options?.windowMs ?? 60_000;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now >= entry.reset) {
    entry = { count: 1, reset: now + windowMs };
    store.set(key, entry);
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;

  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false, retryAfter: 0 };
}

/**
 * Returns a well-formed 429 Response with a `Retry-After` header.
 */
export function rateLimitExceededResponse(retryAfter: number): Response {
  return new Response("Too Many Requests", {
    status: 429,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Retry-After": String(retryAfter),
    },
  });
}
