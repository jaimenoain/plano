/**
 * Deterministic daily pick for the rail's "Today" module.
 *
 * The pick is a pure function of the calendar date and the candidate pool,
 * so every visitor sees the same building all day — it's an edition, not a
 * recommendation — and it rotates at midnight without any stored state.
 */

/** Local calendar date as a stable string key, e.g. "2026-07-16". */
export function dateKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** FNV-1a hash of the date key, mod pool size. Empty pool → null. */
export function pickBuildingOfTheDay<T>(rows: readonly T[], key: string): T | null {
  if (rows.length === 0) return null;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return rows[(hash >>> 0) % rows.length];
}
