// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { createMapStore, type MapStore } from "../stores/useMapStore";
import { parseMapStateFromParams } from "./useURLMapState";
import { useMapUrlSync } from "./useMapUrlSync";

/**
 * /map and /search are the same route now — `mode` always round-trips through
 * the URL, both in (hydrateFromURL) and out (the store→URL writer).
 *
 * BrowserRouter (not MemoryRouter) because the writer reads the LIVE
 * `window.location.search`; popstate simulates an external URL change so the
 * hook's own input effect does the hydrating.
 */

function Harness({ store }: { store: MapStore }) {
  useMapUrlSync(store);
  return null;
}

function mountAt(url: string) {
  window.history.replaceState(null, "", url);
  const seeded = parseMapStateFromParams(new URLSearchParams(window.location.search));
  const store = createMapStore(seeded);
  render(
    <BrowserRouter>
      <Harness store={store} />
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

describe("useMapUrlSync", () => {
  it("hydrates mode from the URL on mount", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13&mode=library");
    expect(store.getState().mode).toBe("library");
  });

  it("re-hydrates mode when an external URL change occurs", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13&mode=library");

    navigateExternally("/map?lat=48.8&lng=2.35&zoom=12");

    expect(store.getState().lat).toBe(48.8);
    expect(store.getState().mode).toBeNull();
  });

  it("writes `mode` to the URL alongside the viewport", () => {
    const store = mountAt("/map?lat=51.5&lng=-0.12&zoom=13&mode=library");

    act(() => {
      store.getState().setViewport({ lat: 40.4, lng: -3.7, zoom: 11 });
    });

    const search = new URLSearchParams(window.location.search);
    expect(search.get("mode")).toBe("library");
    expect(search.get("lat")).toBe("40.4");
    expect(store.getState().mode).toBe("library");
  });
});
