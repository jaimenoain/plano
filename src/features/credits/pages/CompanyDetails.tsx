import { useCallback, useMemo, useState } from "react";
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
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityStatsBand } from "@/components/entity/EntityStatsBand";
import { EntityTabs, type EntityTab } from "@/components/entity/EntityTabs";
import { CompanyAwardsSection, useAwardsByCompany } from "@/features/awards";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Company } from "../types";
import { EditCompanyForm } from "../components/EditCompanyForm";
import { ClaimCompanyDialog } from "../components/ClaimCompanyDialog";
import { RequestStewardAccessDialog } from "../components/RequestStewardAccessDialog";
import { CompanyHero } from "../components/CompanyHero";
import { CompanyAccessBanners } from "../components/CompanyAccessBanners";
import { CompanyPortfolioSection } from "../components/CompanyPortfolioSection";
import { CompanyStewardsSection } from "../components/CompanyStewardsSection";
import { CompanyAboutSection } from "../components/CompanyAboutSection";
import { useCompanyClaimParamEffects } from "../hooks/useCompanyClaimParamEffects";
import {
  companyClaimDisputeOpenQueryKey,
  companyQueryKey,
  companyStewardRequestPendingQueryKey,
  companyStewardsQueryKey,
  getCompany,
  getCompanyStewardsWithProfiles,
  getMyOpenCompanyClaimDisputeId,
  getMyPendingCompanyStewardRequestId,
} from "../api/companies";
import { companyDetailsLoader, type CompanyDetailsLoaderData } from "./CompanyDetails.loader";

export { companyDetailsLoader as loader } from "./CompanyDetails.loader";

