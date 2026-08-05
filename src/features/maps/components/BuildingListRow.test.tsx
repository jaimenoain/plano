/**
 * BuildingListRow.test.tsx
 *
 * The row is a <Link> whose plain click is hijacked to open the detail drawer.
 * The regression this locks down: it used to cancel the navigation even when no
 * handler existed, so the Discover bands' rows did nothing at all on click.
 */
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { vi, describe, it, expect, afterEach } from "vitest";
import { BuildingListRow } from "./BuildingListRow";

/**
 * React Router's own Link calls preventDefault to route on the client, so
 * `defaultPrevented` cannot tell "navigated" from "swallowed" — only the
 * resulting location can.
 */
function CurrentPath() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderRow(props: Partial<Parameters<typeof BuildingListRow>[0]> = {}) {
  return render(
    <MemoryRouter initialEntries={["/u/map/brutalism"]}>
      <BuildingListRow href="/building/villa-savoye" name="Villa Savoye" {...props} />
      <CurrentPath />
    </MemoryRouter>,
  );
}

function currentPath() {
  return screen.getByTestId("path").textContent;
}

function clickRow(init: MouseEventInit = {}) {
  const link = screen.getByRole("link", { name: /Villa Savoye/ });
  // `button: 0` and a cancelable event are what Link's own handler requires
  // before it will route; without them every case would "not navigate".
  fireEvent.click(link, { button: 0, ...init });
}

describe("BuildingListRow — plain click", () => {
  afterEach(cleanup);

  it("opens the drawer and does not navigate when onSelect is given", () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });

    clickRow();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(currentPath()).toBe("/u/map/brutalism");
  });

  it("navigates when there is no onSelect, instead of swallowing the click", () => {
    renderRow();

    clickRow();

    expect(currentPath()).toBe("/building/villa-savoye");
  });

  it("lets a ⌘-click through so 'open in new tab' still works", () => {
    const onSelect = vi.fn();
    renderRow({ onSelect });

    clickRow({ metaKey: true });

    // The browser handles the modified click itself; neither the drawer nor an
    // in-page navigation may pre-empt it.
    expect(onSelect).not.toHaveBeenCalled();
    expect(currentPath()).toBe("/u/map/brutalism");
  });

  it("fires hover callbacks for the list ↔ map cross-highlight", () => {
    const onHoverEnter = vi.fn();
    const onHoverLeave = vi.fn();
    renderRow({ onSelect: () => {}, onHoverEnter, onHoverLeave });

    const link = screen.getByRole("link", { name: /Villa Savoye/ });
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);

    expect(onHoverEnter).toHaveBeenCalledTimes(1);
    expect(onHoverLeave).toHaveBeenCalledTimes(1);
  });
});
