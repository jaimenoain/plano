import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseCollectionViewMode, resolveDefaultCollectionViewMode,
  type CollectionViewMode } from "../collectionViewMode";

/**
 * The collection detail page's Map/List view mode.
 *
 * `useIsMobile` reads `false` during SSR and the first client render (there's
 * no viewport to check yet), then corrects itself once `matchMedia` runs — so
 * the mobile default can't be the `useState` initializer, and the effect that
 * applies it has to stay live across that false→true correction rather than
 * fire-and-latch. A ref tracks only whether the visitor has made an explicit
 * choice (`?view=` in the URL, or the toggle) — that's the one thing allowed
 * to block the viewport-driven default permanently.
 */
export function useCollectionViewMode(): [CollectionViewMode, (mode: CollectionViewMode) => void] {
  const [searchParams] = useSearchParams();
  const urlView = parseCollectionViewMode(searchParams.get("view"));
  const [viewMode, setViewModeState] = useState<CollectionViewMode>(urlView ?? "map");
  const isMobile = useIsMobile(1024);
  const hasExplicitChoice = useRef(urlView !== null);

  useEffect(() => {
    if (hasExplicitChoice.current) return;
    setViewModeState(resolveDefaultCollectionViewMode(isMobile));
  }, [isMobile]);

  const setViewMode = (mode: CollectionViewMode) => {
    hasExplicitChoice.current = true;
    setViewModeState(mode);
  };

  return [viewMode, setViewMode];
}
