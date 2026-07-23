import { describe, expect, it, vi } from "vitest";
import { deriveEventSearchHealth } from "./eventSearchStatus";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("deriveEventSearchHealth", () => {
  it("is ok when no run exists yet (first search may still be starting)", () => {
    expect(deriveEventSearchHealth(null)).toBe("ok");
    expect(deriveEventSearchHealth(undefined)).toBe("ok");
  });

  it("is ok for running and successful runs", () => {
    expect(deriveEventSearchHealth({ status: "running", error: null, started_at: "x" })).toBe("ok");
    expect(deriveEventSearchHealth({ status: "success", error: null, started_at: "x" })).toBe("ok");
  });

  it("is unavailable when the server reports the search key is not configured", () => {
    expect(
      deriveEventSearchHealth({ status: "failed", error: "serper_not_configured", started_at: "x" }),
    ).toBe("unavailable");
  });

  it("is failed for any other failed run", () => {
    expect(
      deriveEventSearchHealth({ status: "failed", error: "provider 500", started_at: "x" }),
    ).toBe("failed");
  });
});
