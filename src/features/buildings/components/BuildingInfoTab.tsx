import type { User } from "@supabase/supabase-js";
import { Link } from "react-router";
import { Heart, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { getBuildingUrl } from "@/utils/url";
import { BuildingAwardsSection } from "../../awards/components/BuildingAwardsSection";
import { BuildingFactsStrip, buildFacts } from "./BuildingFactsStrip";
import { BuildingDossier, buildDossierRows } from "./BuildingDossier";
import type { TopLink } from "../hooks/useBuildingInteractions";
import type { BuildingDetails } from "../pages/BuildingDetails";

// ─── Info tab ────────────────────────────────────────────────────────────────

/**
 * The building's dossier — an editorial sequence of movements (facts strip →
 * details list → awards → references) matching the masthead/Overview refresh,
 * instead of the old flat stack of equal-weight micro-sections.
 */
export function BuildingInfoTab({
  building,
  topLinks,
  user,
  showLinkEditor,
  setShowLinkEditor,
  newLinkUrl,
  setNewLinkUrl,
  newLinkTitle,
  setNewLinkTitle,
  handleAddLink,
  handleLinkLike,
  likedLinkIds,
}: {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
  topLinks: TopLink[];
  user: User | null;
  showLinkEditor: boolean;
  setShowLinkEditor: (v: boolean) => void;
  newLinkUrl: string;
  setNewLinkUrl: (v: string) => void;
  newLinkTitle: string;
  setNewLinkTitle: (v: string) => void;
  handleAddLink: () => void;
  handleLinkLike: (linkId: string) => Promise<void>;
  likedLinkIds: Set<string>;
}) {
  // The strip hides below 3 facts and the dossier below 1 row — when both
  // bow out, the whole record is empty and one contribution prompt leads.
  const isBareRecord =
    buildFacts(building).length < 3 && buildDossierRows(building).length === 0;

  return (
    <div className="space-y-16 md:space-y-20">
      {isBareRecord ? (
        <EmptyState
          eyebrow="No details yet"
          message="Know this building? Add its facts, materials, and access details."
          action={
            <Link
              className="cta-link"
              to={`${getBuildingUrl(building.id, building.slug, building.short_id)}/edit`}
            >
              Add details
            </Link>
          }
        />
      ) : (
        <>
          <BuildingFactsStrip building={building} />
          <BuildingDossier building={building} />
        </>
      )}

      <BuildingAwardsSection
        buildingId={building.id}
        buildingName={building.name}
        variant="feature"
      />

      {/* References */}
      <section aria-labelledby="building-resources-heading">
        <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-border-default pb-4">
          <h2
            id="building-resources-heading"
            className="text-2xl font-semibold tracking-[-0.02em] text-text-primary md:text-[28px]"
          >
            References
          </h2>
          <div className="flex shrink-0 items-baseline gap-5">
            {topLinks.length > 0 && (
              <span className="eyebrow tracking-[0.15em]">
                {topLinks.length} {topLinks.length === 1 ? "link" : "links"}
              </span>
            )}
            {user ? (
              <button
                type="button"
                onClick={() => setShowLinkEditor(!showLinkEditor)}
                className="text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary transition-colors hover:text-text-primary"
              >
                {showLinkEditor ? "Close" : "Add link →"}
              </button>
            ) : null}
          </div>
        </div>

        {showLinkEditor && user && (
          <div className="mb-8 flex flex-col gap-2 rounded-none border border-border-default bg-surface-muted p-4 sm:flex-row sm:items-center">
            <Input
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://"
              className="h-10 flex-1 border-border-default bg-surface-card text-sm"
            />
            <Input
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Title (optional)"
              className="h-10 flex-1 border-border-default bg-surface-card text-sm"
            />
            <Button
              size="sm"
              className="h-10 shrink-0 sm:px-6"
              onClick={() => void handleAddLink()}
              disabled={!newLinkUrl.trim()}
            >
              Add
            </Button>
          </div>
        )}

        {topLinks.length > 0 ? (
          <ul className="divide-y divide-border-default">
            {topLinks.map((link) => {
              let domain = "";
              try {
                domain = new URL(link.url).hostname;
              } catch {
                /* ignore */
              }
              return (
                <li key={link.link_id}>
                  <div className="group flex items-center justify-between gap-4 py-4">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-sm font-semibold text-text-primary group-hover:underline underline-offset-4">
                        {link.title || domain}
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                        {domain}
                      </div>
                    </a>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleLinkLike(link.link_id);
                        }}
                        className={cn(
                          "flex items-center gap-1 text-[10px] font-bold transition-colors",
                          likedLinkIds.has(link.link_id)
                            ? "text-text-primary"
                            : "text-text-disabled hover:text-text-primary",
                        )}
                      >
                        <Heart
                          className={cn(
                            "h-3 w-3",
                            likedLinkIds.has(link.link_id) && "fill-current",
                          )}
                        />
                        {link.like_count}
                      </button>
                      <ExternalLink className="h-3.5 w-3.5 text-text-disabled transition-colors group-hover:text-text-primary" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            eyebrow="No links yet"
            message="Add articles, competition pages, or the architect's project URL."
            action={
              user ? (
                <button
                  type="button"
                  className="cta-link"
                  onClick={() => setShowLinkEditor(true)}
                >
                  Add the first link
                </button>
              ) : undefined
            }
          />
        )}
      </section>
    </div>
  );
}
