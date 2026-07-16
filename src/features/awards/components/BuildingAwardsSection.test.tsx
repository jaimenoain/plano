// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BuildingAwardsSection } from "./BuildingAwardsSection";

const { useAwardsByBuildingMock } = vi.hoisted(() => ({
  useAwardsByBuildingMock: vi.fn(),
}));

vi.mock("../hooks/useAwards", () => ({
  useAwardsByBuilding: useAwardsByBuildingMock,
}));

vi.mock("./AwardRecipientCard", () => ({
  AwardRecipientCard: ({ recipient }: { recipient: { id: string } }) => (
    <div data-testid="award-card">{recipient.id}</div>
  ),
}));

vi.mock("./SuggestAwardButton", () => ({
  SuggestAwardButton: () => <button type="button">Suggest an award</button>,
}));

const awards = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `a${i + 1}` }));

function renderSection(variant?: "rail" | "feature", count = 2) {
  useAwardsByBuildingMock.mockReturnValue({ data: awards(count), isLoading: false });
  return render(
    <BuildingAwardsSection buildingId="b1" buildingName="Villa Savoye" variant={variant} />,
  );
}

afterEach(() => {
  cleanup();
  useAwardsByBuildingMock.mockReset();
});

describe("BuildingAwardsSection", () => {
  it("defaults to the rail micro-label head (regression guard for the sidebar)", () => {
    renderSection();
    const h2 = screen.getByRole("heading", { level: 2, name: "Awards" });
    expect(h2.className).toContain("text-[10px]");
    expect(screen.getAllByTestId("award-card")).toHaveLength(2);
  });

  it("renders the feature section head with a count eyebrow", () => {
    renderSection("feature", 3);
    const h2 = screen.getByRole("heading", { level: 2, name: "Awards" });
    expect(h2.className).toContain("text-2xl");
    expect(screen.getByText("3 awards")).toBeTruthy();
  });

  it("singularizes the count eyebrow", () => {
    renderSection("feature", 1);
    expect(screen.getByText("1 award")).toBeTruthy();
  });

  it("renders nothing while loading or when there are no awards", () => {
    useAwardsByBuildingMock.mockReturnValue({ data: [], isLoading: false });
    const { container } = render(
      <BuildingAwardsSection buildingId="b1" buildingName="Villa Savoye" variant="feature" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
