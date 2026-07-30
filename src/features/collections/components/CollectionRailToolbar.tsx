/**
 * CollectionRailToolbar.tsx
 *
 * The chrome that stays put while the collection rail scrolls: the collection
 * name, the icon-only edit controls, the tab switcher and the search box. The
 * masthead above it (cover mosaic, description, labelled relationship actions)
 * is free to scroll away, which is the whole point — it used to eat ~300px of a
 * 22.5rem rail permanently and left almost nothing for the list.
 *
 * Design pre-flight
 * - Surface: the rail is already `surface-card`, so the bar repeats that solid
 *   fill rather than frosting. `LAYOUT-AND-CHROME.md` reserves `glass` for bars
 *   over photography, and the /search sidebar dropped its blur for this same
 *   reason — there is nothing behind a solid rail to see through to.
 * - Hierarchy: flat, with a hairline `border-b` carrying the separation. Once
 *   stuck it adds `shadow-xs`, the single-step lift the building-detail tab bar
 *   uses, so the list reads as passing *under* the bar rather than colliding.
 * - Type: `text-sm font-semibold` — one step down from the masthead's `text-2xl`
 *   `<h1>`, because this is a reminder of the title, not the title itself.
 * - Motion: the name row is always present at a fixed `h-11` and only its
 *   opacity animates. Rendering it conditionally would grow the sticky box
 *   mid-scroll and jump the list under the reader's finger. `h-11` because
 *   `icon-sm` buttons expand to a 44px touch target below `md`.
 * - A11y: the condensed name duplicates the masthead `<h1>`, which stays in the
 *   DOM the whole time, so it is permanently `aria-hidden`. A screen reader
 *   should meet one title — never a second one that materialises on scroll.
 *
 * Presentational only: the page owns the scroll container, the sentinel and
 * every control passed in.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CollectionRailToolbarProps {
  collectionName: string;
  /**
   * True once the masthead has scrolled out of the rail — fades the condensed
   * name in and lifts the bar. Doubles as the "is stuck" signal, because the
   * two happen at the same moment.
   */
  isStuck: boolean;
  /**
   * Icon-only controls, pinned here rather than left in the masthead so an
   * editor can add a building without scrolling back to the top.
   */
  actions: ReactNode;
  /** The tab switcher and the search box, in that order. */
  children?: ReactNode;
}

export function CollectionRailToolbar({
  collectionName,
  isStuck,
  actions,
  children,
}: CollectionRailToolbarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b border-border-default bg-surface-card transition-shadow duration-200",
        isStuck && "shadow-xs",
      )}
    >
      <div className="flex h-11 items-center justify-between gap-3 px-4">
        <span
          aria-hidden
          className={cn(
            "truncate text-sm font-semibold text-text-primary transition-opacity duration-200",
            isStuck ? "opacity-100" : "opacity-0",
          )}
        >
          {collectionName}
        </span>
        {actions}
      </div>
      {children}
    </div>
  );
}
