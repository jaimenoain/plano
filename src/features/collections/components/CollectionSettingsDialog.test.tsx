import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { CollectionSettingsDialog } from "./CollectionSettingsDialog";

type DialogProps = ComponentProps<typeof CollectionSettingsDialog>;

// A single chainable Supabase builder that every query method returns and that is
// awaitable — resolving to a per-test configurable result. This lets both the
// on-open reads (fetchContributors / fetchCollectionFolders) and the settings
// UPDATE share one mock without threading through the exact call shape.
let queryResult: { data: unknown; error: unknown } = { data: [], error: null };

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom, functions: { invoke: vi.fn() } },
}));

vi.mock("sonner", () => ({ toast: mockToast }));

vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));

// Passthrough shells so the test exercises handleSaveGeneral, not Radix internals.
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: ReactNode; open: boolean }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  SheetFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
// Tab bodies host cross-feature children irrelevant to saving; the "Save Changes"
// button lives in the sheet footer (outside the tabs), so rendering no tab body
// keeps the test focused on handleSaveGeneral.
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: () => null,
}));

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  for (const m of ["update", "select", "insert", "delete", "eq", "maybeSingle", "single", "order", "in"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve(queryResult);
  return builder;
}

const collection = {
  id: "col-1",
  slug: "my-collection",
  name: "My Collection",
  description: "",
  is_public: true,
  external_link: "",
  show_community_images: true,
  categorization_method: "uniform",
  custom_categories: [],
  categorization_selected_members: null,
  owner_id: "owner-1",
} as unknown as DialogProps["collection"];

function renderDialog(overrides: Partial<DialogProps> = {}) {
  const onUpdate = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <CollectionSettingsDialog
      collection={collection}
      open
      onOpenChange={onOpenChange}
      onUpdate={onUpdate}
      isOwner
      canEdit
      currentUserId="owner-1"
      {...overrides}
    />,
  );
  return { onUpdate, onOpenChange };
}

describe("CollectionSettingsDialog — save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult = { data: [], error: null };
    mockFrom.mockImplementation(() => makeBuilder());
  });

  afterEach(cleanup);

  it("treats a zero-row update as a failure (no silent false success)", async () => {
    // RLS silently rejects: Supabase returns { data: [], error: null }.
    queryResult = { data: [], error: null };
    const { onUpdate, onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Failed to update collection"));
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("treats a returned row as success", async () => {
    queryResult = { data: [{ id: "col-1" }], error: null };
    const { onUpdate, onOpenChange } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Collection updated"));
    expect(mockToast.error).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
