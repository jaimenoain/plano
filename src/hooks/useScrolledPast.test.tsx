/**
 * The collection rail renders a loading state before its list exists, so the
 * sentinel mounts on a later commit than the hook's first effect pass. These
 * tests pin that ordering down: the observer has to attach whenever the sentinel
 * appears, not only if it happens to be there on mount. The shipped rail toolbar
 * never lifted or revealed its condensed title because of exactly that gap.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRef, useState } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useScrolledPast } from "./useScrolledPast";

type Cb = (entries: { isIntersecting: boolean }[]) => void;

const observed: Element[] = [];
let fire: Cb | undefined;
let roots: (Element | null)[] = [];

class IntersectionObserverStub {
  constructor(
    private cb: Cb,
    options?: { root?: Element | null },
  ) {
    fire = this.cb;
    roots.push(options?.root ?? null);
  }
  observe(node: Element) {
    observed.push(node);
  }
  disconnect() {}
}

beforeEach(() => {
  observed.length = 0;
  roots = [];
  fire = undefined;
  vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Mirrors the rail: a loading pass with no sentinel, then the real content. */
function Rail({ startLoading = true }: { startLoading?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { sentinelRef, hasScrolledPast } = useScrolledPast(rootRef);
  const [loading, setLoading] = useState(startLoading);

  return (
    <div>
      <button type="button" onClick={() => setLoading(false)}>
        finish loading
      </button>
      <div ref={rootRef} data-testid="scroller">
        {loading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div ref={sentinelRef} data-testid="sentinel" />
            <span>{hasScrolledPast ? "stuck" : "at rest"}</span>
          </>
        )}
      </div>
    </div>
  );
}

describe("useScrolledPast", () => {
  it("attaches the observer to a sentinel that mounts after the first pass", () => {
    render(<Rail />);
    expect(observed).toHaveLength(0);

    act(() => {
      screen.getByRole("button", { name: "finish loading" }).click();
    });

    expect(observed).toEqual([screen.getByTestId("sentinel")]);
  });

  it("roots the observer on the scroller, not the viewport", () => {
    render(<Rail startLoading={false} />);

    expect(roots).toEqual([screen.getByTestId("scroller")]);
  });

  it("reports scrolled-past when the sentinel leaves the root", () => {
    render(<Rail startLoading={false} />);
    expect(screen.getByText("at rest")).toBeInTheDocument();

    act(() => fire?.([{ isIntersecting: false }]));
    expect(screen.getByText("stuck")).toBeInTheDocument();

    act(() => fire?.([{ isIntersecting: true }]));
    expect(screen.getByText("at rest")).toBeInTheDocument();
  });

  it("stays at rest when the environment has no observer (SSR)", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Rail startLoading={false} />);

    expect(screen.getByText("at rest")).toBeInTheDocument();
    expect(observed).toHaveLength(0);
  });
});
