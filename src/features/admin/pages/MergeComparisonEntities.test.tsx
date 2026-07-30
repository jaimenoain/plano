// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { toast } from "sonner";
import MergeComparisonEntities from "./MergeComparisonEntities";

const TARGET_ID = "00000000-0000-4000-8000-0000000051f0";
const SOURCE_ID = "00000000-0000-4000-8000-00000000d0d0";
const SURVIVOR_ID = "00000000-0000-4000-8000-0000000000aa";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "admin-1", email: "a@test.com" }, loading: false, signOut: vi.fn() }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ entityType: "building", targetId: TARGET_ID, sourceId: SOURCE_ID }),
  };
});

type BuildingRow = {
  id: string;
  name: string;
  is_deleted: boolean;
  merged_into_id: string | null;
};

/** Rows `fetchEntities` gets back for the compared pair. */
let comparedRows: BuildingRow[] = [];

function row(id: string, name: string, overrides: Partial<BuildingRow> = {}): BuildingRow {
  return { id, name, is_deleted: false, merged_into_id: null, ...overrides };
}

function baseRow(r: BuildingRow) {
  return {
    ...r,
    city: "Plano",
    year_completed: 1951,
    address: "14520 River Rd",
    slug: `slug-${r.id.slice(0, 4)}`,
    short_id: 1,
    // null coordinates keep the lazily-imported BuildingMap from mounting
    latitude: null,
    longitude: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "buildings") {
        return {
          select: () => ({
            // the compared pair
            in: async () => ({ data: comparedRows.map(baseRow), error: null }),
            // survivor lookup for the "open surviving record" link
            eq: async () => ({ data: [], error: null }),
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
        };
      }
      if (table === "review_images") {
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) };
      }
      // impact counts (user_buildings, building_credits)
      return {
        select: () => ({ eq: async () => ({ count: 0, error: null }) }),
      };
    },
    rpc: async () => ({ data: null, error: null }),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <MergeComparisonEntities />
    </MemoryRouter>,
  );
}

describe("MergeComparisonEntities — merge safety guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    comparedRows = [row(TARGET_ID, "Farnsworth House"), row(SOURCE_ID, "Farnsworth house")];
  });

  afterEach(() => {
    cleanup();
  });

  it("lets a merge of two live records proceed", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Surviving Record")).toBeTruthy());

    expect(screen.queryByText("Merge blocked")).toBeNull();
    expect(screen.queryByText("Already merged")).toBeNull();
    const button = screen.getByRole("button", { name: /Unify Records/i });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("blocks and explains when the duplicate was already merged away", async () => {
    comparedRows = [
      row(TARGET_ID, "Farnsworth House"),
      row(SOURCE_ID, "Farnsworth house", { is_deleted: true, merged_into_id: SURVIVOR_ID }),
    ];

    renderPage();

    await waitFor(() => expect(screen.getByText("Merge blocked")).toBeTruthy());
    // once as a badge on the duplicate column, once inside the warning card
    expect(screen.getAllByText("Already merged")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Unify Records/i }).hasAttribute("disabled")).toBe(true);
  });

  it("blocks when the surviving record is itself deleted — the circular-merge case", async () => {
    comparedRows = [
      row(TARGET_ID, "Farnsworth House", { is_deleted: true, merged_into_id: null }),
      row(SOURCE_ID, "Farnsworth house"),
    ];

    renderPage();

    await waitFor(() => expect(screen.getByText("Merge blocked")).toBeTruthy());
    expect(screen.getAllByText("Deleted")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Unify Records/i }).hasAttribute("disabled")).toBe(true);
  });

  it("refuses to promote an already-merged duplicate to surviving record", async () => {
    comparedRows = [
      row(TARGET_ID, "Farnsworth House"),
      row(SOURCE_ID, "Farnsworth house", { is_deleted: true, merged_into_id: SURVIVOR_ID }),
    ];

    renderPage();
    await waitFor(() => expect(screen.getByText("Merge blocked")).toBeTruthy());

    await userEvent.click(screen.getByRole("button", { name: /Swap direction/i }));

    expect(toast.error).toHaveBeenCalledWith(
      "That record is deleted or already merged — it cannot be the surviving record.",
    );
    // the surviving record is unchanged — the swap was refused, not applied
    expect(screen.getByText(`Master ID: ${TARGET_ID.slice(0, 8)}...`)).toBeTruthy();
  });
});
