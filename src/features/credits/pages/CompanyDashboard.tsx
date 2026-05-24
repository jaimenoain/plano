import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams, type MetaFunction } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanyPortfolioManageSection } from "@/features/credits/components/CompanyPortfolioManageSection";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { CompanyPortfolioItem, CreditRole } from "@/features/credits/types";
import {
  approveCompanyStewardRequestById,
  getCompanyPortfolio,
  getMyStewardCompaniesForNav,
  listPendingStewardRequestsForCompany,
  notifyStewardRequestApprovedWithClient,
  pendingStewardRequestsQueryKey,
  rejectCompanyStewardRequestById,
  type StewardCompanyNavItem,
} from "@/features/credits/api/companies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ALL_ROLES = "__all__" as const;
type RoleFilter = typeof ALL_ROLES | CreditRole;

function creditYearValues(it: CompanyPortfolioItem): number[] {
  const out: number[] = [];
  if (it.credit.yearFrom != null) out.push(it.credit.yearFrom);
  if (it.credit.yearTo != null) out.push(it.credit.yearTo);
  if (it.building.yearCompleted != null) out.push(it.building.yearCompleted);
  return out;
}

function pickCompany(
  list: StewardCompanyNavItem[],
  companySlugParam: string | null
): StewardCompanyNavItem | null {
  if (list.length === 0) return null;
  if (companySlugParam) {
    const hit = list.find((c) => c.slug.toLowerCase() === companySlugParam.toLowerCase());
    if (hit) return hit;
  }
  return list[0];
}

