import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLoaderData,
  useParams,
  useRevalidator,
  useRouteError,
  useSearchParams,
  isRouteErrorResponse,
  type MetaFunction,
} from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, ChevronDown, Pencil, BadgeCheck, UserPlus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  Company,
  CompanyCreditWithBuilding,
  CompanyWithCredits,
  CreditRole,
  CreditTier,
} from "@/features/credits/types";
import { CompanyCreditCard } from "@/features/credits/components/CompanyCreditCard";
import { EditCompanyForm } from "@/features/credits/components/EditCompanyForm";
import { ClaimCompanyDialog } from "@/features/credits/components/ClaimCompanyDialog";
import { RequestStewardAccessDialog } from "@/features/credits/components/RequestStewardAccessDialog";
import {
  companyClaimDisputeOpenQueryKey,
  companyQueryKey,
  companyStewardRequestPendingQueryKey,
  companyStewardsQueryKey,
  getCompany,
  getCompanyStewardsWithProfiles,
  getMyOpenCompanyClaimDisputeId,
  getMyPendingCompanyStewardRequestId,
  inviteCompanySteward,
  removeCompanySteward,
} from "@/features/credits/api/companies";
import { formatCreditRoleLabel } from "@/features/credits/formatCreditRole";
import { companyDetailsLoader, type CompanyDetailsLoaderData } from "./CompanyDetails.loader";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export { companyDetailsLoader as loader } from "./CompanyDetails.loader";

export const meta: MetaFunction<typeof companyDetailsLoader> = ({ data }) => {
  if (!data) return [{ title: "Plano" }];
  const d = data as CompanyDetailsLoaderData;
  return [
    { title: d.metaTitle },
    { name: "description", content: d.description },
    { property: "og:title", content: d.metaTitle },
    { property: "og:description", content: d.description },
    { property: "og:image", content: d.ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: d.canonical },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: d.metaTitle },
    { name: "twitter:description", content: d.description },
    { name: "twitter:image", content: d.ogImage },
    { tagName: "link", rel: "canonical", href: d.canonical },
    { "script:ld+json": d.structuredData },
  ];
};

const ALL_ROLES = "__all__" as const;
type RoleFilter = typeof ALL_ROLES | CreditRole;

function tierLabel(tier: CreditTier): string {
  if (tier === "primary") return "Primary";
  if (tier === "contributor") return "Contributor";
  return "Additional";
}

const TIER_ORDER: CreditTier[] = ["primary", "contributor", "ancillary"];

function stewardRoleLabel(role: string): string {
  if (role === "owner") return "Owner";
  if (role === "steward") return "Steward";
  return role;
}

function groupTierByRole(credits: CompanyCreditWithBuilding[]): Map<CreditRole, CompanyCreditWithBuilding[]> {
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

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading…">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-8 h-24 w-24 rounded-sm" />
        <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
        <Skeleton className="mb-8 h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { slug } = useParams();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">Company not found</h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-text-secondary md:text-base">
            We couldn&apos;t find a company
            {slug ? (
              <>
                {" "}
                <span className="font-mono text-text-primary">({slug})</span>
              </>
            ) : null}
            . The link may be wrong or the page was removed.
          </p>
          <Button asChild size="lg" variant="default" className="min-w-[200px]">
            <Link to="/explore">Browse buildings</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-text-primary">Something went wrong</h1>
        <p className="mb-6 max-w-md text-sm text-text-secondary">Please try again in a moment.</p>
        <Button asChild size="lg" variant="default">
          <Link to="/">Home</Link>
        </Button>
      </div>
    </AppLayout>
  );
}

