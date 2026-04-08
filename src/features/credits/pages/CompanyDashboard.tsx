import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CompanyCreditCard } from "@/features/credits/components/CompanyCreditCard";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import type { CompanyCreditWithBuilding, CompanyPortfolioItem, CreditRole } from "@/features/credits/types";
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

function groupByRole(credits: CompanyCreditWithBuilding[]): Map<CreditRole, CompanyCreditWithBuilding[]> {
  const map = new Map<CreditRole, CompanyCreditWithBuilding[]>();
  for (const c of credits) {
    const list = map.get(c.role) ?? [];
    list.push(c);
    map.set(c.role, list);
  }
  const roles = [...map.keys()].sort((a, b) =>
    formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null))
  );
  const ordered = new Map<CreditRole, CompanyCreditWithBuilding[]>();
  for (const r of roles) {
    const items = map.get(r);
    if (items) ordered.set(r, items);
  }
  return ordered;
}

function portfolioItemToCredit(row: CompanyPortfolioItem): CompanyCreditWithBuilding {
  return { ...row.credit, building: row.building };
}

function flattenPortfolio(p: Awaited<ReturnType<typeof getCompanyPortfolio>>): CompanyPortfolioItem[] {
  return [...p.primary, ...p.contributor, ...p.ancillary];
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

  const portfolioQuery = useQuery({
    queryKey: [
      "companyPortfolioDashboard",
      selected?.companyId ?? "",
      roleFilter === ALL_ROLES ? "all" : roleFilter,
    ],
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

  const flatCredits = useMemo(() => {
    const p = portfolioQuery.data;
    if (!p) return [];
    return flattenPortfolio(p).map(portfolioItemToCredit);
  }, [portfolioQuery.data]);

  const roleOptions = useMemo(() => {
    const set = new Set<CreditRole>();
    const p = portfolioQuery.data;
    if (!p) return [];
    for (const item of flattenPortfolio(p)) {
      set.add(item.credit.role);
    }
    return [...set].sort((a, b) => formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)));
  }, [portfolioQuery.data]);

  const byRole = useMemo(() => groupByRole(flatCredits), [flatCredits]);

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
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-40 w-full" />
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
        <header className="mb-8 space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-4xl">Company portfolio</h1>
          <p className="text-sm text-text-secondary md:text-base">
            Buildings credited to your company on Plano.{" "}
            <Button variant="link" className="h-auto p-0 text-sm font-medium md:text-base" asChild>
              <Link to={`/company/${selected.slug}?edit=1`}>Manage company page</Link>
            </Button>
          </p>

          {list.length > 1 ? (
            <div className="max-w-md">
              <label className="mb-2 block text-xs font-medium uppercase tracking-widest text-text-secondary">
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
                <SelectTrigger className="border-border-default" aria-label="Select company">
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
          <section className="mb-12">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-text-secondary">
              Pending access requests
            </h2>
            <div className="space-y-4">
              {pendingQuery.data.map((req) => (
                <Card key={req.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={req.requesterAvatarUrl ?? ""} alt="" />
                        <AvatarFallback className="text-xs">
                          {(req.requesterUsername ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <CardTitle className="text-base font-semibold">
                          {req.requesterUsername ?? "Plano user"}
                        </CardTitle>
                        <p className="text-xs text-text-secondary">
                          Requested {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={rejectMut.isPending || approveMut.isPending}
                        onClick={() => rejectMut.mutate(req.id)}
                      >
                        Decline
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={approveMut.isPending || rejectMut.isPending}
                        onClick={() => approveMut.mutate(req.id)}
                      >
                        Approve
                      </Button>
                    </div>
                  </CardHeader>
                  {req.message.trim().length > 0 ? (
                    <CardContent className="pt-0">
                      <p className="text-sm text-text-secondary">{req.message}</p>
                    </CardContent>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">Credits by role</h2>
          <div className="w-full sm:w-56">
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                if (v === ALL_ROLES) setRoleFilter(ALL_ROLES);
                else setRoleFilter(v as CreditRole);
              }}
            >
              <SelectTrigger className="border-border-default" aria-label="Filter by credit role">
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
          <Skeleton className="h-64 w-full" />
        ) : portfolioQuery.isError ? (
          <p className="text-sm text-text-secondary">Could not load credits. Try again later.</p>
        ) : flatCredits.length === 0 ? (
          <p className="text-sm text-text-secondary">No credits for this company yet.</p>
        ) : (
          <div className="space-y-10">
            {[...byRole.entries()].map(([role, credits]) => (
              <div key={role}>
                <h3 className="mb-4 text-sm font-medium text-text-primary">
                  {formatCreditRoleLabel(role, null)}
                </h3>
                <div>
                  {credits.map((c) => (
                    <CompanyCreditCard key={c.id} credit={c} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
