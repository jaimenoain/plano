/** Building detail hero: landscape and wide enough for full-width display. */
export const BUILDING_HERO_MIN_WIDTH_PX = 1000;

export function isBuildingHeroEligibleSize(
  widthPx: number | null | undefined,
  heightPx: number | null | undefined,
): boolean {
  if (widthPx == null || heightPx == null) return false;
  if (!Number.isFinite(widthPx) || !Number.isFinite(heightPx)) return false;
  return widthPx >= BUILDING_HERO_MIN_WIDTH_PX && widthPx > heightPx;
}

export function pickFirstHeroEligibleStoragePath(
  rows: ReadonlyArray<{
    storage_path: string;
    width_px: number | null;
    height_px: number | null;
  }>,
): string | null {
  for (const row of rows) {
    if (isBuildingHeroEligibleSize(row.width_px, row.height_px)) {
      return row.storage_path;
    }
  }
  return null;
}
