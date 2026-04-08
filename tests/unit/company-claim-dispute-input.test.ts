import { describe, expect, it } from "vitest";
import { SubmitCompanyClaimDisputeSchema } from "@/features/credits/api/companies";

describe("SubmitCompanyClaimDisputeSchema", () => {
  it("accepts reason and blank evidence", () => {
    const r = SubmitCompanyClaimDisputeSchema.safeParse({ reason: "  Not our domain  ", evidenceUrl: "  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.reason).toBe("Not our domain");
    }
  });

  it("rejects empty reason", () => {
    const r = SubmitCompanyClaimDisputeSchema.safeParse({ reason: "   ", evidenceUrl: "" });
    expect(r.success).toBe(false);
  });

  it("rejects invalid evidence URL", () => {
    const r = SubmitCompanyClaimDisputeSchema.safeParse({
      reason: "We own this trademark",
      evidenceUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });

  it("accepts https URL", () => {
    const r = SubmitCompanyClaimDisputeSchema.safeParse({
      reason: "Evidence attached",
      evidenceUrl: "https://example.com/proof",
    });
    expect(r.success).toBe(true);
  });
});
