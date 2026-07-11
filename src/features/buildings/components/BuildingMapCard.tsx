import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuildingLocationMap } from "@/features/maps/components/BuildingLocationMap";

interface BuildingMapCardProps {
  coordinates: { lat: number; lng: number } | null;
  city: string | null;
  country: string | null;
  /** Approximate locations confirm before opening external directions. */
  isApproximate: boolean;
  onDirectionsBlocked: () => void;
}

/** Sidebar map card: square inline map with place line + Directions action. */
export function BuildingMapCard({
  coordinates,
  city,
  country,
  isApproximate,
  onDirectionsBlocked,
}: BuildingMapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) setIsExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  return (
    <div className="bg-surface-card border border-border-default rounded-none overflow-hidden">
      <div className="aspect-square relative">
        {coordinates ? (
          <div className={cn("h-full w-full transition-all duration-700", !isExpanded && "grayscale-[0.4] hover:grayscale-0")}>
            <BuildingLocationMap
              lat={coordinates.lat}
              lng={coordinates.lng}
              isExpanded={isExpanded}
              onToggleExpand={() => setIsExpanded(!isExpanded)}
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-surface-muted">
            <MapPin className="h-6 w-6 text-text-disabled" />
          </div>
        )}
      </div>
      <div className="p-3.5 flex items-center justify-between border-t border-border-default">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary min-w-0">
          <MapPin className="h-3 w-3 text-text-disabled shrink-0" />
          <span className="truncate">
            {[city, country].filter(Boolean).join(", ")}
          </span>
        </div>
        <button
          type="button"
          className="cta-link shrink-0"
          onClick={() => {
            if (isApproximate) {
              onDirectionsBlocked();
            } else {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${coordinates?.lat},${coordinates?.lng}`,
                "_blank",
              );
            }
          }}
        >
          Directions
        </button>
      </div>
    </div>
  );
}
