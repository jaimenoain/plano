/**
 * useEmptyAreaNotice
 *
 * Show/hide logic for the map's "No buildings in this area" notice, kept out of
 * PlanoMap so it can be tested without mounting MapLibre.
 *
 * Three rules, each answering a way the old inline gate misbehaved:
 *
 * 1. **Settle before showing.** The raw "this view is empty" condition flips on
 *    every pan across sparse ground, so the notice used to nag. We require the
 *    condition to hold continuously for `SETTLE_MS` before the notice appears.
 * 2. **Sticky once shown.** An in-flight refetch makes `isEmpty` momentarily
 *    false without meaning "there are buildings here" — that is exactly what
 *    happens when the user clicks "Zoom out", and it used to make the notice
 *    flash away and come back. Once visible, the notice only leaves when results
 *    actually arrive (`hasResults`) or the user dismisses it.
 * 3. **Dismissal wins.** A dismissal suppresses the notice for 24h across
 *    reloads; it is hydrated in a layout effect so a suppressed notice never
 *    paints even for a frame.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { readEmptyNoticeDismissed, writeEmptyNoticeDismissed } from "../mapNoticePreferences";

/** How long the view must stay empty before the notice appears. */
export const SETTLE_MS = 1000;

export interface UseEmptyAreaNoticeOptions {
  /** The surface wants the notice at all (PlanoMap's `showEmptyMessage`). */
  enabled: boolean;
  /** The view has settled with nothing in it: not loading, bounds known, zero visible clusters. */
  isEmpty: boolean;
  /**
   * There are buildings in view *right now*. Distinct from `!isEmpty`, which is
   * also true while a fetch is in flight — only this clears a shown notice.
   */
  hasResults: boolean;
}

export interface UseEmptyAreaNoticeResult {
  visible: boolean;
  dismiss: () => void;
}

export function useEmptyAreaNotice({
  enabled,
  isEmpty,
  hasResults,
}: UseEmptyAreaNoticeOptions): UseEmptyAreaNoticeResult {
  const [shown, setShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Hydrate before paint: a user who dismissed the notice must not see it flash
  // on the first frame after a reload. localStorage is unavailable during SSR,
  // and the helper swallows that — the effect never runs on the server anyway.
  const hydratedRef = useRef(false);
  useLayoutEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (readEmptyNoticeDismissed(Date.now())) setDismissed(true);
  }, []);

  useEffect(() => {
    if (!enabled || dismissed) {
      setShown(false);
      return;
    }
    // Rule 2: results are the only thing that retires a shown notice. A bare
    // `!isEmpty` here would hide it on every refetch.
    if (hasResults) {
      setShown(false);
      return;
    }
    if (!isEmpty || shown) return;
    // Rule 1: arm the settle timer. Any change to `isEmpty` before it fires
    // re-runs this effect and clears it, so a quick pan never shows the notice.
    const timer = setTimeout(() => setShown(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [enabled, dismissed, isEmpty, hasResults, shown]);

  const dismiss = useCallback(() => {
    writeEmptyNoticeDismissed(Date.now());
    setDismissed(true);
    setShown(false);
  }, []);

  return { visible: enabled && shown && !dismissed, dismiss };
}
