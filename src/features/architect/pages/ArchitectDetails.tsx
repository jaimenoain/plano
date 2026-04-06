import { useState, useEffect, useCallback } from "react";
import {
  useParams,
  useNavigate,
  Link,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
  useRevalidator,
  type MetaFunction,
} from "react-router";
import { useArchitect } from "@/features/architect/hooks/useArchitect";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Globe,
  Map as MapIcon,
  BadgeCheck,
  Building2,
} from "lucide-react";
import { getBuildingImageUrl } from "@/utils/image";
import { supabase } from "@/integrations/supabase/client";
import { ClaimProfileDialog } from "@/features/architect/components/ClaimProfileDialog";
import { architectLoader } from "./ArchitectDetails.loader";
import {
  architectStructuredData,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";

export { architectLoader as loader } from "./ArchitectDetails.loader";

// ─── Hydrate / Error Boundaries ──────────────────────────────────────────────

export function HydrateFallback() {
  return (
    <AppLayout showBack>
      <div className="sticky top-16 z-20 bg-surface-default border-b border-border-default">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-start gap-4">
            <Skeleton className="w-[72px] h-[72px] rounded-full shrink-0" />
            <div className="flex-1 space-y-2.5">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { id } = useParams<{ id: string }>();
  const revalidator = useRevalidator();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <AppLayout showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
            Architect not found
          </h1>
          <p className="text-text-secondary max-w-md mb-6 text-sm md:text-base leading-relaxed">
            We couldn&apos;t find an architect at this URL
            {id ? (
              <> <span className="font-mono text-text-primary">({id})</span></>
            ) : null}
            . The profile may have been removed or the link is incorrect.
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary max-w-md mb-6 text-sm md:text-base leading-relaxed">
          An unexpected error occurred while loading this architect. You can try
          again or return to explore.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="default"
            className="min-w-[200px]"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again
          </Button>
          <Button asChild size="lg" variant="outline" className="min-w-[200px]">
            <Link to="/explore">Browse buildings</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

export const meta: MetaFunction<typeof architectLoader> = ({ data }) => {
  if (!data || !data.architect) return [{ title: "Plano" }];

  const { architect } = data;
  const title = `${architect.name} | Plano`;
  const description = architect.bio
    ? `${architect.name} — ${architect.bio.slice(0, 155)}`
    : `Explore buildings and works by ${architect.name} on Plano.`;
  const canonical = `${SITE_URL}/architect/${architect.id}`;

  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { "script:ld+json": architectStructuredData(architect) },
  ];
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArchitectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { architect: loaderArchitect } = useLoaderData<typeof architectLoader>();

  // useArchitect fetches the buildings list client-side
  // linkedUser is not needed here — the loader already redirects if claimed
  const { architect, buildings, loading, error } = useArchitect(id, {
    initialArchitect: loaderArchitect,
  });

  const [activeSection, setActiveSection] = useState<"portfolio" | "about">("portfolio");

  const [claimStatus, setClaimStatus] = useState<{
    is_verified: boolean;
    my_claim_status: string | null;
  }>({ is_verified: false, my_claim_status: null });
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  const fetchClaimStatus = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.rpc("get_architect_claim_status", {
        p_architect_id: id,
      });
      if (error) throw error;
      if (data) {
        setClaimStatus(
          data as unknown as { is_verified: boolean; my_claim_status: string | null }
        );
      }
    } catch (_err) {
      // silent
    }
  }, [id]);

  useEffect(() => {
    fetchClaimStatus();
  }, [fetchClaimStatus, user]);

  // ── Loading state ──
  if (loading) {
    return (
      <AppLayout showBack>
        <div className="sticky top-16 z-20 bg-surface-default border-b border-border-default">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex items-start gap-4">
              <Skeleton className="w-[72px] h-[72px] rounded-full shrink-0" />
              <div className="flex-1 space-y-2.5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error / not found state ──
  if (error || !architect) {
    return (
      <AppLayout showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Architect not found
          </h1>
          <p className="text-text-secondary max-w-sm">
            The architect you are looking for does not exist or an error occurred.
          </p>
          <Button asChild variant="secondary">
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const totalProjects = buildings.length;
  const builtWorks = buildings.filter((b) => b.status === "Built").length;

  // Use the first building image as the architect avatar fallback
  const avatarSrc = buildings[0]?.main_image_url
    ? getBuildingImageUrl(buildings[0].main_image_url) ?? undefined
    : undefined;

  const tabs = [
    { key: "portfolio" as const, label: "Portfolio" },
    { key: "about" as const, label: "About" },
  ];

  return (
    <>
      <AppLayout showBack fullWidth>

        {/* ── STICKY HEADER BAND — matches Profile.tsx exactly ── */}
        <div className="sticky top-16 z-20 bg-surface-default border-b border-border-default">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-start gap-4 py-5 flex-wrap sm:flex-nowrap">

              {/* Avatar — uses first building image as placeholder */}
              <Avatar className="w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] shrink-0 mt-0.5">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-surface-muted text-text-primary font-bold text-2xl">
                  {architect.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Name + verified badge */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary leading-tight">
                    {architect.name}
                  </h1>
                  {claimStatus.is_verified && (
                    <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary inline-flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Type + location */}
                <div className="flex items-center gap-3 text-sm text-text-secondary mb-2.5 flex-wrap">
                  {architect.type && (
                    <span className="capitalize">{architect.type}</span>
                  )}
                  {architect.headquarters && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {architect.headquarters}
                    </span>
                  )}
                  {architect.website_url && (
                    <a
                      href={architect.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-text-primary transition-colors"
                    >
                      <Globe className="w-3 h-3" />
                      Website
                    </a>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-stretch gap-0 flex-wrap text-left">
                  <div className="pr-4 text-left">
                    <div className="text-base font-semibold text-text-primary leading-tight">
                      {totalProjects >= 1000
                        ? (totalProjects / 1000).toFixed(1).replace(/\.0$/, "") + "k"
                        : totalProjects}
                    </div>
                    <div className="text-[11px] text-text-secondary uppercase tracking-[.06em] mt-0.5">
                      projects
                    </div>
                  </div>
                  <div className="pl-4 border-l border-border-default text-left">
                    <div className="text-base font-semibold text-text-primary leading-tight">
                      {builtWorks >= 1000
                        ? (builtWorks / 1000).toFixed(1).replace(/\.0$/, "") + "k"
                        : builtWorks}
                    </div>
                    <div className="text-[11px] text-text-secondary uppercase tracking-[.06em] mt-0.5">
                      built works
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 items-start shrink-0 pt-1 flex-wrap">
                <Link
                  to={`/search?filters=${encodeURIComponent(
                    JSON.stringify({ query: architect.name })
                  )}`}
                  className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-1"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map
                </Link>

                {user && !claimStatus.is_verified && claimStatus.my_claim_status !== "pending" && (
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors"
                    onClick={() => setClaimDialogOpen(true)}
                  >
                    Claim profile →
                  </button>
                )}

                {user && claimStatus.my_claim_status === "pending" && (
                  <span className="text-2xs font-medium tracking-widest uppercase text-text-disabled">
                    Claim pending
                  </span>
                )}

                {!user && (
                  <Link to="/auth" className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                    Claim profile →
                  </Link>
                )}
              </div>
            </div>

            {/* Tab strip */}
            <div className="flex gap-0 -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`px-4 py-2.5 text-xs font-medium uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                    activeSection === tab.key
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-disabled hover:text-text-primary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          {/* Unclaimed nudge banner — shown to logged-in users who haven't claimed */}
          {user && !claimStatus.is_verified && claimStatus.my_claim_status !== "pending" && (
            <div className="mb-6 flex items-center justify-between gap-4 py-4 border-b border-border-default">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Is this your profile?</span>
                {" "}Claim it to connect your portfolio with your Plano account.
              </p>
              <button
                type="button"
                className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors shrink-0"
                onClick={() => setClaimDialogOpen(true)}
              >
                Claim →
              </button>
            </div>
          )}

          {/* ── PORTFOLIO TAB ── */}
          {activeSection === "portfolio" && (
            <div>
              {buildings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border-default">
                  <Building2 className="h-10 w-10 text-text-disabled mb-4" />
                  <h3 className="text-base font-semibold mb-1 text-text-primary">
                    No designs listed yet
                  </h3>
                  <p className="text-sm text-text-secondary max-w-xs">
                    We haven&apos;t added any buildings for this architect yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border-default">
                  {buildings.map((building) => {
                    const imgUrl = getBuildingImageUrl(building.main_image_url);
                    return (
                      <div
                        key={building.id}
                        className="bg-surface-default cursor-pointer group overflow-hidden"
                        onClick={() => navigate(`/building/${building.id}`)}
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={building.name}
                              className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="h-8 w-8 text-text-disabled" />
                            </div>
                          )}
                        </div>
                        <div className="py-3 px-1">
                          <h3 className="font-semibold text-sm text-text-primary line-clamp-1">
                            {building.name}
                          </h3>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs text-text-secondary">
                              {[building.city, building.country].filter(Boolean).join(", ")}
                            </p>
                            {building.year_completed && (
                              <span className="text-xs text-text-disabled">
                                {building.year_completed}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ABOUT TAB ── */}
          {activeSection === "about" && (
            <div className="max-w-sm space-y-6">
              {architect.bio && (
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                    Bio
                  </p>
                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                    {architect.bio}
                  </p>
                </div>
              )}

              {architect.type && (
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                    Practice type
                  </p>
                  <p className="text-sm text-text-primary capitalize">{architect.type}</p>
                </div>
              )}

              {architect.headquarters && (
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                    Headquarters
                  </p>
                  <p className="text-sm text-text-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-text-secondary" />
                    {architect.headquarters}
                  </p>
                </div>
              )}

              {architect.website_url && (
                <div>
                  <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                    Website
                  </p>
                  <a
                    href={architect.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-primary flex items-center gap-1.5 hover:text-brand-primary transition-colors"
                  >
                    <Globe className="w-4 h-4 text-text-secondary" />
                    {architect.website_url.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                  On Plano
                </p>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <Building2 className="w-4 h-4" />
                  {totalProjects} building{totalProjects !== 1 ? "s" : ""} listed
                </div>
              </div>

              {/* Claim CTA in About tab too */}
              {user && !claimStatus.is_verified && claimStatus.my_claim_status !== "pending" && (
                <div className="border-t border-border-default pt-5">
                  <p className="text-xs font-medium tracking-widest uppercase text-text-secondary mb-2">
                    This is you?
                  </p>
                  <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                    Claim this profile to connect your portfolio with your Plano activity and get a verified badge.
                  </p>
                  <button
                    type="button"
                    className="text-xs font-medium uppercase tracking-widest text-text-primary hover:text-brand-primary transition-colors"
                    onClick={() => setClaimDialogOpen(true)}
                  >
                    Claim profile →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>

      <ClaimProfileDialog
        architectId={id || ""}
        architectName={architect.name}
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        onSuccess={fetchClaimStatus}
      />
    </>
  );
}