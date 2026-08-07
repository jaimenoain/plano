import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, afterEach } from "vitest";
import { AddedToCollectionToast } from "./AddedToCollectionToast";

describe("AddedToCollectionToast", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing for an empty collection list", () => {
    const { container } = render(
      <MemoryRouter>
        <AddedToCollectionToast collections={[]} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one 'Open collection' link per collection, pointing at /:username/map/:slug", () => {
    render(
      <MemoryRouter>
        <AddedToCollectionToast
          collections={[
            { id: "1", name: "Brutalist favourites", slug: "brutalist", ownerUsername: "jane" },
            { id: "2", name: "To visit", slug: "to-visit", ownerUsername: "jane" },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Brutalist favourites")).toBeDefined();
    expect(screen.getByText("To visit")).toBeDefined();

    const links = screen.getAllByRole("link", { name: "Open collection" });
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/jane/map/brutalist");
    expect(links[1].getAttribute("href")).toBe("/jane/map/to-visit");
  });

  it("uses the collection owner's username, not necessarily the viewer's", () => {
    render(
      <MemoryRouter>
        <AddedToCollectionToast
          collections={[{ id: "1", name: "Shared list", slug: "shared", ownerUsername: "owner-user" }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Open collection" }).getAttribute("href")).toBe(
      "/owner-user/map/shared",
    );
  });
});