export const meta: MetaFunction<typeof companyDetailsLoader> = ({ loaderData: data }) => {
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

type SectionKey = "portfolio" | "awards" | "stewards" | "about";

export function HydrateFallback() {
  return (
    <AppLayout showBack title="Loading…" showLogo={false} fullWidth>
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 pt-10 pb-2 sm:flex-row sm:items-start sm:gap-8">
          <Skeleton className="size-20 shrink-0 rounded-none sm:size-26" />
          <div className="min-w-0 flex-1 pt-6">
            <Skeleton className="mb-4 h-10 w-2/3 max-w-md" />
            <Skeleton className="h-16 w-full max-w-lg" />
          </div>
        </div>
        <Skeleton className="mt-12 h-24 w-full" />
        <Skeleton className="mt-16 h-40 w-full" />
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
          <Button asChild size="lg" variant="default" className="w-full sm:w-auto sm:min-w-[200px]">
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

export default function CompanyDetails() {
  const loaderData = useLoaderData() as CompanyDetailsLoaderData;
  const { slug: slugParam } = useParams();
  const slug = slugParam?.trim() ?? "";
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [requestAccessOpen, setRequestAccessOpen] = useState(false);

  const { data: queryData } = useQuery({
    queryKey: companyQueryKey(slug),
    queryFn: () => getCompany(slug),
    enabled: Boolean(slug),
    initialData: { company: loaderData.company, credits: loaderData.credits },
    staleTime: 60_000,
  });

  const company = queryData?.company ?? loaderData.company;
  const credits = queryData?.credits ?? loaderData.credits;

  // Viewer-specific state stays client-side: the loader is edge-cached per URL
  // (`public, s-maxage=300`) and must never carry per-viewer data.
  const { data: stewards = [], isLoading: stewardsLoading } = useQuery({
    queryKey: companyStewardsQueryKey(company.id),
    queryFn: () => getCompanyStewardsWithProfiles(company.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const isSteward = Boolean(user?.id && stewards.some((s) => s.userId === user.id));
  const isOwner = Boolean(user?.id && stewards.some((s) => s.userId === user.id && s.role === "owner"));

  const { data: pendingStewardRequestId } = useQuery({
    queryKey: companyStewardRequestPendingQueryKey(company.id),
    queryFn: () => getMyPendingCompanyStewardRequestId(company.id),
    enabled: Boolean(user?.id && company.claimStatus === "claimed" && !stewardsLoading && !isSteward),
    staleTime: 30_000,
  });

  const { data: openCompanyClaimDisputeId } = useQuery({
    queryKey: companyClaimDisputeOpenQueryKey(company.id),
    queryFn: () => getMyOpenCompanyClaimDisputeId(company.id),
    enabled: Boolean(user?.id && company.claimStatus === "claimed" && !stewardsLoading && !isSteward),
    staleTime: 30_000,
  });

  const openEdit = useCallback(() => setEditOpen(true), []);

  useCompanyClaimParamEffects({
    slug,
    companyId: company.id,
    isSteward,
    stewardsLoading,
    onOpenEdit: openEdit,
  });

  const handleCompanySaved = (updated: Company) => {
    queryClient.setQueryData(companyQueryKey(slug), (prev) => {
      if (!prev) return prev;
      return { ...prev, company: updated };
    });
    void queryClient.invalidateQueries({ queryKey: companyQueryKey(slug) });
    revalidator.revalidate();
  };

  // Wins drive a stats cell and the Awards tab count; the tab body shares the
  // same query, so this costs no extra fetch.
  const { data: awards = [], isLoading: awardsLoading } = useAwardsByCompany(company.id);
  const awardCount = awards.filter((a) => a.recipientType === "company").length;

  const { buildingCount, cityCount, roleCount } = useMemo(() => {
    const buildings = new Set<string>();
    const cities = new Set<string>();
    const roles = new Set<string>();
    for (const c of credits) {
      buildings.add(c.building.id);
      const city = c.building.city?.trim();
      // Keyed with the country so two same-named cities abroad count separately.
      if (city) cities.add(`${city.toLowerCase()}|${c.building.country?.trim().toLowerCase() ?? ""}`);
      roles.add(c.role === "other" && c.roleCustom ? c.roleCustom : c.role);
    }
    return { buildingCount: buildings.size, cityCount: cities.size, roleCount: roles.size };
  }, [credits]);

  const showStewardsTab = isSteward && stewards.length > 0;

  const tabs: EntityTab<SectionKey>[] = [
    { key: "portfolio", label: "Portfolio", count: credits.length },
    { key: "awards", label: "Awards", count: awardsLoading ? null : awardCount },
    ...(showStewardsTab
      ? [{ key: "stewards" as const, label: "Stewards", count: stewards.length }]
      : []),
    { key: "about", label: "About", count: null },
  ];

  const sectionParam = searchParams.get("section") as SectionKey | null;
  const activeSection: SectionKey =
    sectionParam && tabs.some((t) => t.key === sectionParam) ? sectionParam : "portfolio";

  const handleSectionChange = useCallback(
    (section: SectionKey) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (section === "portfolio") next.delete("section");
          else next.set("section", section);
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams],
  );

  const yearSpan =
    company.foundedYear != null || company.dissolvedYear != null
      ? [company.foundedYear ?? "?", company.dissolvedYear ?? "—"].join("–")
      : null;

  // A claimed company still lets non-stewards ask for access (and dispute it).
  const showStewardRequest = company.claimStatus === "claimed" && (!user?.id || (!stewardsLoading && !isSteward));
  const showBanners = company.claimStatus === "unclaimed" || showStewardRequest;

  return (
    <AppLayout title={company.name} showLogo={false} showBack fullWidth>
      {user && company.claimStatus === "unclaimed" ? (
        <ClaimCompanyDialog
          companyId={company.id}
          companyName={company.name}
          open={claimOpen}
          onOpenChange={setClaimOpen}
        />
      ) : null}
      {user && showStewardRequest ? (
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

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <CompanyHero
          company={company}
          yearSpan={yearSpan}
          isSteward={isSteward}
          onEdit={openEdit}
        />

        <EntityStatsBand
          cells={[
            { key: "buildings", value: buildingCount, label: "Buildings" },
            { key: "cities", value: cityCount, label: "Cities" },
            { key: "awards", value: awardsLoading ? "—" : awardCount, label: "Awards" },
            { key: "roles", value: roleCount, label: "Roles" },
          ]}
        />
      </div>

      {showBanners ? (
        <div className="mx-auto max-w-[1120px] px-4 pt-12 sm:px-6 lg:px-8">
          <CompanyAccessBanners
            company={company}
            slug={slug}
            isAuthenticated={Boolean(user)}
            showStewardRequest={showStewardRequest}
            pendingStewardRequestId={pendingStewardRequestId}
            openClaimDisputeId={openCompanyClaimDisputeId}
            onClaim={() => setClaimOpen(true)}
            onRequestAccess={() => setRequestAccessOpen(true)}
          />
        </div>
      ) : null}

      <div className="mt-16">
        <EntityTabs tabs={tabs} activeKey={activeSection} onChange={handleSectionChange} />
      </div>

      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="min-h-[60vh] pt-16 pb-10">
          {activeSection === "portfolio" && <CompanyPortfolioSection credits={credits} />}
          {activeSection === "awards" && (
            <CompanyAwardsSection companyId={company.id} companyName={company.name} />
          )}
          {activeSection === "stewards" && (
            <CompanyStewardsSection companyId={company.id} stewards={stewards} isOwner={isOwner} />
          )}
          {activeSection === "about" && <CompanyAboutSection company={company} yearSpan={yearSpan} />}
        </div>
      </div>
    </AppLayout>
  );
}
