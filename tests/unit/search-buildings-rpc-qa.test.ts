import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";

describe("searchBuildingsRpc (QA 5.1)", () => {
  let capturedSelect = "";

  beforeEach(() => {
    capturedSelect = "";
    vi.mocked(supabase.from).mockImplementation(() => ({
      select(sel: string) {
        capturedSelect = sel;
        const q = {
          or: vi.fn(),
          in: vi.fn(),
          eq: vi.fn(),
          limit: vi.fn(),
          then(onFulfilled: (x: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
            return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
          },
        };
        q.or.mockReturnValue(q);
        q.in.mockReturnValue(q);
        q.eq.mockReturnValue(q);
        q.limit.mockReturnValue(q);
        return q;
      },
    }));
  });

  it("buildings query embeds building_credits for attribution, not legacy architect join tables", async () => {
    await searchBuildingsRpc({ query_text: null, p_limit: 10 });

    expect(capturedSelect.length).toBeGreaterThan(0);
    expect(capturedSelect).toContain("building_credits");
    expect(capturedSelect).not.toContain("building_architects");
    expect(capturedSelect).not.toContain("architects(");
  });
});
