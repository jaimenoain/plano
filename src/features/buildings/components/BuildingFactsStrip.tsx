import { cn } from "@/lib/utils";
import { formatCoordinates, parseLocation } from "@/utils/location";
import {
  formatBuildingStatusForDisplay,
  shouldFlagConstructionStatus,
} from "@/lib/buildingStatus";
import type { BuildingDetails } from "../pages/BuildingDetails";

// ─── Facts strip ──────────────────────────────────────────────────────────────

export interface BuildingFact {
  label: string;
  value: string;
  /** Space Mono figures (coordinates). */
  mono?: boolean;
}

/** Priority-ordered facts for the strip, capped at 6 cells. */
export function buildFacts(building: BuildingDetails): BuildingFact[] {
  const facts: BuildingFact[] = [];

  const location = [building.city, building.country].filter(Boolean).join(", ");
  if (location) facts.push({ label: "Location", value: location });

  const coordinates = parseLocation(building.location);
  if (coordinates)
    facts.push({ label: "Coordinates", value: formatCoordinates(coordinates), mono: true });

  if (building.typology?.length)
    facts.push({
      label: building.typology.length === 1 ? "Typology" : "Typologies",
      value: building.typology.join(", "),
    });

  if (building.styles?.length)
    facts.push({ label: "Style", value: building.styles.map((s) => s.name).join(", ") });

  if (building.year_completed) {
    facts.push({ label: "Year", value: String(building.year_completed) });
  } else if (building.century) {
    facts.push({ label: "Year", value: `${building.century}th c.` });
  }

  if (building.status && shouldFlagConstructionStatus(building.status))
    facts.push({ label: "Status", value: formatBuildingStatusForDisplay(building.status) });

  return facts.slice(0, 6);
}

/** Static class map so Tailwind's JIT sees every column count we can render. */
const COLS_AT_LG: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

/**
 * The mock's `.bldg-facts` (building-detail.html): a border-top/bottom strip of
 * hairline-separated cells — 10px tracked label over a 15px medium value, with
 * a Space Mono variant for coordinates. Every cell carries a right hairline;
 * the wrapper's `overflow-hidden` + the grid's `-mr-px` clips each row's
 * trailing border at the strip edge, at any breakpoint or fact count.
 *
 * Renders nothing below 3 facts — sparse buildings fall through to the tab's
 * empty state instead of a lonely one-cell strip.
 */
export function BuildingFactsStrip({
  building,
  className,
}: {
  building: BuildingDetails;
  className?: string;
}) {
  const facts = buildFacts(building);
  if (facts.length < 3) return null;

  return (
    <div className={cn("overflow-hidden border-y border-border-default", className)}>
      <dl className={cn("-mr-px grid grid-cols-2 sm:grid-cols-3", COLS_AT_LG[facts.length])}>
        {facts.map(({ label, value, mono }) => (
          <div key={label} className="min-w-0 border-r border-border-default py-5 pr-5">
            <dt className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
              {label}
            </dt>
            <dd
              className={cn(
                "mt-2 text-text-primary",
                mono
                  ? "font-mono text-xs tracking-[0.02em] leading-relaxed"
                  : "text-[15px] font-medium leading-[1.35]",
              )}
            >
              {mono
                ? // Mock renders coordinates as stacked lat/lng lines — avoids
                  // an orphaned hemisphere letter when the cell is narrow.
                  value.split(" · ").map((part) => (
                    <span key={part} className="block whitespace-nowrap">
                      {part}
                    </span>
                  ))
                : value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
