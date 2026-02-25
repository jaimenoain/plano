import { render, screen } from "@testing-library/react";
import { FolderCard } from "./FolderCard";
import { UserFolder } from "@/types/collection";
import { describe, it, expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

describe("FolderCard", () => {
  afterEach(() => {
    cleanup();
  });

  const mockFolder: UserFolder = {
    id: "1",
    owner_id: "user1",
    name: "My Folder",
    slug: "my-folder",
    description: "A test folder",
    is_public: true,
    created_at: new Date().toISOString(),
    items_count: 5,
    preview_images: ["img1.jpg", "img2.jpg"]
  };

  it("renders folder name and item count", () => {
    render(
      <MemoryRouter>
        <FolderCard folder={mockFolder} />
      </MemoryRouter>
    );
    expect(screen.getByText("My Folder")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("renders images when available", () => {
    const { container } = render(
      <MemoryRouter>
        <FolderCard folder={mockFolder} />
      </MemoryRouter>
    );
    // Images with empty alt have role="presentation", so getByRole('img') fails.
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(2);
  });

  it("renders placeholder when no images", () => {
    const emptyFolder = { ...mockFolder, preview_images: [] };
    const { container } = render(
      <MemoryRouter>
        <FolderCard folder={emptyFolder} />
      </MemoryRouter>
    );
    const images = container.querySelectorAll("img");
    expect(images.length).toBe(0);
  });
});
