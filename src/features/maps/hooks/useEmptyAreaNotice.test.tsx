// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { SETTLE_MS, useEmptyAreaNotice } from "./useEmptyAreaNotice";
import { writeEmptyNoticeDismissed } from "../mapNoticePreferences";

/** The three inputs PlanoMap threads in. */
const empty = { enabled: true, isEmpty: true, hasResults: false };
const loading = { enabled: true, isEmpty: false, hasResults: false };
const results = { enabled: true, isEmpty: false, hasResults: true };

describe("useEmptyAreaNotice", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("stays hidden while the map is panning across a sparse area", () => {
    const { result, rerender } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });

    // Empty, but only briefly — a pan resolves with buildings before the settle.
    act(() => void vi.advanceTimersByTime(SETTLE_MS - 100));
    expect(result.current.visible).toBe(false);

    rerender(results);
    act(() => void vi.advanceTimersByTime(SETTLE_MS * 2));
    expect(result.current.visible).toBe(false);
  });

  it("appears once the view has been empty for the settle delay", () => {
    const { result } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });

    expect(result.current.visible).toBe(false);
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    expect(result.current.visible).toBe(true);
  });

  // The "Zoom out →" regression: the refetch flips isEmpty false for a moment.
  it("stays mounted through a refetch once shown", () => {
    const { result, rerender } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    expect(result.current.visible).toBe(true);

    rerender(loading);
    expect(result.current.visible).toBe(true);

    // The wider view is still empty — no flash away and back, no second settle.
    rerender(empty);
    expect(result.current.visible).toBe(true);
  });

  it("retires when buildings actually come into view", () => {
    const { result, rerender } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });
    act(() => void vi.advanceTimersByTime(SETTLE_MS));
    expect(result.current.visible).toBe(true);

    rerender(results);
    expect(result.current.visible).toBe(false);
  });

  it("hides on dismiss and stays hidden while the view is still empty", () => {
    const { result, rerender } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });
    act(() => void vi.advanceTimersByTime(SETTLE_MS));

    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);

    rerender(empty);
    act(() => void vi.advanceTimersByTime(SETTLE_MS * 3));
    expect(result.current.visible).toBe(false);
  });

  it("never shows for a user who dismissed it within the last 24 hours", () => {
    writeEmptyNoticeDismissed(Date.now());

    const { result } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: empty,
    });
    act(() => void vi.advanceTimersByTime(SETTLE_MS * 3));
    expect(result.current.visible).toBe(false);
  });

  it("shows nothing on surfaces that did not ask for the notice", () => {
    const { result } = renderHook((props) => useEmptyAreaNotice(props), {
      initialProps: { ...empty, enabled: false },
    });
    act(() => void vi.advanceTimersByTime(SETTLE_MS * 3));
    expect(result.current.visible).toBe(false);
  });
});