export const meta: MetaFunction = () => [
  { title: "Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function CompanyDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(ALL_ROLES);

  const stewardsQuery = useQuery({
    queryKey: ["companyDashboardStewards", user?.id ?? "anon"],
    queryFn: () => getMyStewardCompaniesForNav(),
    enabled: Boolean(user?.id) && !authLoading,
    staleTime: 60_000,
  });

  const companySlugParam = searchParams.get("company")?.trim() || null;
  const selected = useMemo(
    () => pickCompany(stewardsQuery.data ?? [], companySlugParam),
    [stewardsQuery.data, companySlugParam]
  );

  useEffect(() => {
    setRoleFilter(ALL_ROLES);
  }, [selected?.companyId]);

  const isOwner = selected?.stewardRole === "owner";

  const portfolioQueryKey = useMemo(
    () =>
      ["companyPortfolioDashboard", selected?.companyId ?? "", roleFilter === ALL_ROLES ? "all" : roleFilter] as const,
    [selected?.companyId, roleFilter],
  );

  const portfolioQuery = useQuery({
    queryKey: portfolioQueryKey,
    queryFn: () =>
      getCompanyPortfolio(selected!.companyId, roleFilter === ALL_ROLES ? undefined : roleFilter),
    enabled: Boolean(selected?.companyId),
    staleTime: 60_000,
  });

  const pendingQuery = useQuery({
    queryKey: selected ? pendingStewardRequestsQueryKey(selected.companyId) : ["pending-steward-requests", ""],
    queryFn: () => listPendingStewardRequestsForCompany(selected!.companyId),
    enabled: Boolean(selected?.companyId && isOwner),
    staleTime: 30_000,
  });

  const orderedItems = useMemo(() => {
    const p = portfolioQuery.data;
    if (!p) return [];
    return p.orderedFlat;
  }, [portfolioQuery.data]);

  const roleOptions = useMemo(() => {
    const set = new Set<CreditRole>();
    for (const item of orderedItems) {
      set.add(item.credit.role);
    }
    return [...set].sort((a, b) => formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)));
  }, [orderedItems]);

  const companyStats = useMemo(() => {
    const buildingIds = new Set(orderedItems.map((i) => i.building.id));
    const roles = new Set(orderedItems.map((i) => i.credit.role));
    const years: number[] = [];
    for (const it of orderedItems) {
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
  }, [orderedItems]);

  const syncCompanyParam = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(searchParams);
      if (next.get("company") === slug) return;
      next.set("company", slug);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (stewardsQuery.isError) {
      toast.error("Could not load your company access");
      navigate("/");
      return;
    }
    if (stewardsQuery.isFetched && (stewardsQuery.data?.length ?? 0) === 0) {
      navigate("/");
    }
  }, [authLoading, user, stewardsQuery.isError, stewardsQuery.isFetched, stewardsQuery.data, navigate]);

  useEffect(() => {
    const list = stewardsQuery.data;
    if (!list?.length) return;
    if (!companySlugParam && list.length > 1) {
      syncCompanyParam(list[0].slug);
      return;
    }
    if (companySlugParam && !list.some((c) => c.slug.toLowerCase() === companySlugParam.toLowerCase())) {
      syncCompanyParam(list[0].slug);
    }
  }, [stewardsQuery.data, companySlugParam, syncCompanyParam]);

  const approveMut = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await approveCompanyStewardRequestById(requestId);
      if (!res.ok) throw new Error(res.error);
      if (!res.alreadyProcessed) {
        await notifyStewardRequestApprovedWithClient(supabase, res.requestId);
      }
      return res;
    },
    onSuccess: async () => {
      toast.success("Access approved");
      if (selected) {
        await queryClient.invalidateQueries({ queryKey: pendingStewardRequestsQueryKey(selected.companyId) });
        await queryClient.invalidateQueries({ queryKey: ["company-stewards", selected.companyId] });
      }
      await queryClient.invalidateQueries({ queryKey: ["companyDashboardStewards", user?.id ?? "anon"] });
    },
    onError: (e: Error) => {
      const code = e.message;
      const msg =
        code === "not_owner"
          ? "Only an owner can approve."
          : code === "not_pending"
            ? "This request is no longer pending."
            : "Could not approve request.";
      toast.error(msg);
    },
  });

  const rejectMut = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await rejectCompanyStewardRequestById(requestId);
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: async () => {
      toast.success("Request declined");
      if (selected) {
        await queryClient.invalidateQueries({ queryKey: pendingStewardRequestsQueryKey(selected.companyId) });
      }
    },
    onError: (e: Error) => {
      const code = e.message;
      const msg =
        code === "not_owner"
          ? "Only an owner can decline."
          : code === "not_pending"
            ? "This request is no longer pending."
            : "Could not decline request.";
      toast.error(msg);
    },
  });

  if (authLoading || stewardsQuery.isLoading) {
    return (
      <AppLayout title="Company portfolio" showBack>
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 max-w-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!user || stewardsQuery.isError || !selected) {
    return null;
  }

  const list = stewardsQuery.data ?? [];

  return (
    <AppLayout title="Company portfolio" showBack>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-text-secondary">{selected.name}</p>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Company portfolio</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-text-secondary md:text-base">
              Curate how your studio appears: edit credits, add projects from the catalogue, list new buildings, and set
              presentation order.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-8 sm:gap-y-2">
            <Link
              to={`/company/${selected.slug}`}
              className="group/pub inline-flex items-baseline gap-1 text-xs font-medium uppercase tracking-[0.15em] text-text-primary"
            >
              <span className="transition-colors group-hover/pub:text-text-secondary">View public company</span>
              <span className="transition-transform group-hover/pub:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
            <Link
              to={`/company/${selected.slug}?edit=1`}
              className="group/edit inline-flex items-baseline gap-1 text-xs font-medium uppercase tracking-[0.15em] text-text-primary"
            >
              <span className="transition-colors group-hover/edit:text-text-secondary">Edit company profile</span>
              <span className="transition-transform group-hover/edit:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          </div>

          {list.length > 1 ? (
            <div className="max-w-md border-t border-border-default pt-5">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                Company
              </label>
              <Select
                value={selected.slug}
                onValueChange={(slug) => {
                  const next = new URLSearchParams(searchParams);
                  next.set("company", slug);
                  setSearchParams(next, { replace: true });
                }}
              >
                <SelectTrigger className="rounded-none border-border-default" aria-label="Select company">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {list.map((c) => (
                    <SelectItem key={c.companyId} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </header>

        {isOwner && pendingQuery.data && pendingQuery.data.length > 0 ? (
          <section className="mb-12" aria-labelledby="pending-access-heading">
            <h2
              id="pending-access-heading"
              className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-text-secondary"
            >
              Pending access requests
            </h2>
            <ul className="divide-y divide-border-default border-y border-border-default">
                {pendingQuery.data.map((req) => (
                  <li key={req.id} className="px-4 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={req.requesterAvatarUrl ?? ""} alt="" />
                          <AvatarFallback className="text-xs">
                            {(req.requesterUsername ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <p className="text-base font-semibold text-text-primary">
                            {req.requesterUsername ?? "Plano user"}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Requested {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                          {req.message.trim().length > 0 ? (
                            <p className="pt-2 text-sm leading-relaxed text-text-secondary">{req.message}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:pt-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-none"
                          disabled={rejectMut.isPending || approveMut.isPending}
                          onClick={() => rejectMut.mutate(req.id)}
                        >
                          Decline
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-none"
                          disabled={approveMut.isPending || rejectMut.isPending}
                          onClick={() => approveMut.mutate(req.id)}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {portfolioQuery.isLoading ? (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : portfolioQuery.isError ? null : (
          <div className="mb-8 grid grid-cols-1 gap-px border border-border-default bg-border-default sm:grid-cols-3">
            <div className="bg-surface-default px-5 py-6">
              <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">
                Buildings credited
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
                {companyStats.buildingCount}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Distinct buildings in this portfolio
              </p>
            </div>
            <div className="bg-surface-default px-5 py-6">
              <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Roles</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
                {companyStats.roleCount}
              </p>
              <p className="mt-1 text-xs text-text-secondary">Distinct credit roles</p>
            </div>
            <div className="bg-surface-default px-5 py-6">
              <p className="text-2xs font-medium uppercase tracking-[0.15em] text-text-secondary">Year span</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
                {companyStats.yearMin != null && companyStats.yearMax != null
                  ? companyStats.yearMin === companyStats.yearMax
                    ? String(companyStats.yearMin)
                    : `${companyStats.yearMin}–${companyStats.yearMax}`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                From credit years and completion dates
              </p>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4 border-b border-border-default pb-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-text-secondary">Portfolio</h2>
          <div className="w-full sm:w-56">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                if (v === ALL_ROLES) setRoleFilter(ALL_ROLES);
                else setRoleFilter(v as CreditRole);
              }}
            >
              <SelectTrigger className="rounded-none border-border-default" aria-label="Filter by credit role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>All roles</SelectItem>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {formatCreditRoleLabel(r, null)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {portfolioQuery.isLoading ? (
          <Skeleton className="h-72 w-full rounded-none" />
        ) : portfolioQuery.isError ? (
          <p className="text-sm text-text-secondary">Could not load credits. Try again later.</p>
        ) : orderedItems.length === 0 ? (
          <CompanyPortfolioManageSection
            companyId={selected.companyId}
            items={[]}
            queryKeyPrefix={portfolioQueryKey}
          />
        ) : (
          <CompanyPortfolioManageSection
            companyId={selected.companyId}
            items={orderedItems}
            queryKeyPrefix={portfolioQueryKey}
          />
        )}
      </div>
    </AppLayout>
  );
}
