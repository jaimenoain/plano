import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddToCollectionButton } from "./AddToCollectionButton";

afterEach(cleanup);

describe("AddToCollectionButton", () => {
  it("names the building it would add, since the icon alone says nothing", () => {
    render(
      <AddToCollectionButton buildingName="Serpentine Pavilion" isAdding={false} onAdd={vi.fn()} />,
    );
    expect(
      screen.getByLabelText("Add Serpentine Pavilion to this collection"),
    ).toBeInTheDocument();
  });

  it("adds on click", async () => {
    const onAdd = vi.fn();
    render(<AddToCollectionButton buildingName="Barbican" isAdding={false} onAdd={onAdd} />);

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("does not let the click reach the row link underneath", async () => {
    const onRowClick = vi.fn();
    render(
      <a href="/building/1" onClick={onRowClick}>
        <AddToCollectionButton buildingName="Barbican" isAdding={false} onAdd={vi.fn()} />
      </a>,
    );

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("cannot be pressed while its own add is in flight", async () => {
    const onAdd = vi.fn();
    render(<AddToCollectionButton buildingName="Barbican" isAdding onAdd={onAdd} />);

    const button = screen.getByLabelText("Add Barbican to this collection");
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("cannot be pressed while another row is mid-add", async () => {
    const onAdd = vi.fn();
    render(
      <AddToCollectionButton buildingName="Barbican" isAdding={false} disabled onAdd={onAdd} />,
    );

    await userEvent.click(screen.getByLabelText("Add Barbican to this collection"));

    expect(onAdd).not.toHaveBeenCalled();
  });
});
