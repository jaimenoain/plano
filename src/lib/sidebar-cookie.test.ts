import { describe, it, expect } from "vitest";
import {
  SIDEBAR_COOKIE_NAME,
  parseSidebarOpenFromCookieString,
  parseSidebarOpenFromRequest,
} from "./sidebar-cookie";

// Characterization tests: lock in the CURRENT behavior of the sidebar-cookie
// parsers (pure string/Request parsing, no document access).

describe("parseSidebarOpenFromCookieString", () => {
  it('returns true for "<name>=true"', () => {
    expect(parseSidebarOpenFromCookieString(`${SIDEBAR_COOKIE_NAME}=true`)).toBe(true);
  });

  it('returns false for "<name>=false"', () => {
    expect(parseSidebarOpenFromCookieString(`${SIDEBAR_COOKIE_NAME}=false`)).toBe(false);
  });

  it("finds the cookie among other cookies", () => {
    expect(
      parseSidebarOpenFromCookieString(`foo=1; ${SIDEBAR_COOKIE_NAME}=false; bar=2`),
    ).toBe(false);
  });

  it("returns null when the cookie is absent", () => {
    expect(parseSidebarOpenFromCookieString("foo=1; bar=2")).toBeNull();
    expect(parseSidebarOpenFromCookieString("")).toBeNull();
  });

  it("returns null for a non-boolean value", () => {
    expect(parseSidebarOpenFromCookieString(`${SIDEBAR_COOKIE_NAME}=maybe`)).toBeNull();
  });

  it("ignores segments with no '=' separator", () => {
    expect(parseSidebarOpenFromCookieString("justaflag")).toBeNull();
  });
});

describe("parseSidebarOpenFromRequest", () => {
  it("reads the value from the request's cookie header", () => {
    const request = new Request("https://example.com", {
      headers: { cookie: `${SIDEBAR_COOKIE_NAME}=true` },
    });
    expect(parseSidebarOpenFromRequest(request)).toBe(true);
  });

  it("returns null when the request has no cookie header", () => {
    const request = new Request("https://example.com");
    expect(parseSidebarOpenFromRequest(request)).toBeNull();
  });
});
