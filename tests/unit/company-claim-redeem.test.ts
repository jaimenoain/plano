import { describe, expect, it } from "vitest";
import { parseRedeemCompanyClaimRpcPayload } from "@/features/credits/api/companies";

describe("parseRedeemCompanyClaimRpcPayload", () => {
  it("parses success", () => {
    expect(parseRedeemCompanyClaimRpcPayload({ ok: true, company_slug: "acme-studio" })).toEqual({
      ok: true,
      companySlug: "acme-studio",
    });
  });

  it("parses known errors", () => {
    expect(parseRedeemCompanyClaimRpcPayload({ ok: false, error: "expired" })).toEqual({
      ok: false,
      error: "expired",
    });
    expect(parseRedeemCompanyClaimRpcPayload({ ok: false, error: "wrong_user" })).toEqual({
      ok: false,
      error: "wrong_user",
    });
  });

  it("returns rpc_error for unknown payload", () => {
    expect(parseRedeemCompanyClaimRpcPayload(null)).toEqual({ ok: false, error: "rpc_error" });
    expect(parseRedeemCompanyClaimRpcPayload({ ok: false, error: "nope" })).toEqual({
      ok: false,
      error: "rpc_error",
    });
  });
});
