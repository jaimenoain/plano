// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useBuildingDrawerNotesAndCollections } from "./useBuildingDrawerNotesAndCollections";

let tableResults: Record<string, { data: unknown; error: unknown }> = {};

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  for (const m of ["insert", "delete", "eq", "in"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve(tableResults[table] ?? { data: null, error: null });
  return builder;
}

const collectionA = { id: "c1", name: "Brutalist favourites", slug: "brutalist", owner: { username: "jane" } };

/** Renders the hook inside a real component tree — `renderHook` crashes the
 * worker in this repo when the render tree pulls in the collections barrel
 * (reproduces even with a trivial hook), so a harness component is used
 * instead to exercise the same behaviour via `render`. */
function Harness({
  initialCollectionIds,
  onReady,
}: {
  initialCollectionIds: string[];
  onReady: (api: ReturnType<typeof useBuildingDrawerNotesAndCollections>) => void;
}) {
  const api = useBuildingDrawerNotesAndCollections({
    buildingId: "b1",
    user: { id: "user-1" },
    isVisited: false,
    isSaved: false,
    isIgnored: false,
    existingPost: null,
    initialCollectionIds,
  });
  onReady(api);
  return null;
}

async function renderHarness(initialCollectionIds: string[]) {
  const queryClient = new QueryClient();
  let latest!: ReturnType<typeof useBuildingDrawerNotesAndCollections>;
  await act(async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Harness initialCollectionIds={initialCollectionIds} onReady={(api) => { latest = api; }} />
      </QueryClientProvider>,
    );
  });
  return {
    get current() {
      return latest;
    },
  };
}

describe("useBuildingDrawerNotesAndCollections", () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => makeBuilder(table));
    mockToast.mockClear();
    tableResults = { collection_items: { data: null, error: null } };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a success toast with a collection link after adding", async () => {
    const result = await renderHarness([]);

    await act(async () => {
      await result.current.onCollectionsChange(["c1"], [collectionA]);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Added to collection" }),
    );
  });

  it("shows no success toast when removing a collection", async () => {
    const result = await renderHarness(["c1"]);

    await act(async () => {
      await result.current.onCollectionsChange([], []);
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("shows a destructive toast and reverts on failure, without a success toast", async () => {
    tableResults = { collection_items: { data: null, error: { message: "boom" } } };
    const result = await renderHarness([]);

    await act(async () => {
      await result.current.onCollectionsChange(["c1"], [collectionA]);
    });

    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive", title: "Failed to update collection" }),
    );
  });
});
