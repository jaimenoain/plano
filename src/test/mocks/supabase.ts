import { vi } from "vitest";

/** Fluent query builder mock for common Supabase chains. */
export function mockSupabaseQuery<T>(data: T, error: Error | null = null) {
  const chain = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) =>
      Promise.resolve({ data, error }).then(resolve),
    ),
  };

  const fluent = chain as Record<string, ReturnType<typeof vi.fn>>;
  for (const key of Object.keys(fluent)) {
    if (key === "single" || key === "maybeSingle" || key === "then") continue;
    fluent[key].mockReturnValue(chain);
  }

  return chain;
}

export function mockSupabaseRpc<T>(data: T, error: Error | null = null) {
  return vi.fn().mockResolvedValue({ data, error });
}

export function createMockSupabaseClient() {
  return {
    from: vi.fn().mockImplementation(() => mockSupabaseQuery(null)),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi
          .fn()
          .mockReturnValue({ data: { publicUrl: "https://example.com/image.jpg" } }),
      }),
    },
  };
}
