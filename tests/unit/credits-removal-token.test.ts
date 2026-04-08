import { describe, expect, it } from "vitest";
import {
  isValidRemovalTokenFormat,
  parseRedeemCreditRemovalRpcPayload,
} from "@/features/credits/api/credits";

describe("isValidRemovalTokenFormat", () => {
  it("accepts 64 hex chars", () => {
    const hex = "a".repeat(64);
    expect(isValidRemovalTokenFormat(hex)).toBe(true);
    expect(isValidRemovalTokenFormat(`  ${hex}  `)).toBe(true);
    expect(isValidRemovalTokenFormat("A".repeat(64))).toBe(true);
  });

  it("rejects wrong length or non-hex", () => {
    expect(isValidRemovalTokenFormat("a".repeat(63))).toBe(false);
    expect(isValidRemovalTokenFormat("a".repeat(65))).toBe(false);
    expect(isValidRemovalTokenFormat(`${"a".repeat(63)}g`)).toBe(false);
    expect(isValidRemovalTokenFormat("")).toBe(false);
  });
});

describe("parseRedeemCreditRemovalRpcPayload", () => {
  it("maps success and error codes from RPC JSON", () => {
    expect(parseRedeemCreditRemovalRpcPayload({ ok: true, credit_id: "u1" })).toEqual({
      ok: true,
      creditId: "u1",
    });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: false, error: "expired" })).toEqual({
      ok: false,
      error: "expired",
    });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: false, error: "already_used" })).toEqual({
      ok: false,
      error: "already_used",
    });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: false, error: "unknown_token" })).toEqual({
      ok: false,
      error: "unknown_token",
    });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: false, error: "invalid_token" })).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });

  it("returns rpc_error for malformed payloads", () => {
    expect(parseRedeemCreditRemovalRpcPayload(null)).toEqual({ ok: false, error: "rpc_error" });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: true })).toEqual({ ok: false, error: "rpc_error" });
    expect(parseRedeemCreditRemovalRpcPayload({ ok: false, error: "other" })).toEqual({
      ok: false,
      error: "rpc_error",
    });
  });
});
