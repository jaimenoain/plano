import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, type MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getClaimedPersonSummaryForProfile,
  getPersonPortfolio,
} from "@/features/credits/api/people";
import type { PersonCreditWithBuilding, PersonPortfolioItem } from "@/features/credits/types";
import { PersonCreditCard } from "@/features/credits/components/PersonCreditCard";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import { toast } from "sonner";

function tierLabel(tier: "primary" | "contributor" | "ancillary"): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

function toPersonCreditWithBuilding(item: PersonPortfolioItem): PersonCreditWithBuilding {
  return { ...item.credit, building: item.building };
}

function sortPortfolioItems(items: PersonPortfolioItem[], mode: "year" | "role"): PersonPortfolioItem[] {
  const copy = [...items];
  if (mode === "role") {
    return copy.sort((a, b) =>
      formatCreditRoleLabel(a.credit.role, a.credit.roleCustom).localeCompare(
        formatCreditRoleLabel(b.credit.role, b.credit.roleCustom),
      ),
    );
  }
  const yearScore = (it: PersonPortfolioItem) =>
    it.building.yearCompleted ?? it.credit.yearFrom ?? it.credit.yearTo ?? 0;
  return copy.sort((a, b) => yearScore(b) - yearScore(a));
}

function creditYearValues(it: PersonPortfolioItem): number[] {
  const out: number[] = [];
  if (it.credit.yearFrom != null) out.push(it.credit.yearFrom);
  if (it.credit.yearTo != null) out.push(it.credit.yearTo);
  if (it.building.yearCompleted != null) out.push(it.building.yearCompleted);
  return out;
}

function DashboardTierSection({
  tier,
  items,
  sortMode,
}: {
  tier: "primary" | "contributor" | "ancillary";
  items: PersonPortfolioItem[];
  sortMode: "year" | "role";
}) {
  const sorted = useMemo(() => sortPortfolioItems(items, sortMode), [items, sortMode]);
  if (sorted.length === 0) return null;
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary">
        {tierLabel(tier)} credits
      </h2>
      <div>
        {sorted.map((row) => (
          <PersonCreditCard key={row.credit.id} credit={toPersonCreditWithBuilding(row)} />
        ))}
      </div>
    </section>
  );
}

export const meta: MetaFunction = () => [
  { title: "Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function PersonDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sortMode, setSortMode] = useState<"year" | "role">("year");

  const claimedQuery = useQuery({
    queryKey: ["personDashboardClaimed", user?.id ?? "anon"],
    queryFn: () => getClaimedPersonSummaryForProfile(user!.id),
    enabled: Boolean(user?.id) && !authLoading,
    staleTime: 60_000,
  });

  const personId = claimedQuery.data?.id;

  const portfolioQuery = useQuery({
    queryKey: ["personPortfolioDashboard", personId ?? ""],
    queryFn: () => getPersonPortfolio(personId!),
    enabled: Boolean(personId),
    staleTime: 60_000,
  });

  const allItems = useMemo(() => {
    const p = portfolioQuery.data;
    if (!p) return [];
    return [...p.primary, ...p.contributor, ...p.ancillary];
  }, [portfolioQuery.data]);

  const stats = useMemo(() => {
    const buildingIds = new Set(allItems.map((i) => i.building.id));
    const roles = new Set(allItems.map((i) => i.credit.role));
    const years: number[] = [];
    for (const it of allItems) {
      years.push(...creditYearValues(it));
    }
    const minY = years.length ? Math.min(...years) : null;
    const maxY = years.length ? Math.max(...years) : null;
    return {
      buildingCount: buildingIds.size,
      roleCount: roles.size,
      yearMin: minY,
      yearMax: maxY,
    };
  }, [allItems]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (claimedQuery.isError) {
      toast.error("Could not load your professional profile");
      navigate("/");
      return;
    }
    if (claimedQuery.isFetched && !claimedQuery.data) {
      navigate("/");
    }
  }, [authLoading, user, claimedQuery.isError, claimedQuery.isFetched, claimedQuery.data, navigate]);

  if (authLoading || claimedQuery.isLoading) {
    return (
      <AppLayout title="My portfolio" showBack>
        <div className="mx-auto max-w-[1120px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!user || claimedQuery.isError || !claimedQuery.data) {
    return null;
  }

  const { name, slug } = claimedQuery.data;
  const portfolio = portfolioQuery.data;

  return (
    <AppLayout title="My portfolio" showBack>
      <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">My portfolio</h1>
          <p className="text-sm text-text-secondary md:text-base">
            Buildings where you are credited, grouped by tier.{" "}
            <Link
              to={`/person/${slug}`}
              className="font-medium text-text-primary underline-offset-4 hover:underline"
            >
              View public profile ({name})
            </Link>
          </p>
        </header>

        {portfolioQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : portfolioQuery.isError ? (
          <p className="text-sm text-text-secondary">Could not load credits. Try again later.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-px border border-border-default bg-border-default sm:grid-cols-3">
              <div className="bg-surface-default px-5 py-6">
                <p className="eyebrow tracking-widest">
                  Buildings credited
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{stats.buildingCount}</p>
                <p className="mt-1 text-xs text-text-secondary">Distinct buildings in your portfolio</p>
              </div>
              <div className="bg-surface-default px-5 py-6">
                <p className="eyebrow tracking-widest">Roles</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">{stats.roleCount}</p>
                <p className="mt-1 text-xs text-text-secondary">Distinct credit roles</p>
              </div>
              <div className="bg-surface-default px-5 py-6">
                <p className="eyebrow tracking-widest">Year span</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
                  {stats.yearMin != null && stats.yearMax != null
                    ? stats.yearMin === stats.yearMax
                      ? String(stats.yearMin)
                      : `${stats.yearMin}–${stats.yearMax}`
                    : "—"}
                </p>
                <p className="mt-1 text-xs text-text-secondary">From credit years and completion dates</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">Sort within each tier</h2>
              <ToggleGroup
                type="single"
                value={sortMode}
                onValueChange={(v) => {
                  if (v === "year" || v === "role") setSortMode(v);
                }}
                className="justify-start"
              >
                <ToggleGroupItem value="year" size="sm" aria-label="Sort by year">
                  Year
                </ToggleGroupItem>
                <ToggleGroupItem value="role" size="sm" aria-label="Sort by role">
                  Role
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {portfolio && (
              <div className="mt-6">
                <DashboardTierSection tier="primary" items={portfolio.primary} sortMode={sortMode} />
                <DashboardTierSection tier="contributor" items={portfolio.contributor} sortMode={sortMode} />
                <DashboardTierSection tier="ancillary" items={portfolio.ancillary} sortMode={sortMode} />
                {allItems.length === 0 ? (
                  <EmptyState
                    eyebrow="No credits yet"
                    message="Buildings where you're credited will appear here once your work is catalogued."
                  />
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
