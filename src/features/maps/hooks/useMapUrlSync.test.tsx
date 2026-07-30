// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { createMapStore, type MapStore } from "../stores/useMapStore";
import { parseMapStateFromParams } from "./useURLMapState";
import { useMapUrlSync } from "./useMapUrlSync";

/**
 * The /map invariant: with a forced mode, (1) the store's mode survives every
 * URL→store hydrate even though a mode-less URL parses to `mode: null` —
 * hydrateFromURL sets mode unconditionally, so without the override the first
 * echo would silently reset /map to global ranking — and (2) the store→URL
 * writer never serializes `mode`.
 *
 * BrowserRouter (not MemoryRouter) because the writer reads the LIVE
 * `window.location.search`; popstate simulates an external URL change so the
 * hook's own input effect does the hydrating.
 */

function Harness({ store, forcedMode }: { store: MapStore; forcedMode?: "library" }) {
  useMapUrlSync(store, forcedMode ? { forcedMode } : undefined);
  return null;
}

function mountAt(url: string, forcedMode?: "library") {
  window.history.replaceState(null, "", url);
  const seeded = parseMapStateFromParams(new URLSearchParams(window.location.search));
  const store = createMapStore(forcedMode ? { ...seeded, mode: forcedMode } : seeded);
  render(
    <BrowserRouter>
      <Harness store={store} forcedMode={forcedMode} />
    </BrowserRouter>,
  );
  return store;
}

function navigateExternally(url: string) {
  act(() => {
    window.history.pushState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("useMapUrlSync with a forced mode (/map)", () => {
  it("keeps the forced mode through the mount hydrate of a mode-less URL", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13", "library");
    expect(store.getState().mode).toBe("library");
  });

  it("keeps the forced mode when an external URL change re-hydrates the store", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13", "library");

    navigateExternally("/map?lat=48.8&lng=2.35&zoom=12");

    expect(store.getState().lat).toBe(48.8);
    expect(store.getState().mode).toBe("library");
  });

  it("without the forced mode, the same external hydrate resets mode to null (the failure the override prevents)", () => {
    const store = mountAt("/search?lat=51.5&lng=-0.12&zoom=13&mode=library");
    expect(store.getState().mode).toBe("library");

    navigateExternally("/search?lat=48.8&lng=2.35&zoom=12");

    expect(store.getState().mode).toBeNull();
  });

  it("never writes `mode` to the URL while forced, but still writes the viewport", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13", "library");

    act(() => {
      store.getState().setViewport({ lat: 40.4, lng: -3.7, zoom: 11 });
    });

    const search = new URLSearchParams(window.location.search);
    expect(search.get("mode")).toBeNull();
    expect(search.get("lat")).toBe("40.4");
    expect(store.getState().mode).toBe("library");
  });
});
