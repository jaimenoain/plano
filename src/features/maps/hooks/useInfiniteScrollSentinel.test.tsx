import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScrollSentinel } from './useInfiniteScrollSentinel';

/** Every observer built during a test, with the options it was handed. */
let constructed: { root: Element | Document | null }[] = [];

class IntersectionObserverStub {
  constructor(_cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    constructed.push({ root: (options?.root as Element | null) ?? null });
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

beforeEach(() => {
  constructed = [];
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
});

afterEach(() => vi.unstubAllGlobals());

const baseOptions = {
  enabled: true,
  hasNextPage: true,
  isFetchingNextPage: false,
  isFetching: false,
  fetchNextPage: vi.fn(),
  pageCount: 1,
};

/** The hook reads refs in an effect, so the sentinel must exist by then. */
function withAttachedTarget(scrollRoot?: HTMLElement) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  const scrollRootRef = scrollRoot ? { current: scrollRoot } : undefined;

  const rendered = renderHook(() => {
    const result = useInfiniteScrollSentinel({ ...baseOptions, scrollRootRef });
    // Stand in for React attaching the ref to the rendered sentinel.
    (result.targetRef as { current: HTMLElement | null }).current = target;
    return result;
  });

  return { ...rendered, target };
}

describe('useInfiniteScrollSentinel', () => {
  it('roots the observer on a caller-supplied scroller', () => {
    const rail = document.createElement('div');
    document.body.appendChild(rail);

    const { rerender } = withAttachedTarget(rail);
    rerender();

    expect(constructed.at(-1)?.root).toBe(rail);
  });

  it('falls back to its own rootRef when the caller owns no scroller', () => {
    // Regression guard for /search, which still uses the returned rootRef.
    const { rerender } = withAttachedTarget();
    rerender();

    expect(constructed.at(-1)?.root).toBeNull();
  });

  it('builds the observer once across pagination churn', () => {
    // Rebuilding it per data change disconnects each observer before its async
    // first delivery, and the list silently freezes on page 1 (PR #1578).
    const rail = document.createElement('div');
    document.body.appendChild(rail);
    const target = document.createElement('div');
    document.body.appendChild(target);

    const { rerender } = renderHook(
      ({ hasNextPage, pageCount }) => {
        const result = useInfiniteScrollSentinel({
          ...baseOptions,
          hasNextPage,
          pageCount,
          scrollRootRef: { current: rail },
        });
        (result.targetRef as { current: HTMLElement | null }).current = target;
        return result;
      },
      { initialProps: { hasNextPage: true, pageCount: 1 } },
    );

    const afterFirstRender = constructed.length;
    rerender({ hasNextPage: true, pageCount: 2 });
    rerender({ hasNextPage: false, pageCount: 3 });
    rerender({ hasNextPage: true, pageCount: 4 });

    expect(constructed.length).toBe(afterFirstRender);
  });
});
