// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useCollectionViewMode } from "./useCollectionViewMode";

const { useIsMobileMock } = vi.hoisted(() => ({ useIsMobileMock: vi.fn() }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: useIsMobileMock }));

function wrapper(initialEntry: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );
}

describe("useCollectionViewMode", () => {
  it("resolves to list once the viewport is known to be mobile", () => {
    useIsMobileMock.mockReturnValue(false);
    const { result, rerender } = renderHook(() => useCollectionViewMode(), {
      wrapper: wrapper("/"),
    });
    expect(result.current[0]).toBe("map");

    useIsMobileMock.mockReturnValue(true);
    rerender();
    expect(result.current[0]).toBe("list");
  });

  it("stays on map for a desktop viewport", () => {
    useIsMobileMock.mockReturnValue(false);
    const { result } = renderHook(() => useCollectionViewMode(), { wrapper: wrapper("/") });
    expect(result.current[0]).toBe("map");
  });

  it("an explicit ?view= wins over the mobile default", () => {
    useIsMobileMock.mockReturnValue(true);
    const { result, rerender } = renderHook(() => useCollectionViewMode(), {
      wrapper: wrapper("/?view=map"),
    });
    expect(result.current[0]).toBe("map");

    rerender();
    expect(result.current[0]).toBe("map");
  });

  it("a user's own choice is never overwritten by a later viewport resolution", () => {
    useIsMobileMock.mockReturnValue(true);
    const { result, rerender } = renderHook(() => useCollectionViewMode(), {
      wrapper: wrapper("/"),
    });

    act(() => result.current[1]("map"));
    expect(result.current[0]).toBe("map");

    rerender();
    expect(result.current[0]).toBe("map");
  });
});
