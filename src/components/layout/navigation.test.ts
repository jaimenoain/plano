import { describe, it, expect } from "vitest";
import { appNavItems, navItemsFor } from "./navigation";

describe("appNavItems — My Map is a first-class destination", () => {
  const myMap = appNavItems.find((item) => item.label === "My Map");

  it("routes My Map to /map?mode=library on every surface", () => {
    expect(myMap).toBeDefined();
    expect(myMap!.path).toBe("/map?mode=library");
    expect(myMap!.surfaces).toEqual(["top", "sidebar", "bottom"]);
  });

  it("gave Events' bottom-bar slot to My Map (Events keeps top + sidebar)", () => {
    const events = appNavItems.find((item) => item.label === "Events");
    expect(events).toBeDefined();
    expect(events!.surfaces).toEqual(["top", "sidebar"]);
  });

  it("keeps the bottom bar at six items, My Map third — beside Explore and Search", () => {
    const bottom = navItemsFor("bottom").map((item) => item.label);
    expect(bottom).toEqual(["Feed", "Explore", "My Map", "Search", "Connect", "You"]);
  });

  it("lists My Map between Explore and Guides in the top nav", () => {
    const top = navItemsFor("top").map((item) => item.label);
    expect(top.indexOf("My Map")).toBe(top.indexOf("Explore") + 1);
    expect(top).toContain("Events");
  });
});
