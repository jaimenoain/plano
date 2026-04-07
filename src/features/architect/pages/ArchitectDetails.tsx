/**
 * ArchitectDetails.tsx — Redesigned with A24 editorial aesthetic
 *
 * This page is only rendered for UNCLAIMED architect profiles.
 * Claimed profiles are redirected to /profile/:username by the loader.
 *
 * Visual changes (all logic / hooks / effects unchanged):
 *  - Sticky compact header → editorial hero with two-column layout
 *  - Portrait frame (right column): first building image, full-bleed, 3:4 ratio
 *  - Architect name at editorial scale (text-5xl → text-7xl)
 *  - Metrics ARE the tabs: "N Projects" · "N Built" · "About"
 *    (mirrors Profile.tsx's Visited / Saved / About structure)
 *  - Building grid: portrait-ratio cards, no borders, no icons
 *  - Claim CTA as a clean inline text link, not a banner
 */
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  ExternalLink,
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
        <div className="flex gap-12 items-start">
          <div className="flex-1 space-y-5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden sm:block w-44 h-56 shrink-0" />
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
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">
            404
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">
            Architect not found
          </h1>
          <p className="text-base text-text-secondary max-w-md mb-10 leading-relaxed">
            We couldn&apos;t find an architect at this URL
            {id ? (
              <>
                {" "}
                <span className="font-mono text-text-primary">({id})</span>
              </>
            ) : null}
            . The profile may have been removed or the link is incorrect.
          </p>
          <Link
            to="/explore"
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            Browse buildings →
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">
          Error
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">
          Something went wrong
        </h1>
        <p className="text-base text-text-secondary max-w-md mb-10 leading-relaxed">
          An unexpected error occurred while loading this architect.
        </p>
        <div className="flex items-center gap-8">
          <button
            type="button"
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity disabled:opacity-30"
            onClick={() => revalidator.revalidate()}
            disabled={revalidator.state === "loading"}
          >
            Try again →
          </button>
          <Link
            to="/explore"
            className="text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors"
          >
            Browse buildings →
          </Link>
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

  // useArchitect fetches the buildings list client-side.
  // The loader already redirects claimed profiles to /profile/:username.
  const { architect, buildings, loading, error } = useArchitect(id, {
    initialArchitect: loaderArchitect,
  });

  // Section: 'projects' shows all buildings, 'built' shows only built status,
  // mirroring the Visited / Saved split in Profile.tsx
  const [activeSection, setActiveSection] = useState<"projects" | "built" | "about">("projects");

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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <div className="flex gap-12 items-start">
            <div className="flex-1 space-y-5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-14 w-2/3" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="hidden sm:block w-44 h-56 shrink-0" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── Error / not found state ──
  if (error || !architect) {
    return (
      <AppLayout showBack>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-6">
            Not found
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-text-primary mb-4 leading-none">
            Architect not found
          </h1>
          <p className="text-base text-text-secondary max-w-sm mb-10 leading-relaxed">
            The architect you are looking for does not exist or an error occurred.
          </p>
          <Link
            to="/"
            className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
          >
            Return to home →
          </Link>
        </div>
      </AppLayout>
    );
  }

  // ── Derived values ──
  const totalProjects = buildings.length;
  const builtWorks = buildings.filter((b) => b.status === "Built").length;
  const filteredBuildings =
    activeSection === "built"
      ? buildings.filter((b) => b.status === "Built")
      : buildings;

  // Portrait image: first building's photo — an architect's work is their portrait
  const portraitUrl = buildings[0]?.main_image_url
    ? getBuildingImageUrl(buildings[0].main_image_url) ?? undefined
    : undefined;

  // Claim state helpers
  const canClaim =
    user && !claimStatus.is_verified && claimStatus.my_claim_status !== "pending";
  const claimPending = user && claimStatus.my_claim_status === "pending";

  // Tab config — metrics as tabs
  const tabs: { key: "projects" | "built" | "about"; label: string; count: number | null }[] = [
    { key: "projects", label: "Projects", count: totalProjects },
    { key: "built", label: "Built", count: builtWorks },
    { key: "about", label: "About", count: null },
  ];

  return (
    <>
      <AppLayout showBack fullWidth>

        {/* ══ EDITORIAL ARCHITECT HERO ════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col-reverse sm:flex-row sm:items-start sm:gap-12 lg:gap-20 pt-10 pb-10 border-b border-border-default">

            {/* LEFT — text */}
            <div className="flex-1 min-w-0 mt-6 sm:mt-0">

              {/* Top meta row */}
              <div className="flex items-center justify-between mb-5">
                {/* Practice type label */}
                <div className="flex items-center gap-2 min-h-[20px]">
                  {architect.type && (
                    <span className="text-2xs font-medium tracking-widest uppercase text-text-secondary capitalize">
                      {architect.type}
                    </span>
                  )}
                  {claimStatus.is_verified && (
                    <span className="inline-flex items-center gap-1 text-2xs font-medium tracking-widest uppercase text-text-secondary">
                      <BadgeCheck className="w-3.5 h-3.5 text-text-primary" />
                      Verified
                    </span>
                  )}
                </div>

                {/* Map action */}
                <Link
                  to={`/search?filters=${encodeURIComponent(
                    JSON.stringify({ query: architect.name })
                  )}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors"
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map →
                </Link>
              </div>

              {/* Name — editorial hero title */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-text-primary leading-none break-words mb-5">
                {architect.name}
              </h1>

              {/* Secondary metadata */}
              <div className="space-y-1.5 mb-5">
                {architect.headquarters && (
                  <p className="text-sm text-text-secondary flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-text-disabled shrink-0" />
                    {architect.headquarters}
                  </p>
                )}
                {architect.bio && (
                  <p className="text-base text-text-secondary leading-relaxed max-w-lg">
                    {architect.bio}
                  </p>
                )}
                {architect.website_url && (
                  <a
                    href={architect.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors"
                  >
                    {architect.website_url
                      .replace(/^https?:\/\/(www\.)?/, "")
                      .replace(/\/$/, "")}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* Claim CTA */}
              {canClaim && (
                <button
                  type="button"
                  onClick={() => setClaimDialogOpen(true)}
                  className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
                >
                  Claim this profile →
                </button>
              )}
              {claimPending && (
                <span className="text-2xs font-medium tracking-widest uppercase text-text-disabled">
                  Claim pending review
                </span>
              )}
              {!user && (
                <Link
                  to="/auth"
                  className="text-xs font-medium uppercase tracking-widest text-text-disabled hover:text-text-primary transition-colors"
                >
                  Claim this profile →
                </Link>
              )}
            </div>

            {/* RIGHT — portrait frame: first building image */}
            <div className="shrink-0 self-start">
              {portraitUrl ? (
                <div className="w-32 h-40 sm:w-44 sm:h-56 overflow-hidden bg-surface-muted">
                  <img
                    src={portraitUrl}
                    alt={`${architect.name} — portfolio`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-40 sm:w-44 sm:h-56 bg-surface-muted flex items-end p-3">
                  <span className="text-5xl sm:text-6xl font-bold text-border-strong leading-none select-none">
                    {architect.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ══ METRICS AS TABS ════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 bg-surface-default border-b border-border-default">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex -mb-px overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const isActive = activeSection === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveSection(tab.key)}
                    className={`shrink-0 px-5 py-3 border-b-2 transition-colors text-left ${
                      isActive
                        ? "border-text-primary"
                        : "border-transparent hover:border-border-default"
                    }`}
                  >
                    {tab.count !== null ? (
                      <>
                        <div
                          className={`text-base font-bold tracking-tight leading-none ${
                            isActive ? "text-text-primary" : "text-text-disabled"
                          }`}
                        >
                          {tab.count >= 1000
                            ? (tab.count / 1000).toFixed(1).replace(/\.0$/, "") + "k"
                            : tab.count.toLocaleString()}
                        </div>
                        <div
                          className={`text-2xs font-medium tracking-widest uppercase mt-0.5 ${
                            isActive ? "text-text-secondary" : "text-text-disabled"
                          }`}
                        >
                          {tab.label}
                        </div>
                      </>
                    ) : (
                      <div
                        className={`text-xs font-medium tracking-widest uppercase leading-none py-1 ${
                          isActive ? "text-text-primary" : "text-text-disabled"
                        }`}
                      >
                        {tab.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ CONTENT BODY ════════════════════════════════════════════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[60vh] py-10">

            {/* ── PROJECTS / BUILT TABS (both are building grids) ── */}
            {(activeSection === "projects" || activeSection === "built") && (
              <>
                {filteredBuildings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-8 gap-5 text-center">
                    <Building2 className="h-7 w-7 text-text-disabled" strokeWidth={1.5} />
                    <div className="space-y-2">
                      <p className="text-base font-semibold text-text-primary">
                        {activeSection === "built"
                          ? "No built works listed"
                          : "No designs listed yet"}
                      </p>
                      <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
                        {activeSection === "built"
                          ? "No confirmed built projects have been added for this architect."
                          : "We haven't added any buildings for this architect yet."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10 pb-16">
                    {filteredBuildings.map((building) => (
                      <ArchitectBuildingCard
                        key={building.id}
                        building={building}
                        onClick={() => navigate(`/building/${building.id}`)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── ABOUT TAB ── */}
            {activeSection === "about" && (
              <div className="max-w-md space-y-10">

                {architect.bio && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">
                      Bio
                    </p>
                    <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap">
                      {architect.bio}
                    </p>
                  </div>
                )}

                {architect.type && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">
                      Practice type
                    </p>
                    <p className="text-base text-text-primary capitalize">
                      {architect.type}
                    </p>
                  </div>
                )}

                {architect.headquarters && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">
                      Headquarters
                    </p>
                    <p className="text-base text-text-primary flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-text-disabled shrink-0" />
                      {architect.headquarters}
                    </p>
                  </div>
                )}

                {architect.website_url && (
                  <div>
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">
                      Website
                    </p>
                    <a
                      href={architect.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-base text-text-primary hover:opacity-60 transition-opacity"
                    >
                      {architect.website_url
                        .replace(/^https?:\/\/(www\.)?/, "")
                        .replace(/\/$/, "")}
                      <ExternalLink className="w-3.5 h-3.5 text-text-disabled" />
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-1.5">
                    On Plano
                  </p>
                  <p className="text-base text-text-primary">
                    {totalProjects} building{totalProjects !== 1 ? "s" : ""} listed
                    {builtWorks > 0 && builtWorks !== totalProjects && (
                      <span className="text-text-disabled">
                        {" "}· {builtWorks} built
                      </span>
                    )}
                  </p>
                </div>

                {/* Claim CTA in About tab */}
                {canClaim && (
                  <div className="border-t border-border-default pt-8">
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-3">
                      Is this you?
                    </p>
                    <p className="text-base text-text-secondary mb-5 leading-relaxed max-w-sm">
                      Claim this profile to connect your portfolio with your Plano
                      activity and get a verified badge.
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium uppercase tracking-widest text-text-primary hover:opacity-60 transition-opacity"
                      onClick={() => setClaimDialogOpen(true)}
                    >
                      Claim profile →
                    </button>
                  </div>
                )}

                {claimPending && (
                  <div className="border-t border-border-default pt-8">
                    <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled mb-2">
                      Claim status
                    </p>
                    <p className="text-sm text-text-secondary">
                      Your claim is pending review by our team.
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>
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

// ─── Editorial Building Card ──────────────────────────────────────────────────
// Portrait ratio, no borders, no icons. Bold name / faint location + year.
// Separate from Profile.tsx's EditorialBuildingCard because the data shape
// comes from useArchitect (building records) not FeedReview.
interface ArchitectBuilding {
  id: string;
  name: string;
  main_image_url: string | null;
  city?: string | null;
  country?: string | null;
  year_completed?: number | null;
  status?: string | null;
}

function ArchitectBuildingCard({
  building,
  onClick,
}: {
  building: ArchitectBuilding;
  onClick: () => void;
}) {
  const imgUrl = getBuildingImageUrl(building.main_image_url);
  const meta = [building.city, building.year_completed].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="group block text-left w-full"
    >
      {/* 3:4 portrait image, no rounding */}
      <div className="aspect-[3/4] overflow-hidden bg-surface-muted mb-3">
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={building.name}
            className="w-full h-full object-cover group-hover:opacity-85 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-end p-3">
            <span className="text-text-disabled text-xs font-medium uppercase tracking-wide leading-tight line-clamp-3">
              {building.name}
            </span>
          </div>
        )}
      </div>
      {/* Text — no icons, stark hierarchy */}
      <p className="text-sm font-bold text-text-primary leading-snug line-clamp-2 group-hover:opacity-60 transition-opacity">
        {building.name}
      </p>
      {meta && (
        <p className="text-2xs text-text-disabled mt-0.5 truncate">{meta}</p>
      )}
    </button>
  );
}