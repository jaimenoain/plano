import { describe, expect, it } from "vitest";
import {
  parseApproveCompanyStewardRequestRpcPayload,
  parseRejectCompanyStewardRequestRpcPayload,
} from "@/features/credits/api/companies";

describe("parseApproveCompanyStewardRequestRpcPayload", () => {
  it("maps success with already_processed false", () => {
    expect(
      parseApproveCompanyStewardRequestRpcPayload({
        ok: true,
        company_slug: "acme-studio",
        request_id: "r1",
        already_processed: false,
      })
    ).toEqual({
      ok: true,
      companySlug: "acme-studio",
      requestId: "r1",
      alreadyProcessed: false,
    });
  });

  it("maps success with already_processed true", () => {
    expect(
      parseApproveCompanyStewardRequestRpcPayload({
        ok: true,
        company_slug: "acme-studio",
        request_id: "r1",
        already_processed: true,
      })
    ).toEqual({
      ok: true,
      companySlug: "acme-studio",
      requestId: "r1",
      alreadyProcessed: true,
    });
  });

  it("maps known errors", () => {
    expect(parseApproveCompanyStewardRequestRpcPayload({ ok: false, error: "not_owner" })).toEqual({
      ok: false,
      error: "not_owner",
    });
    expect(parseApproveCompanyStewardRequestRpcPayload({ ok: false, error: "not_found" })).toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("returns rpc_error for unknown payload", () => {
    expect(parseApproveCompanyStewardRequestRpcPayload(null)).toEqual({ ok: false, error: "rpc_error" });
    expect(parseApproveCompanyStewardRequestRpcPayload({ ok: true, company_slug: "x" })).toEqual({
      ok: false,
      error: "rpc_error",
    });
  });
});

describe("parseRejectCompanyStewardRequestRpcPayload", () => {
  it("maps success", () => {
    expect(
      parseRejectCompanyStewardRequestRpcPayload({
        ok: true,
        company_slug: "acme",
        request_id: "r1",
        already_processed: false,
      })
    ).toEqual({
      ok: true,
      companySlug: "acme",
      requestId: "r1",
      alreadyProcessed: false,
    });
  });

  it("maps known errors", () => {
    expect(parseRejectCompanyStewardRequestRpcPayload({ ok: false, error: "not_pending" })).toEqual({
      ok: false,
      error: "not_pending",
    });
  });

  it("returns rpc_error for unknown payload", () => {
    expect(parseRejectCompanyStewardRequestRpcPayload({ ok: true, company_slug: "x" })).toEqual({
      ok: false,
      error: "rpc_error",
    });
  });
});