function RoleGroupedCreditsList({ credits }: { credits: CompanyCreditWithBuilding[] }) {
  if (credits.length === 0) return null;
  const byRole = groupTierByRole(credits);
  return (
    <div className="space-y-10">
      {[...byRole.entries()].map(([role, rows]) => (
        <div key={role}>
          <h3 className="mb-4 text-sm font-medium text-text-primary">
            {formatCreditRoleLabel(role, null)}
          </h3>
          <div>
            {rows.map((c) => (
              <CompanyCreditCard key={c.id} credit={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TierRoleSections({
  tier,
  credits,
}: {
  tier: CreditTier;
  credits: CompanyCreditWithBuilding[];
}) {
  if (credits.length === 0) return null;
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="mb-6 text-xs font-medium uppercase tracking-widest text-text-secondary">
        {tierLabel(tier)} credits
      </h2>
      <RoleGroupedCreditsList credits={credits} />
    </section>
  );
}

export default function CompanyDetails() {
  const loaderData = useLoaderData() as CompanyDetailsLoaderData;
  const { slug: slugParam } = useParams();
  const slug = slugParam?.trim() ?? "";
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(ALL_ROLES);
  const [ancillaryOpen, setAncillaryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSending, setInviteSending] = useState(false);
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);
  const [removeStewardId, setRemoveStewardId] = useState<string | null>(null);
  const [removeWorking, setRemoveWorking] = useState(false);

  const { data: queryData } = useQuery({
    queryKey: companyQueryKey(slug),
    queryFn: () => getCompany(slug),
    enabled: Boolean(slug),
    initialData: { company: loaderData.company, credits: loaderData.credits },
    staleTime: 60_000,
  });

  const company = queryData?.company ?? loaderData.company;
  const credits = queryData?.credits ?? loaderData.credits;

  const { data: stewards = [], isLoading: stewardsLoading } = useQuery({
    queryKey: companyStewardsQueryKey(company.id),
    queryFn: () => getCompanyStewardsWithProfiles(company.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const isSteward = Boolean(user?.id && stewards.some((s) => s.userId === user.id));

  useEffect(() => {
    if (searchParams.get("edit") !== "1" || !isSteward) return;
    setEditOpen(true);
  }, [searchParams, isSteward]);

  const { data: pendingStewardRequestId } = useQuery({
    queryKey: companyStewardRequestPendingQueryKey(company.id),
    queryFn: () => getMyPendingCompanyStewardRequestId(company.id),
    enabled: Boolean(
      user?.id && company.claimStatus === "claimed" && !stewardsLoading && !isSteward
    ),
    staleTime: 30_000,
  });

  const { data: openCompanyClaimDisputeId } = useQuery({
    queryKey: companyClaimDisputeOpenQueryKey(company.id),
    queryFn: () => getMyOpenCompanyClaimDisputeId(company.id),
    enabled: Boolean(
      user?.id && company.claimStatus === "claimed" && !stewardsLoading && !isSteward
    ),
    staleTime: 30_000,
  });

  const showStewardRequestBanner =
    company.claimStatus === "claimed" &&
    (!user?.id || (!stewardsLoading && !isSteward));
  const isOwner = Boolean(user?.id && stewards.some((s) => s.userId === user.id && s.role === "owner"));

  const handleCompanySaved = (updated: Company) => {
    queryClient.setQueryData(companyQueryKey(slug), (prev) => {
      if (!prev) return prev;
      return { ...prev, company: updated };
    });
    void queryClient.invalidateQueries({ queryKey: companyQueryKey(slug) });
    revalidator.revalidate();
  };

  useEffect(() => {
    if (searchParams.get("stewardApproved") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.refetchQueries({ queryKey: companyQueryKey(slug) });
      const pack = queryClient.getQueryData(companyQueryKey(slug)) as CompanyWithCredits | undefined;
      const cid = pack?.company.id ?? company.id;
      await queryClient.refetchQueries({ queryKey: companyStewardsQueryKey(cid) });
      await queryClient.invalidateQueries({ queryKey: companyStewardRequestPendingQueryKey(cid) });
      if (cancelled) return;
      toast({
        title: "Access approved",
        description: "You can edit this company page as a steward.",
      });
      setEditOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("stewardApproved");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, slug, company.id, toast]);

  useEffect(() => {
    if (searchParams.get("edit") !== "1") return;
    if (stewardsLoading) return;
    if (!isSteward) {
      const next = new URLSearchParams(searchParams);
      next.delete("edit");
      setSearchParams(next, { replace: true });
      return;
    }
    setEditOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, stewardsLoading, isSteward]);

  useEffect(() => {
    if (searchParams.get("claimVerified") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.refetchQueries({ queryKey: companyQueryKey(slug) });
      const pack = queryClient.getQueryData(companyQueryKey(slug)) as CompanyWithCredits | undefined;
      const cid = pack?.company.id ?? company.id;
      await queryClient.refetchQueries({ queryKey: companyStewardsQueryKey(cid) });
      if (cancelled) return;
      toast({
        title: "Company claimed",
        description: "You can edit public details and invite stewards below.",
      });
      setEditOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("claimVerified");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, slug, company.id, toast]);

  useEffect(() => {
    if (searchParams.get("disputeSubmitted") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.invalidateQueries({ queryKey: companyClaimDisputeOpenQueryKey(company.id) });
      if (cancelled) return;
      const next = new URLSearchParams(searchParams);
      next.delete("disputeSubmitted");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, company.id]);

  const confirmRemoveSteward = async () => {
    if (!removeStewardId) return;
    setRemoveWorking(true);
    try {
      await removeCompanySteward(removeStewardId);
      void queryClient.invalidateQueries({ queryKey: companyStewardsQueryKey(company.id) });
      toast({ description: "Steward removed" });
      setRemoveStewardId(null);
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not remove steward",
      });
    } finally {
      setRemoveWorking(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = inviteEmail.trim().toLowerCase();
    if (!em) {
      toast({ variant: "destructive", description: "Enter an email address." });
      return;
    }
    setInviteSending(true);
    try {
      await inviteCompanySteward(company.id, em);
      toast({ description: "Invite sent" });
      setInviteOpen(false);
      setInviteEmail("");
    } catch (err) {
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Could not send invite",
      });
    } finally {
      setInviteSending(false);
    }
  };

  const roleOptions = useMemo(() => {
    const set = new Set<CreditRole>();
    for (const c of credits) set.add(c.role);
    return [...set].sort((a, b) => formatCreditRoleLabel(a, null).localeCompare(formatCreditRoleLabel(b, null)));
  }, [credits]);

  const filteredCredits = useMemo(() => {
    if (roleFilter === ALL_ROLES) return credits;
    return credits.filter((c) => c.role === roleFilter);
  }, [credits, roleFilter]);

  const byTier = useMemo(() => {
    const primary: CompanyCreditWithBuilding[] = [];
    const contributor: CompanyCreditWithBuilding[] = [];
    const ancillary: CompanyCreditWithBuilding[] = [];
    for (const c of filteredCredits) {
      if (c.creditTier === "primary") primary.push(c);
      else if (c.creditTier === "contributor") contributor.push(c);
      else ancillary.push(c);
    }
    return { primary, contributor, ancillary };
  }, [filteredCredits]);

  const yearSpan =
    company.foundedYear != null || company.dissolvedYear != null
      ? [company.foundedYear ?? "?", company.dissolvedYear ?? "—"].join("–")
      : null;

  const showUnclaimedBanner = company.claimStatus === "unclaimed";

  return (
    <AppLayout showBack>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {user && company.claimStatus === "unclaimed" ? (
          <ClaimCompanyDialog
            companyId={company.id}
            companyName={company.name}
            open={claimOpen}
            onOpenChange={setClaimOpen}
          />
        ) : null}
        {user && showStewardRequestBanner ? (
          <RequestStewardAccessDialog
            companyId={company.id}
            companyName={company.name}
            open={requestAccessOpen}
            onOpenChange={setRequestAccessOpen}
            onSubmitted={() => {
              void queryClient.invalidateQueries({
                queryKey: companyStewardRequestPendingQueryKey(company.id),
              });
            }}
          />
        ) : null}
        {isSteward ? (
          <EditCompanyForm
            open={editOpen}
            onOpenChange={setEditOpen}
            company={company}
            onSaved={handleCompanySaved}
          />
        ) : null}
        <AlertDialog open={Boolean(removeStewardId)} onOpenChange={(o) => !o && setRemoveStewardId(null)}>
          <AlertDialogContent className="border-border-default bg-surface-overlay">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove steward</AlertDialogTitle>
              <AlertDialogDescription>
                They will lose access to edit this company page and manage stewards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removeWorking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={removeWorking}
                onClick={(ev) => {
                  ev.preventDefault();
                  void confirmRemoveSteward();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="border-border-default bg-surface-overlay sm:max-w-md">
            <form onSubmit={handleSendInvite}>
              <DialogHeader>
                <DialogTitle>Invite a steward</DialogTitle>
                <DialogDescription>
                  We&apos;ll email them a link to accept. They must sign in with that email address.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                <Label htmlFor="invite-steward-email">Email</Label>
                <Input
                  id="invite-steward-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(ev) => setInviteEmail(ev.target.value)}
                  className="border-border-default bg-transparent"
                  placeholder="name@company.com"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteSending}>
                  {inviteSending ? "Sending…" : "Send invite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <header className="border-b border-border-default pb-10">
          <div className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:gap-12 lg:gap-20">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-text-primary md:text-5xl lg:text-6xl">
                    {company.name}
                  </h1>
                  {company.claimStatus === "verified" ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex shrink-0 text-text-primary" tabIndex={0}>
                          <BadgeCheck className="h-8 w-8 md:h-9 md:w-9" aria-label="Verified company on Plano" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Verified company on Plano</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                {isSteward ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-border-default"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                {company.country ? <span>{company.country}</span> : null}
                {yearSpan ? <span>{yearSpan}</span> : null}
              </div>
              {company.website?.trim() ? (
                <a
                  href={
                    company.website.trim().startsWith("http")
                      ? company.website.trim()
                      : `https://${company.website.trim()}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
                >
                  Website
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              ) : null}
              {company.bio?.trim() ? (
                <p className="max-w-2xl text-base leading-relaxed text-text-secondary">{company.bio.trim()}</p>
              ) : null}
            </div>
            {company.logoUrl ? (
              <div className="shrink-0 self-start">
                <Avatar className="h-32 w-32 shrink-0 rounded-none border border-border-default sm:h-40 sm:w-40">
                  <AvatarImage src={company.logoUrl} alt={`${company.name} logo`} />
                  <AvatarFallback className="rounded-none" />
                </Avatar>
              </div>
            ) : null}
          </div>
        </header>

        {showUnclaimedBanner ? (
          <div className="mt-10 rounded-sm border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
            <p className="mb-2 text-sm font-medium text-text-primary">This company hasn&apos;t been claimed yet</p>
            <p className="mb-3 text-sm text-text-secondary">
              If you represent this organization, verify a work email—we&apos;ll send a one-time link to finish
              claiming.
            </p>
            {user ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="text-xs font-medium uppercase tracking-widest"
                onClick={() => setClaimOpen(true)}
              >
                Claim this company
              </Button>
            ) : (
              <Link
                to={`/auth?redirect=${encodeURIComponent(`/company/${slug}`)}`}
                className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
              >
                Log in to claim →
              </Link>
            )}
          </div>
        ) : null}

        {showStewardRequestBanner ? (
          <div className="mt-10 rounded-sm border border-border-default bg-surface-muted px-4 py-4 sm:px-5">
            <p className="mb-2 text-sm font-medium text-text-primary">Manage this company on Plano</p>
            <p className="mb-3 text-sm text-text-secondary">
              This profile is already claimed. Request access if you should be able to edit details and invite
              stewards.
            </p>
            {pendingStewardRequestId ? (
              <p className="text-xs font-medium uppercase tracking-widest text-text-secondary">
                Request pending — owners have been notified by email.
              </p>
            ) : user ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="text-xs font-medium uppercase tracking-widest"
                onClick={() => setRequestAccessOpen(true)}
              >
                Request access to manage this company
              </Button>
            ) : (
              <Link
                to={`/auth?redirect=${encodeURIComponent(`/company/${slug}`)}`}
                className="inline-flex text-xs font-medium uppercase tracking-widest text-text-primary hover:underline"
              >
                Log in to request access →
              </Link>
            )}
            {openCompanyClaimDisputeId ? (
              <p className="mt-4 border-t border-border-default pt-4 text-sm text-text-secondary">
                Dispute under review — we have received your report. Our team will follow up by email if needed.
              </p>
            ) : (
              <div className="mt-4 border-t border-border-default pt-4">
                {user ? (
                  <Link
                    to={`/company/${slug}/dispute`}
                    className="inline-flex text-2xs font-medium uppercase tracking-widest text-text-primary hover:underline"
                  >
                    Dispute this claim
                  </Link>
                ) : (
                  <Link
                    to={`/auth?redirect=${encodeURIComponent(`/company/${slug}/dispute`)}`}
                    className="inline-flex text-2xs font-medium uppercase tracking-widest text-text-primary hover:underline"
                  >
                    Log in to dispute this claim →
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : null}

        {isSteward && stewards.length > 0 ? (
          <section className="mt-12 border-b border-border-default pb-10" aria-label="Company stewards">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">Stewards</h2>
              {isOwner ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit shrink-0 border-border-default"
                  onClick={() => setInviteOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                  Invite a steward
                </Button>
              ) : null}
            </div>
            <ul className="divide-y divide-border-default">
              {stewards.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0 rounded-sm border border-border-default">
                      {s.avatarUrl ? <AvatarImage src={s.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="rounded-sm text-xs font-medium text-text-primary">
                        {(s.username?.[0] ?? "?").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {s.username ? `@${s.username}` : "Plano member"}
                      </p>
                      <p className="text-2xs font-medium uppercase tracking-widest text-text-secondary">
                        {stewardRoleLabel(s.role)}
                      </p>
                    </div>
                  </div>
                  {isOwner && s.role === "steward" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] border-border-default"
                      onClick={() => setRemoveStewardId(s.id)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xs font-medium uppercase tracking-widest text-text-secondary">Credits</h2>
            {roleOptions.length > 0 ? (
              <div className="flex flex-col gap-1 sm:items-end">
                <span className="text-2xs font-medium uppercase tracking-widest text-text-secondary">Role</span>
                <Select
                  value={roleFilter}
                  onValueChange={(v) => setRoleFilter(v as RoleFilter)}
                >
                  <SelectTrigger
                    className="h-11 w-full border-border-default sm:w-56"
                    aria-label="Filter credits by role"
                  >
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
            ) : null}
          </div>
          {credits.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">No public credits on Plano yet.</p>
          ) : filteredCredits.length === 0 ? (
            <p className="mt-4 text-sm text-text-secondary">No credits match this role.</p>
          ) : (
            <>
              {TIER_ORDER.map((tier) => {
                const tierCredits = byTier[tier];
                if (tier === "ancillary") {
                  if (tierCredits.length === 0) return null;
                  return (
                    <section key={tier} className="mt-12">
                      <Collapsible open={ancillaryOpen} onOpenChange={setAncillaryOpen}>
                        <CollapsibleTrigger
                          type="button"
                          className="flex min-h-[44px] w-full items-center justify-between border-b border-border-default py-3 text-left text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary"
                        >
                          <span>Additional credits ({tierCredits.length})</span>
                          <ChevronDown
                            className={cn("h-4 w-4 shrink-0 transition-transform", ancillaryOpen && "rotate-180")}
                            aria-hidden
                          />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pt-4">
                            <RoleGroupedCreditsList credits={tierCredits} />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </section>
                  );
                }
                return <TierRoleSections key={tier} tier={tier} credits={tierCredits} />;
              })}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
