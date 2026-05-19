/** Ordinal label for a building century value (e.g. 20 → "20th century"). */
export function formatCenturyLabel(century: number): string {
  const mod100 = century % 100;
  const mod10 = century % 10;
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
  return `${century}${suffix} century`;
}

/** Global filter options — 10th through 21st century. */
export const CENTURY_FILTER_ITEMS: { id: string; name: string }[] = Array.from(
  { length: 12 },
  (_, i) => {
    const century = i + 10;
    return { id: String(century), name: formatCenturyLabel(century) };
  },
);

export function parseCenturyIds(ids: string[]): number[] {
  return ids
    .map((id) => parseInt(id, 10))
    .filter((n) => Number.isInteger(n) && n >= 1);
}
