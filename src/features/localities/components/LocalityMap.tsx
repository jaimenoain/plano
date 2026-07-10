import { useMemo, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/common/ClientOnly";
import { cn } from "@/lib/utils";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import type { DiscoveryBuilding } from "@/features/search/components/types";
import { getLocalityMapBuildings } from "../api/localitiesApi";
import type { LocalityBuildingDTO } from "../types";
import { SectionLabel } from "./SectionLabel";

const CollectionMapGL = lazyWithRetry(
  () =>
    import("@/features/maps/components/CollectionMapGL").then((m) => ({
      default: m.CollectionMapGL,
    })),
);

// ---------------------------------------------------------------------------
// LocalityMap with Smart Filters
// ---------------------------------------------------------------------------

const STYLE_FILTERS = [
  { label: "Brutalist", value: "Brutalism" },
  { label: "Modernist", value: "Modernism" },
  { label: "Art Deco", value: "Art Deco" },
  { label: "Gothic", value: "Gothic" },
  { label: "High-Tech", value: "High-Tech" },
] as const;

const ACCESS_FILTERS = [
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
] as const;

const STATUS_FILTERS = [
  { label: "Existing", value: "Built" },
  { label: "Under construction", value: "Under Construction" },
  { label: "Lost", value: "Lost" },
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number]["value"] | null;
type AccessFilter = (typeof ACCESS_FILTERS)[number]["value"] | null;
type StatusFilter = (typeof STATUS_FILTERS)[number]["value"] | null;

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center border px-3 py-2 text-2xs font-medium uppercase tracking-widest transition-colors",
        active
          ? "border-text-primary bg-text-primary text-text-inverse"
          : "border-border-default text-text-secondary hover:border-text-primary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function LocalityMap({ localityId }: { localityId: string }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [styleFilter, setStyleFilter] = useState<StyleFilter>(null);
  const [accessFilter, setAccessFilter] = useState<AccessFilter>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);

  const { data: mapBuildings = [] } = useQuery({
    queryKey: ["localities", localityId, "map-buildings"],
    queryFn: () => getLocalityMapBuildings(localityId),
    staleTime: 300_000,
  });

  type LocalityMapBuildingRow = LocalityBuildingDTO & { access_level?: string | null };

  const filteredBuildings = useMemo(() => {
    return mapBuildings.filter((raw) => {
      const b = raw as LocalityMapBuildingRow;
      if (styleFilter && !b.styles?.some((s) => s.name === styleFilter)) return false;
      if (accessFilter && b.access_level !== accessFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
  }, [mapBuildings, styleFilter, accessFilter, statusFilter]);

  // Annotate each building with a popularity-based tier_rank string so
  // CollectionMapGL can apply the same priority pin styling as the search map.
  // mapBuildings is already sorted popularity_score DESC; filteredBuildings
  // preserves that order, so idx=0 is the most popular in the current filter.
  const buildingsForMap = useMemo((): DiscoveryBuilding[] => {
    const total = filteredBuildings.length;
    return filteredBuildings.map((b, idx) => {
      let tier_rank: string;
      if (idx < Math.max(1, Math.ceil(total * 0.01))) tier_rank = 'Top 1%';
      else if (idx < Math.max(2, Math.ceil(total * 0.05))) tier_rank = 'Top 5%';
      else if (idx < Math.ceil(total * 0.20)) tier_rank = 'Top 20%';
      else tier_rank = 'Standard';
      return { ...b, tier_rank } as unknown as DiscoveryBuilding;
    });
  }, [filteredBuildings]);

  if (mapBuildings.length === 0) return null;

  const hasActiveFilter = styleFilter || accessFilter || statusFilter;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>Map</SectionLabel>
        {hasActiveFilter ? (
          <button
            type="button"
            onClick={() => {
              setStyleFilter(null);
              setAccessFilter(null);
              setStatusFilter(null);
            }}
            className="text-2xs font-medium uppercase tracking-widest text-text-disabled transition-colors hover:text-text-primary"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* Smart Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STYLE_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={styleFilter === f.value}
              onClick={() =>
                setStyleFilter(styleFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ACCESS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={accessFilter === f.value}
              onClick={() =>
                setAccessFilter(accessFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={statusFilter === f.value}
              onClick={() =>
                setStatusFilter(statusFilter === f.value ? null : f.value)
              }
            >
              {f.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="h-[min(520px,65vh)] overflow-hidden border border-border-default bg-surface-muted">
        <ClientOnly
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-surface-muted">
              <Skeleton className="h-full w-full" />
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-surface-muted">
                <Skeleton className="h-full w-full" />
              </div>
            }
          >
            <CollectionMapGL
              buildings={buildingsForMap}
              highlightedId={highlightedId}
              setHighlightedId={setHighlightedId}
            />
          </Suspense>
        </ClientOnly>
      </div>

      {hasActiveFilter ? (
        <p className="mt-2 text-[10px] text-text-disabled">
          Showing {filteredBuildings.length.toLocaleString()} of{" "}
          {mapBuildings.length.toLocaleString()} buildings
        </p>
      ) : null}
    </section>
  );
}
