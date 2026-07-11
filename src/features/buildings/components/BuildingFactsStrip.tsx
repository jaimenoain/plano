import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatBuildingStatusForDisplay } from "@/lib/buildingStatus";
import { formatCatalogLabel } from "./BuildingInfoSection";
import type { BuildingDetails } from "../pages/BuildingDetails";

interface FactCell {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** `48.9244° N` / `2.0280° E` — the mock's mono coordinate treatment. */
export function formatCoordinate(value: number, axis: "lat" | "lng"): string {
  const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`;
}

/** Literal class map — Tailwind can't see dynamically composed names. */
const COLS_LG: Record<number, string> = {
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export function buildFactCells(
  building: BuildingDetails,
  coordinates: { lat: number; lng: number } | null,
): FactCell[] {
  const cells: FactCell[] = [];

  const location = [building.city, building.country].filter(Boolean).join(", ") || building.address;
  if (location) cells.push({ label: "Location", value: location });

  if (building.year_completed) {
    cells.push({ label: "Year", value: String(building.year_completed) });
  } else if (building.century) {
    cells.push({ label: "Year", value: `${building.century}th c.` });
  } else if (coordinates) {
    cells.push({
      label: "Coordinates",
      mono: true,
      value: (
        <>
          {formatCoordinate(coordinates.lat, "lat")}
          <br />
          {formatCoordinate(coordinates.lng, "lng")}
        </>
      ),
    });
  }

  const typology = building.typology?.slice(0, 2).join(" · ") || building.category;
  if (typology) cells.push({ label: "Typology", value: typology });

  const style = building.styles?.slice(0, 2).map((s) => s.name).join(" · ");
  if (style) cells.push({ label: "Style", value: style });

  const statusAccess = [
    building.status ? formatBuildingStatusForDisplay(building.status) : null,
    formatCatalogLabel(building.access_level),
  ]
    .filter(Boolean)
    .join(" · ");
  if (statusAccess) cells.push({ label: "Status", value: statusAccess });

  if (building.tier_rank) cells.push({ label: "Plano Rank", value: building.tier_rank });

  return cells.slice(0, 6);
}

/**
 * Ruled-grid position of a cell at one breakpoint's column count: row-end
 * cells drop their right rule, last-row cells drop their bottom rule (the
 * strip's own border-y draws the outer rules).
 */
function cellPosition(index: number, total: number, cols: number) {
  const remainder = total % cols;
  const lastRowStart = total - (remainder === 0 ? cols : remainder);
  return {
    rowStart: index % cols === 0,
    rowEnd: (index + 1) % cols === 0 || index === total - 1,
    lastRow: index >= lastRowStart,
  };
}

/**
 * Slim ruled grid of key facts under the masthead, always visible across tabs
 * (mock: building-detail.html .bldg-facts). Empty facts drop their cell; fewer
 * than three surviving cells hides the strip entirely — the sidebar info list
 * still carries everything.
 */
export function BuildingFactsStrip({
  building,
  coordinates,
}: {
  building: BuildingDetails;
  coordinates: { lat: number; lng: number } | null;
}) {
  const cells = buildFactCells(building, coordinates);
  if (cells.length < 3) return null;

  const lgCols = cells.length;

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8">
      <dl
        className={cn(
          "mt-10 md:mt-14 grid grid-cols-2 md:grid-cols-3 border-y border-border-default",
          COLS_LG[lgCols],
        )}
      >
        {cells.map((cell, i) => {
          const sm = cellPosition(i, cells.length, 2);
          const md = cellPosition(i, cells.length, 3);
          const lg = cellPosition(i, cells.length, lgCols);
          return (
            <div
              key={cell.label}
              className={cn(
                "py-5 pr-4 border-border-default",
                sm.rowStart ? "pl-0" : "pl-4",
                sm.rowEnd ? "border-r-0" : "border-r",
                sm.lastRow ? "border-b-0" : "border-b",
                md.rowStart ? "md:pl-0" : "md:pl-4",
                md.rowEnd ? "md:border-r-0" : "md:border-r",
                md.lastRow ? "md:border-b-0" : "md:border-b",
                lg.rowStart ? "lg:pl-0" : "lg:pl-5",
                lg.rowEnd ? "lg:border-r-0" : "lg:border-r",
                lg.lastRow ? "lg:border-b-0" : "lg:border-b",
              )}
            >
              <dt className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
                {cell.label}
              </dt>
              <dd
                className={cn(
                  "mt-2 leading-[1.35]",
                  cell.mono
                    ? "meta-code text-text-primary"
                    : "text-[15px] font-medium text-text-primary",
                )}
              >
                {cell.value}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
