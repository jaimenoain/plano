/**
 * Alt text for a building's hero image: "Name by Architect (Year) — City, Country",
 * with every unknown part dropped rather than rendered as a gap.
 */
export function buildingHeroAlt(
  building: { name: string; year_completed?: number | null; city?: string | null; country?: string | null },
  primaryName: string | null,
): string {
  return [
    building.name,
    primaryName ? `by ${primaryName}` : null,
    building.year_completed ? `(${building.year_completed})` : null,
    building.city && building.country ? `— ${building.city}, ${building.country}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
