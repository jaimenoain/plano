// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  EMPTY_NOTICE_DISMISS_MS,
  clearEmptyNoticeDismissed,
  readEmptyNoticeDismissed,
  writeEmptyNoticeDismissed,
} from "./mapNoticePreferences";

const KEY = "plano:map:empty-notice-dismissed-until";
const NOW = 1_700_000_000_000;

describe("mapNoticePreferences", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("is not dismissed before anything is stored", () => {
    expect(readEmptyNoticeDismissed(NOW)).toBe(false);
  });

  it("suppresses the notice for 24 hours, then lets it back", () => {
    writeEmptyNoticeDismissed(NOW);

    expect(localStorage.getItem(KEY)).toBe(String(NOW + EMPTY_NOTICE_DISMISS_MS));
    expect(readEmptyNoticeDismissed(NOW)).toBe(true);
    expect(readEmptyNoticeDismissed(NOW + EMPTY_NOTICE_DISMISS_MS - 1)).toBe(true);
    expect(readEmptyNoticeDismissed(NOW + EMPTY_NOTICE_DISMISS_MS)).toBe(false);
    expect(readEmptyNoticeDismissed(NOW + EMPTY_NOTICE_DISMISS_MS + 1)).toBe(false);
  });

  it("treats a malformed stored value as not dismissed", () => {
    localStorage.setItem(KEY, "soon");
    expect(readEmptyNoticeDismissed(NOW)).toBe(false);
  });

  it("clears the dismissal", () => {
    writeEmptyNoticeDismissed(NOW);
    clearEmptyNoticeDismissed();
    expect(readEmptyNoticeDismissed(NOW)).toBe(false);
  });

  // Private mode / quota: the map must never go down over a nudge preference.
  it("survives a throwing localStorage on both read and write", () => {
    const denied = () => {
      throw new Error("denied");
    };
    vi.stubGlobal("localStorage", {
      getItem: denied,
      setItem: denied,
      removeItem: denied,
    });

    expect(() => writeEmptyNoticeDismissed(NOW)).not.toThrow();
    expect(() => clearEmptyNoticeDismissed()).not.toThrow();
    expect(readEmptyNoticeDismissed(NOW)).toBe(false);
  });
});
