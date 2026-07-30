import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import FieldModePage from "./FieldMode";
import type { NearbyPhotoGap } from "../api/fieldMode";

const requestLocation = vi.fn();
const fetchNearbyPhotoGaps = vi.fn();
const fetchMyActiveChapterId = vi.fn();
const fetchChapterLocalityCenter = vi.fn();

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

// The real hook builds `requestLocation` inside its body, so every render hands back a new
// function identity. Mirror that here — a mock with a stable identity hides the dependency
// loop this page had on first write (see the "asks for the position once" test below).
vi.mock("@/hooks/useUserLocation", () => ({
  useUserLocation: () => ({
    requestLocation: (...args: unknown[]) => requestLocation(...args),
  }),
}));

vi.mock("../api/fieldMode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/fieldMode")>();
  return {
    ...actual,
    fetchMyActiveChapterId: (...args: unknown[]) => fetchMyActiveChapterId(...args),
    fetchNearbyPhotoGaps: (...args: unknown[]) => fetchNearbyPhotoGaps(...args),
  };
});

vi.mock("../api/photoUpload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/photoUpload")>();
  return {
    ...actual,
    fetchChapterLocalityCenter: (...args: unknown[]) => fetchChapterLocalityCenter(...args),
  };
});

function gap(overrides: Partial<NearbyPhotoGap> = {}): NearbyPhotoGap {
  return {
    id: "b1",
    shortId: 1,
    slug: "barbican-estate",
    name: "Barbican Estate",
    city: "London",
    lat: 51.5193,
    lng: -0.0939,
    distanceMeters: 79,
    ...overrides,
  };
}

// vitest runs without `globals`, so RTL's auto-cleanup afterEach never registers.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  fetchMyActiveChapterId.mockResolvedValue("chapter-1");
  fetchChapterLocalityCenter.mockResolvedValue({ lat: 51.5074, lng: -0.1278 });
});

describe("FieldModePage", () => {
  it("lists nearby gaps with their distance, nearest first", async () => {
    requestLocation.mockResolvedValue({ lat: 51.52, lng: -0.0937 });
    fetchNearbyPhotoGaps.mockResolvedValue([
      gap(),
      gap({ id: "b2", name: "Golden Lane", distanceMeters: 1339 }),
    ]);

    renderWithProviders(<FieldModePage />);

    expect(await screen.findByText("Barbican Estate")).toBeInTheDocument();
    expect(screen.getByText(/79 m/)).toBeInTheDocument();
    expect(screen.getByText(/1.3 km/)).toBeInTheDocument();
    expect(screen.getByText(/Within 2 km of you/)).toBeInTheDocument();
  });

  /**
   * Regression guard. `requestLocation` is a new function on every render and sets state when
   * called, so depending on it in the locate effect re-fired forever — the page rendered as a
   * spinner and the console filled with "Maximum update depth exceeded".
   */
  it("asks for the position once, not once per render", async () => {
    requestLocation.mockResolvedValue({ lat: 51.52, lng: -0.0937 });
    fetchNearbyPhotoGaps.mockResolvedValue([gap()]);

    renderWithProviders(<FieldModePage />);

    expect(await screen.findByText("Barbican Estate")).toBeInTheDocument();
    expect(requestLocation).toHaveBeenCalledTimes(1);
  });

  /** The substitution must be visible: a chapter centre is not where you are standing. */
  it("falls back to the chapter centre when location is refused, and says so", async () => {
    requestLocation.mockResolvedValue(null);
    fetchNearbyPhotoGaps.mockResolvedValue([gap()]);

    renderWithProviders(<FieldModePage />);

    expect(await screen.findByText("Using your chapter's centre")).toBeInTheDocument();
    expect(screen.getByText(/couldn't read your location/)).toBeInTheDocument();
    await waitFor(() => expect(fetchChapterLocalityCenter).toHaveBeenCalledWith("chapter-1"));
    expect(fetchNearbyPhotoGaps).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 51.5074, lng: -0.1278 }),
    );
  });

  it("offers a wider search when nothing is in range, and re-queries with it", async () => {
    requestLocation.mockResolvedValue({ lat: 51.52, lng: -0.0937 });
    fetchNearbyPhotoGaps.mockResolvedValue([]);

    renderWithProviders(<FieldModePage />);

    const widen = await screen.findByRole("button", { name: /Search 10 km/ });
    await userEvent.click(widen);

    await waitFor(() =>
      expect(fetchNearbyPhotoGaps).toHaveBeenLastCalledWith(
        expect.objectContaining({ radiusMeters: 10000 }),
      ),
    );
  });

  it("explains itself when there is no position at all", async () => {
    requestLocation.mockResolvedValue(null);
    fetchChapterLocalityCenter.mockResolvedValue(null);

    renderWithProviders(<FieldModePage />);

    expect(await screen.findByText("We can't tell where you are")).toBeInTheDocument();
    expect(fetchNearbyPhotoGaps).not.toHaveBeenCalled();
  });
});
