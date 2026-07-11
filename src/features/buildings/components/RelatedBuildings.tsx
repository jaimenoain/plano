import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalityUrl } from "@/utils/url";
import {
  getRelatedBuildingsByPerson,
  getRelatedBuildingsByCompany,
  getBuildingsByCity,
  type RelatedBuilding,
} from "@/features/buildings/api/related";
import type { BuildingDetails } from "../pages/BuildingDetails";

// ─── Related buildings sub-components ────────────────────────────────────────

function RelatedBuildingCard({ b }: { b: RelatedBuilding }) {
  return (
    <Link to={b.buildingUrl} className="group min-w-0">
      <div className="aspect-4/3 w-full overflow-hidden bg-surface-muted">
        {b.imageUrl ? (
          <img
            src={b.imageUrl}
            alt={b.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="photo-placeholder h-full w-full" data-label={b.name} aria-hidden />
        )}
      </div>
      <div className="mt-3.5 eyebrow tracking-[0.15em]">Building</div>
      <p className="mt-1.5 text-xl md:text-[22px] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary line-clamp-2 group-hover:underline underline-offset-4">
        {b.name}
      </p>
      {(b.city || b.year_completed) ? (
        <p className="mt-1 text-xs text-text-secondary">
          {[b.city, b.year_completed].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </Link>
  );
}

function RelatedBuildingRow({
  title,
  viewAllHref,
  viewAllLabel,
  buildings,
  isLoading,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  buildings: RelatedBuilding[];
  isLoading: boolean;
}) {
  if (!isLoading && buildings.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-10 min-w-0">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 min-w-0">
        <h2 className="eyebrow tracking-[0.15em] min-w-0 flex-1 wrap-break-word">
          {title}
        </h2>
        <Link to={viewAllHref} className="cta-link shrink-0 sm:text-right">
          {viewAllLabel}
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-4/3 w-full" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3">
          {buildings.slice(0, 6).map((b) => (
            <RelatedBuildingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </section>
  );
}

export function RelatedByArchitectSection({
  building,
  primaryCredit,
}: {
  building: BuildingDetails;
  primaryCredit: import("@/features/credits/types").BuildingCreditWithEntities | null;
}) {
  const personId = primaryCredit?.personId ?? null;
  const companyId = primaryCredit?.companyId ?? null;
  const architectName = primaryCredit?.person?.name ?? primaryCredit?.company?.name ?? null;
  const architectSlug = primaryCredit?.person?.slug ?? primaryCredit?.company?.slug ?? null;
  const isPersonCredit = !!primaryCredit?.personId;

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings", "related", "architect", personId ?? companyId],
    queryFn: () =>
      personId
        ? getRelatedBuildingsByPerson(personId, building.id)
        : companyId
          ? getRelatedBuildingsByCompany(companyId, building.id)
          : Promise.resolve([]),
    enabled: !!(personId || companyId),
    staleTime: 120_000,
  });

  if (!architectName || !architectSlug) return null;

  const viewAllHref = isPersonCredit
    ? `/person/${architectSlug}`
    : `/company/${architectSlug}`;

  return (
    <RelatedBuildingRow
      title={`More by ${architectName}`}
      viewAllHref={viewAllHref}
      viewAllLabel="View all works"
      buildings={buildings}
      isLoading={isLoading}
    />
  );
}

export function RelatedByCitySection({
  building,
  locality,
}: {
  building: BuildingDetails;
  locality: { country_code: string; city_slug: string } | null;
}) {
  const city = building.city;

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ["buildings", "city", city],
    queryFn: () => getBuildingsByCity(city!, building.id),
    enabled: !!city,
    staleTime: 120_000,
  });

  if (!city) return null;

  const viewAllHref = locality
    ? getLocalityUrl(locality.country_code, locality.city_slug)
    : `/search?q=${encodeURIComponent(city)}`;

  return (
    <RelatedBuildingRow
      title={`More architecture in ${city}`}
      viewAllHref={viewAllHref}
      viewAllLabel={`Explore ${city}`}
      buildings={buildings}
      isLoading={isLoading}
    />
  );
}
