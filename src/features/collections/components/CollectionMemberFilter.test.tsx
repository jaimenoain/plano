import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { CollectionMemberFilter } from "./CollectionMemberFilter";

const owner = { id: "owner-1", username: "jaimenoain", avatar_url: null };
const contributors = [
  { user_id: "collab-1", user: { id: "collab-1", username: "corbusier", avatar_url: null } },
];

describe("CollectionMemberFilter", () => {
  afterEach(cleanup);

  it("does not show the member list until 'Apply to specific members only' is checked", () => {
    render(
      <CollectionMemberFilter
        ownerId={owner.id}
        owner={owner}
        contributors={contributors}
        selectedMemberIds={null}
        onToggleScope={() => {}}
        onToggleMember={() => {}}
      />,
    );
    expect(screen.queryByText("jaimenoain")).not.toBeInTheDocument();
    expect(screen.queryByText("corbusier")).not.toBeInTheDocument();
  });

  it("lists the owner first, labelled 'Owner', above contributors", () => {
    render(
      <CollectionMemberFilter
        ownerId={owner.id}
        owner={owner}
        contributors={contributors}
        selectedMemberIds={[]}
        onToggleScope={() => {}}
        onToggleMember={() => {}}
      />,
    );
    expect(screen.getByText("jaimenoain")).toBeInTheDocument();
    expect(screen.getByText("(Owner)")).toBeInTheDocument();
    expect(screen.getByText("corbusier")).toBeInTheDocument();
  });

  it("toggles the owner id into the selection when its checkbox is clicked", () => {
    const onToggleMember = vi.fn();
    render(
      <CollectionMemberFilter
        ownerId={owner.id}
        owner={owner}
        contributors={contributors}
        selectedMemberIds={[]}
        onToggleScope={() => {}}
        onToggleMember={onToggleMember}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /jaimenoain/ }));
    expect(onToggleMember).toHaveBeenCalledWith(owner.id);
  });

  it("calls onToggleScope when the 'specific members' checkbox is toggled", () => {
    const onToggleScope = vi.fn();
    render(
      <CollectionMemberFilter
        ownerId={owner.id}
        owner={owner}
        contributors={contributors}
        selectedMemberIds={null}
        onToggleScope={onToggleScope}
        onToggleMember={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Apply to specific members only" }));
    expect(onToggleScope).toHaveBeenCalledWith(true);
  });
});
