import { type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { Heart, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  formatSqm,
  sizeCategoryLabel,
  SizeReferencePopover,
} from "./BuildingSizeReference";
import { visiblePrimaryCredits } from "../../credits/buildingCreditDisplay";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";
import { BuildingAwardsSection } from "../../awards/components/BuildingAwardsSection";
import { cn } from "@/lib/utils";
import type { TopLink } from "../hooks/useBuildingInteractions";
import type { BuildingDetails } from "../pages/BuildingDetails";
import { formatCatalogLabel } from "./BuildingInfoSection";

// ─── Info tab ────────────────────────────────────────────────────────────────

export function BuildingInfoTab({
  building,
  buildingCredits,
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
  const primaryCredits = visiblePrimaryCredits(buildingCredits);
  const aliases = (building.aliases ?? []).filter((a): a is string => typeof a === "string" && a.trim().length > 0);

  const keyStats: { label: string; value: ReactNode }[] = [];
  if (building.year_completed) keyStats.push({ label: "Year", value: building.year_completed });
  if (building.city || building.country)
    keyStats.push({ label: "Location", value: [building.city, building.country].filter(Boolean).join(", ") });
  if (building.typology?.length)
    keyStats.push({ label: building.typology.length === 1 ? "Typology" : "Typologies", value: building.typology.join(", ") });

  const classificationRows: { label: string; value: string }[] = [];
  if (building.styles?.length)
    classificationRows.push({ label: "Style", value: building.styles.map((s) => s.name).join(", ") });
  if (building.category?.trim())
    classificationRows.push({ label: "Category", value: building.category });
  if (building.context?.trim())
    classificationRows.push({ label: "Context", value: formatCatalogLabel(building.context) ?? building.context });
  if (building.intervention?.trim())
    classificationRows.push({ label: "Intervention", value: formatCatalogLabel(building.intervention) ?? building.intervention });

  const accessParts = [
    formatCatalogLabel(building.access_level),
    formatCatalogLabel(building.access_logistics),
    formatCatalogLabel(building.access_cost),
  ].filter((v): v is string => Boolean(v));

  const hasClassification = classificationRows.length > 0;
  const hasMaterials = (building.materials?.length ?? 0) > 0;
  const hasAccess = accessParts.length > 0 || building.access_notes?.trim();
  const hasAliases = aliases.length > 0;
  const hasAddress = building.address?.trim();
  const hasSize = !!(building.size_category || building.size_sqm || building.storeys || building.height_m);

  return (
    <div className="space-y-0 divide-y divide-border-default">
      <BuildingAwardsSection buildingId={building.id} buildingName={building.name} />

      {/* Key facts — flush label/value list (aligns with the sections below) */}
      {keyStats.length > 0 && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-5">
            Key facts
          </p>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
            {keyStats.map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">
                  {label}
                </dt>
                <dd className="text-base font-medium text-text-primary">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Architect */}
      {primaryCredits.length > 0 && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-4">
            {primaryCredits.length === 1 ? "Architect" : "Architects"}
          </p>
          <div className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-text-primary leading-snug">
            <PrimaryCreditsLinks
              credits={buildingCredits}
              linkClassName="hover:underline underline-offset-4 decoration-1"
            />
          </div>
        </section>
      )}

      {/* Address */}
      {hasAddress && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-4">
            Address
          </p>
          <p className="text-sm text-text-primary leading-relaxed">
            {[building.address, building.city, building.country].filter(Boolean).join(", ")}
          </p>
        </section>
      )}

      {/* Classification */}
      {hasClassification && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-5">
            Classification
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
            {classificationRows.map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">
                  {label}
                </p>
                <p className="text-sm text-text-primary">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Size */}
      {hasSize && (
        <section className="py-8">
          <div className="flex items-center gap-2 mb-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
              Size
            </p>
            <SizeReferencePopover />
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {building.size_category && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">Category</p>
                <p className="text-sm text-text-primary">{sizeCategoryLabel(building.size_category)}</p>
              </div>
            )}
            {building.size_sqm && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">Floor Area</p>
                <p className="text-sm text-text-primary">{formatSqm(building.size_sqm)}</p>
              </div>
            )}
            {building.storeys && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">Storeys</p>
                <p className="text-sm text-text-primary">{building.storeys}</p>
              </div>
            )}
            {building.height_m && (
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-secondary mb-1">Height</p>
                <p className="text-sm text-text-primary">{building.height_m} m</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Materials */}
      {hasMaterials && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-5">
            Materials
          </p>
          <div className="flex flex-wrap gap-2">
            {building.materials!.map((m) => (
              <span
                key={m}
                className="px-3 py-1.5 bg-surface-muted border border-border-default text-xs text-text-primary font-medium"
              >
                {m}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Access */}
      {hasAccess && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-5">
            Access
          </p>
          {accessParts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {accessParts.map((part) => (
                <span
                  key={part}
                  className="px-3 py-1.5 bg-surface-muted border border-border-default text-xs text-text-primary font-medium"
                >
                  {part}
                </span>
              ))}
            </div>
          )}
          {building.access_notes?.trim() && (
            <p className="text-sm text-text-secondary leading-relaxed">
              {building.access_notes}
            </p>
          )}
        </section>
      )}

      {/* Aliases */}
      {hasAliases && (
        <section className="py-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary mb-4">
            Also Known As
          </p>
          <p className="text-sm text-text-secondary leading-relaxed">
            {aliases.join(" · ")}
          </p>
        </section>
      )}

      {/* Links & resources */}
      <section
        className="py-8"
        aria-labelledby="building-resources-heading"
      >
        <header className="mb-8 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary">
            References
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <h3
                id="building-resources-heading"
                className="text-xl font-semibold tracking-[-0.02em] text-text-primary sm:text-2xl"
              >
                Links &amp; resources
              </h3>
              <p className="max-w-xl text-sm leading-relaxed text-text-secondary">
                Articles, project pages, and references that help verify or explore this building.
              </p>
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => setShowLinkEditor(!showLinkEditor)}
                className="shrink-0 text-xs font-medium uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
              >
                {showLinkEditor ? "Close" : "Add link →"}
              </button>
            ) : null}
          </div>
        </header>

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
          <ul className="divide-y divide-border-default border-t border-border-default">
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
          <p className="text-sm text-text-secondary">
            No external links yet—add articles, competition pages, or the architect&apos;s project URL.
          </p>
        )}
      </section>

    </div>
  );
}
