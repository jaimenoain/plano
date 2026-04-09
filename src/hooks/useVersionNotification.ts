import { useEffect } from "react";

const STORAGE_KEY_VERSION   = "plano_last_notified_version";
const STORAGE_KEY_TIMESTAMP = "plano_last_notified_at";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Returns true if `next` is a higher major or minor version than `prev`.
 * Patch-only bumps (0.1.0 → 0.1.1) return false.
 */
function isSignificantUpgrade(prev: string, next: string): boolean {
  const [prevMaj, prevMin] = prev.split(".").map(Number);
  const [nextMaj, nextMin] = next.split(".").map(Number);
  return nextMaj > prevMaj || (nextMaj === prevMaj && nextMin > prevMin);
}

/**
 * Call once near the app root (e.g. inside the Layout component in root.tsx).
 *
 * Shows a notification when:
 *  - The app's major or minor version has increased since the user last saw a
 *    notification (patch bumps are silent), OR
 *  - More than two weeks have passed since the last notification, regardless
 *    of version.
 *
 * Pass a `notify` callback that renders whatever UI you want (toast, banner…).
 * The callback receives the current version string for display purposes.
 */
export function useVersionNotification(notify: (version: string) => void) {
  useEffect(() => {
    const current        = __APP_VERSION__;
    const lastVersion    = localStorage.getItem(STORAGE_KEY_VERSION)   ?? "0.0.0";
    const lastNotifiedAt = Number(localStorage.getItem(STORAGE_KEY_TIMESTAMP) ?? "0");
    const now            = Date.now();

    const significantBump = isSignificantUpgrade(lastVersion, current);
    const twoWeeksPassed  = now - lastNotifiedAt > TWO_WEEKS_MS;

    if (significantBump || twoWeeksPassed) {
      notify(current);
      localStorage.setItem(STORAGE_KEY_VERSION,   current);
      localStorage.setItem(STORAGE_KEY_TIMESTAMP, String(now));
    }
  }, []);
}
