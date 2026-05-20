/** Sentinel in filter URL/state: include buildings whose `century` is B.C. (`century < 1`). */
export const CENTURY_BC_FILTER_VALUE = 0;

/** Ordinal label for a building century value (e.g. 20 → "20th century"). */
export function formatCenturyLabel(century: number): string {
  const abs = Math.abs(century);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : mod10 === 1
        ? "st"
        : mod10 === 2
          ? "nd"
          : mod10 === 3
            ? "rd"
            : "th";
  if (century < 0) {
    return `${abs}${suffix} century B.C.`;
  }
  return `${century}${suffix} century`;
}

/** Global filter options — 21st through 1st century (newest first), then B.C. */
export const CENTURY_FILTER_ITEMS: { id: string; name: string }[] = [
  ...Array.from({ length: 21 }, (_, i) => {
    const century = 21 - i;
    return { id: String(century), name: formatCenturyLabel(century) };
  }),
  {
    id: String(CENTURY_BC_FILTER_VALUE),
    name: "B.C.",
  },
];

export function parseCenturyIds(ids: string[]): number[] {
  return ids
    .map((id) => parseInt(id, 10))
    .filter(
      (n) =>
        Number.isInteger(n) &&
        (n >= 1 || n === CENTURY_BC_FILTER_VALUE),
    );
}

/** Client-side century filter (OR across selected centuries and optional B.C.). */
export function matchesCenturyFilter(
  buildingCentury: number | null | undefined,
  selectedCenturies: number[],
): boolean {
  if (selectedCenturies.length === 0) return true;
  if (buildingCentury == null) return false;

  const includeBc = selectedCenturies.includes(CENTURY_BC_FILTER_VALUE);
  const positiveCenturies = selectedCenturies.filter((c) => c > 0);

  if (positiveCenturies.includes(buildingCentury)) return true;
  if (includeBc && buildingCentury < 1) return true;
  return false;
}
