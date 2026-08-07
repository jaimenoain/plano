import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { CollectionSelector } from "./CollectionSelector";

let tableResults: Record<string, { data: unknown; error: unknown }> = {};

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  for (const m of ["select", "insert", "eq", "order", "single", "maybeSingle"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) =>
    resolve(tableResults[table] ?? { data: [], error: null });
  return builder;
}

describe("CollectionSelector", () => {
  beforeEach(() => {
    mockFrom.mockImplementation((table: string) => makeBuilder(table));
    tableResults = {
      collections: {
        data: [
          { id: "c1", name: "Owned collection", slug: "owned", owner: { username: "jane" } },
        ],
        error: null,
      },
      collection_contributors: {
        data: [
          {
            collection: { id: "c2", name: "Shared collection", slug: "shared", owner: { username: "owner-user" } },
          },
        ],
        error: null,
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it("surfaces the owner username for both owned and contributed collections", async () => {
    render(<CollectionSelector userId="user-1" selectedCollectionIds={[]} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Owned collection")).toBeDefined();
      expect(screen.getByText("Shared collection")).toBeDefined();
    });
  });

  it("reports only the newly-selected collection when toggling on", async () => {
    const onChange = vi.fn();
    render(<CollectionSelector userId="user-1" selectedCollectionIds={[]} onChange={onChange} />);

    await waitFor(() => screen.getByText("Owned collection"));
    fireEvent.click(screen.getByText("Owned collection"));

    expect(onChange).toHaveBeenCalledWith(
      ["c1"],
      [{ id: "c1", name: "Owned collection", slug: "owned", owner: { username: "jane" } }],
    );
  });

  it("reports no added collections when toggling off", async () => {
    const onChange = vi.fn();
    render(<CollectionSelector userId="user-1" selectedCollectionIds={["c1"]} onChange={onChange} />);

    await waitFor(() => screen.getByText("Owned collection"));
    fireEvent.click(screen.getByText("Owned collection"));

    expect(onChange).toHaveBeenCalledWith([], []);
  });
});
