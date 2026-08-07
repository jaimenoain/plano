// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { CollaboratorsList, type Contributor } from "./CollaboratorsList";

afterEach(cleanup);

const { fetchCollectionOwnerProfile } = vi.hoisted(() => ({
  fetchCollectionOwnerProfile: vi.fn(),
}));

vi.mock("../api/collaboration", () => ({ fetchCollectionOwnerProfile }));

const OWNER = { id: "owner-1", username: "ownerUser", avatar_url: null };
const CONTRIBUTOR: Contributor = {
  user_id: "editor-1",
  user: { id: "editor-1", username: "editorUser", avatar_url: null },
};

function renderList(props: Partial<Parameters<typeof CollaboratorsList>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onRemove = vi.fn();
  const onLeave = vi.fn();
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <CollaboratorsList
        ownerId={OWNER.id}
        contributors={[CONTRIBUTOR]}
        loading={false}
        currentUserId="someone-else"
        isOwner={false}
        onRemove={onRemove}
        onLeave={onLeave}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...utils, onRemove, onLeave };
}

beforeEach(() => {
  fetchCollectionOwnerProfile.mockReset();
  fetchCollectionOwnerProfile.mockResolvedValue(OWNER);
});

describe("CollaboratorsList", () => {
  it("renders the owner above contributors, labelled Owner", async () => {
    renderList();

    await waitFor(() => expect(screen.getByText("ownerUser")).toBeInTheDocument());
    expect(screen.getByText(/Owner/)).toBeInTheDocument();
    expect(screen.getByText("editorUser")).toBeInTheDocument();

    const rows = screen.getAllByText(/ownerUser|editorUser/);
    expect(rows[0]).toHaveTextContent("ownerUser");
  });

  it("never shows a remove or leave action on the owner row, even when viewer is owner", async () => {
    renderList({ isOwner: true, currentUserId: OWNER.id });

    await waitFor(() => expect(screen.getByText("ownerUser")).toBeInTheDocument());
    // The owner row itself carries no button; only the contributor row may.
    const ownerRow = screen.getByText("ownerUser").closest("div.flex.items-center.justify-between");
    expect(ownerRow?.querySelector("button")).toBeNull();
  });

  it("still shows the owner and the empty-state copy when there are no contributors", async () => {
    renderList({ contributors: [] });

    await waitFor(() => expect(screen.getByText("ownerUser")).toBeInTheDocument());
    expect(screen.getByText("No collaborators yet.")).toBeInTheDocument();
  });

  it("shows You on the owner row when the viewer is the owner", async () => {
    renderList({ currentUserId: OWNER.id, isOwner: true });

    await waitFor(() => expect(screen.getByText(/Owner · You/)).toBeInTheDocument());
  });

  it("shows remove for the owner viewing a contributor", async () => {
    const { onRemove, unmount } = renderList({ isOwner: true, currentUserId: OWNER.id });
    await waitFor(() => expect(screen.getByText("editorUser")).toBeInTheDocument());
    const removeButton = screen.getByText("editorUser").closest("div.flex.items-center.justify-between")
      ?.querySelector("button");
    expect(removeButton).not.toBeNull();
    removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith("editor-1");
    unmount();
  });

  it("shows leave for the contributor viewing themself", async () => {
    const { onLeave } = renderList({ isOwner: false, currentUserId: "editor-1" });
    await waitFor(() => expect(screen.getByText("editorUser")).toBeInTheDocument());
    const leaveButton = screen.getByText("editorUser")
      .closest("div.flex.items-center.justify-between")
      ?.querySelector("button");
    expect(leaveButton).not.toBeNull();
    leaveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onLeave).toHaveBeenCalled();
  });
});
