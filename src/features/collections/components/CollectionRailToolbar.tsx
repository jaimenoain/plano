/**
 * CollectionRailToolbar.tsx
 *
 * The chrome that stays put while the collection rail scrolls: the search box,
 * the icon-only edit controls and — when the collection has one — the tab
 * switcher. The masthead above it (cover mosaic, title, byline, description,
 * labelled relationship actions) is free to scroll away, which is the whole
 * point: it used to eat ~300px of a 22.5rem rail permanently and left almost
 * nothing for the list.
 *
 * Design pre-flight
 * - Density: the search field and the icon cluster share ONE row. They used to
 *   be stacked, and because the condensed name beside the icons stayed
 *   invisible until the bar stuck, the rail opened with a 44px band that was
 *   empty at exactly the scroll position every reader starts at. A search field
 *   with the controls that act on the same list parked at its right edge is the
 *   ordinary list-panel arrangement, and it leaves the hairline under the
 *   chrome one job instead of two.
 * - The condensed name went with that row. It was `aria-hidden` decoration
 *   duplicating an `<h1>` that is still in the DOM, and the rail cannot be
 *   mistaken for another collection's: the map beside it, the URL and the
 *   field's own "Search this collection" label all name it.
 * - Surface: the rail is already `surface-card`, so the bar repeats that solid
 *   fill rather than frosting. `LAYOUT-AND-CHROME.md` reserves `glass` for bars
 *   over photography, and the /search sidebar dropped its blur for this same
 *   reason — there is nothing behind a solid rail to see through to.
 * - Hierarchy: flat, with a hairline `border-b` carrying the separation. Once
 *   stuck it adds `shadow-xs`, the single-step lift the building-detail tab bar
 *   uses, so the list reads as passing *under* the bar rather than colliding.
 * - Motion: nothing about the box changes on scroll except that shadow. Its
 *   height is identical stuck and at rest, so the list never jumps under the
 *   reader's finger.
 * - Alignment: the row is `items-start`, so the match count that appears under
 *   the field pushes nothing around. The actions are centred inside a `min-h-10`
 *   box instead — `h-10` being the field's own height, and 44px on mobile where
 *   `icon-sm` buttons expand to a full touch target.
 *
 * Presentational only: the page owns the scroll container, the sentinel and
 * every control passed in.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CollectionRailToolbarProps {
  /**
   * True once the masthead has scrolled out of the rail — lifts the bar off the
   * list. Doubles as the "is stuck" signal, because the two happen at the same
   * moment.
   */
  isStuck: boolean;
  /**
   * Icon-only controls, pinned here rather than left in the masthead so an
   * editor can add a building without scrolling back to the top.
   */
  actions: ReactNode;
  /**
   * The search field for the active tab. Omitted on a tab that cannot be
   * searched — the itinerary — and then the actions ride the tab switcher's row
   * instead of opening one of their own.
   */
  search?: ReactNode;
  /** The tab switcher, when the collection has one. It chooses what search filters. */
  children?: ReactNode;
}

export function CollectionRailToolbar({
  isStuck,
  actions,
  search,
  children,
}: CollectionRailToolbarProps) {
  // Whichever row exists carries them; they never get a row to themselves.
  const actionCluster = <div className="flex min-h-10 shrink-0 items-center">{actions}</div>;

  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b border-border-default bg-surface-card transition-shadow duration-200",
        isStuck && "shadow-xs",
      )}
    >
      {children && (
        <div className={cn("flex items-center gap-2 px-4 pt-3", !search && "pb-3")}>
          <div className="min-w-0 flex-1">{children}</div>
          {!search && actionCluster}
        </div>
      )}
      {search && (
        <div className="flex items-start gap-1 px-4 py-3">
          <div className="min-w-0 flex-1">{search}</div>
          {actionCluster}
        </div>
      )}
      {!search && !children && (
        <div className="flex justify-end px-4 py-3">{actionCluster}</div>
      )}
    </div>
  );
}
