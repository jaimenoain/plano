/**
 * useVerticalPager — the feed can only ever move one building per gesture, and only
 * within the bounds of the queue. Both were violated by the native snap scroller it
 * replaces (see pagerGesture.ts for the history).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createRef } from "react";
import { useVerticalPager } from "./useVerticalPager";

const FEED_HEIGHT = 800;

/** A stand-in for the feed element; clientHeight is 0 in happy-dom without this. */
function feedRef() {
  const ref = createRef<HTMLElement>();
  const el = document.createElement("div");
  Object.defineProperty(el, "clientHeight", { value: FEED_HEIGHT });
  document.body.appendChild(el);
  (ref as { current: HTMLElement }).current = el;
  return ref;
}

beforeAll(() => {
  // happy-dom has no ResizeObserver; the hook measures once on mount without it.
  if (typeof ResizeObserver === "undefined") {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
  }
});

function setup(count = 5) {
  return renderHook(() => useVerticalPager({ count, containerRef: feedRef() }));
}

describe("useVerticalPager callback stability", () => {
  it("keeps the same callbacks when a new page grows the queue", () => {
    // Explore resets the pager when the filters change, keying that effect on
    // `reset`. If `reset` were rebuilt every time a page landed, the effect would
    // re-run and yank the user back to the first building mid-session.
    const ref = feedRef();
    const { result, rerender } = renderHook(
      ({ count }) => useVerticalPager({ count, containerRef: ref }),
      { initialProps: { count: 10 } }
    );
    const before = {
      reset: result.current.reset,
      goToNext: result.current.goToNext,
      onDrag: result.current.onDrag,
      onRelease: result.current.onRelease,
    };
    rerender({ count: 20 });
    expect(result.current.reset).toBe(before.reset);
    expect(result.current.goToNext).toBe(before.goToNext);
    expect(result.current.onDrag).toBe(before.onDrag);
    expect(result.current.onRelease).toBe(before.onRelease);
  });

  it("still honours the new upper bound after the queue grows", () => {
    const ref = feedRef();
    const { result, rerender } = renderHook(
      ({ count }) => useVerticalPager({ count, containerRef: ref }),
      { initialProps: { count: 2 } }
    );
    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    expect(result.current.index).toBe(1);
    rerender({ count: 4 });
    act(() => result.current.goToNext());
    expect(result.current.index).toBe(2);
  });
});

describe("useVerticalPager", () => {
  it("starts on the first building", () => {
    expect(setup().result.current.index).toBe(0);
  });

  it("advances exactly one building on a committing drag", () => {
    const { result } = setup();
    act(() => result.current.onRelease(-400, -2000));
    expect(result.current.index).toBe(1);
  });

  it("advances exactly one building however hard the flick", () => {
    // The reported bug: a hard iPad flick skipped several buildings at once.
    const { result } = setup();
    act(() => result.current.onRelease(-5000, -20000));
    expect(result.current.index).toBe(1);
  });

  it("stays put when the drag falls short of the threshold", () => {
    const { result } = setup();
    act(() => result.current.onRelease(-40, 0));
    expect(result.current.index).toBe(0);
  });

  it("goes back exactly one building, so nothing is skipped in reverse", () => {
    const { result } = setup();
    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    expect(result.current.index).toBe(2);
    act(() => result.current.onRelease(400, 2000));
    expect(result.current.index).toBe(1);
  });

  it("cannot page before the first or past the last building", () => {
    const { result } = setup(2);
    act(() => result.current.onRelease(400, 2000));
    expect(result.current.index).toBe(0);
    act(() => result.current.goToNext());
    act(() => result.current.goToNext());
    expect(result.current.index).toBe(1);
  });

  it("reset returns to the first building — used when filters rebuild the queue", () => {
    const { result } = setup();
    act(() => result.current.goToNext());
    act(() => result.current.reset());
    expect(result.current.index).toBe(0);
  });
});
