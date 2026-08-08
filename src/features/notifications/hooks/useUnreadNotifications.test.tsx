// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUnreadNotifications } from "./useUnreadNotifications";

const mocks = vi.hoisted(() => ({
  user: { id: "u1", email: "test@example.com" } as { id: string; email: string } | undefined,
  countResult: { count: 0, error: null } as { count: number | null; error: unknown },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: { count: number | null; error: unknown }) => void) =>
      resolve(mocks.countResult),
  };
  const channel = { on: () => channel, subscribe: () => channel };
  return {
    supabase: {
      from: () => chain,
      channel: () => channel,
      removeChannel: vi.fn(),
    },
  };
});

function Harness({ onReady }: { onReady: (v: ReturnType<typeof useUnreadNotifications>) => void }) {
  const api = useUnreadNotifications();
  onReady(api);
  return null;
}

async function renderHarness() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let latest!: ReturnType<typeof useUnreadNotifications>;
  render(
    <QueryClientProvider client={queryClient}>
      <Harness onReady={(v) => (latest = v)} />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(latest.isLoading).toBe(false));
  return () => latest;
}

describe("useUnreadNotifications", () => {
  beforeEach(() => {
    mocks.user = { id: "u1", email: "test@example.com" };
    mocks.countResult = { count: 0, error: null };
  });

  afterEach(() => {
    cleanup();
  });

  it("returns the unread count", async () => {
    mocks.countResult = { count: 4, error: null };
    const getLatest = await renderHarness();
    expect(getLatest().count).toBe(4);
    expect(getLatest().hasUnread).toBe(true);
  });

  it("returns zero and hasUnread=false when there are no unread notifications", async () => {
    mocks.countResult = { count: 0, error: null };
    const getLatest = await renderHarness();
    expect(getLatest().count).toBe(0);
    expect(getLatest().hasUnread).toBe(false);
  });

  it("surfaces a query error instead of silently reporting zero unread", async () => {
    mocks.countResult = { count: null, error: new Error("network down") };
    const getLatest = await renderHarness();
    expect(getLatest().error).toBeTruthy();
  });
});
