import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Pencil } from "lucide-react";
import { formatSqm, sizeCategoryLabel } from "./BuildingSizeReference";
import { visiblePrimaryCredits } from "../../credits/buildingCreditDisplay";
import { getBuildingUrl } from "@/utils/url";
import { PrimaryCreditsLinks } from "./PrimaryCreditsLinks";
import { BuildingAwardsSection } from "../../awards/components/BuildingAwardsSection";
import type { BuildingDetails } from "../pages/BuildingDetails";

export function formatCatalogLabel(value: string | null | undefined): string | null {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  return v
    .split("_")
    .map((part) =>
      part.length === 0
        ? ""
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join(" ");
}

// ─── Building info definition list ───────────────────────────────────────────

export function BuildingInfoSection({
  building,
  buildingCredits,
  canEdit,
}: {
  building: BuildingDetails;
  buildingCredits: import("@/features/credits/types").BuildingCreditWithEntities[];
  canEdit: boolean;
}) {
  const navigate = useNavigate();
  const primaryCredits = visiblePrimaryCredits(buildingCredits);

  const rows = useMemo(() => {
    const items: { label: string; value: ReactNode; key: string }[] = [];

    if (primaryCredits.length > 0) {
      items.push({
        key: "architect",
        label: "Architect",
        value: (
          <PrimaryCreditsLinks
            credits={buildingCredits}
            linkClassName="text-text-primary font-medium hover:underline underline-offset-2"
          />
        ),
      });
    }

    if (building.year_completed) {
      items.push({ key: "year", label: "Year", value: building.year_completed });
    }

    const locationParts = [building.address, building.city, building.country].filter(Boolean);
    if (locationParts.length > 0) {
      items.push({ key: "location", label: "Location", value: locationParts.join(", ") });
    }

    if (building.typology?.length) {
      items.push({ key: "typology", label: "Typology", value: building.typology.join(", ") });
    }

    if (building.styles?.length) {
      items.push({ key: "style", label: "Style", value: building.styles.map((s) => s.name).join(", ") });
    }

    if (building.materials?.length) {
      items.push({ key: "materials", label: "Materials", value: building.materials.join(", ") });
    }

    if (building.category?.trim()) {
      items.push({ key: "category", label: "Category", value: building.category });
    }

    if (building.size_category || building.size_sqm || building.storeys || building.height_m) {
      const parts: string[] = [];
      if (building.size_category) parts.push(sizeCategoryLabel(building.size_category));
      if (building.size_sqm) parts.push(formatSqm(building.size_sqm));
      if (building.storeys) parts.push(`${building.storeys} fl`);
      if (building.height_m) parts.push(`${building.height_m} m`);
      items.push({ key: "size", label: "Size", value: parts.join(" · ") });
    }

    if (building.context?.trim()) {
      items.push({ key: "context", label: "Context", value: formatCatalogLabel(building.context) });
    }

    if (building.intervention?.trim()) {
      items.push({ key: "intervention", label: "Intervention", value: formatCatalogLabel(building.intervention) });
    }

    if (building.access_level) {
      const accessParts = [
        formatCatalogLabel(building.access_level),
        formatCatalogLabel(building.access_logistics),
        formatCatalogLabel(building.access_cost),
      ].filter(Boolean);
      items.push({ key: "access", label: "Access", value: accessParts.join(" · ") });
    }

    if (building.access_notes?.trim()) {
      items.push({ key: "access-notes", label: "Access Notes", value: building.access_notes });
    }

    const aliases = (building.aliases ?? []).filter((a): a is string => typeof a === "string" && a.trim().length > 0);
    if (aliases.length > 0) {
      items.push({ key: "aliases", label: "Also known as", value: aliases.join(", ") });
    }

    return items;
  }, [building, buildingCredits, primaryCredits.length]);

  if (rows.length === 0) return null;

  return (
    <section className="group/info">
      <BuildingAwardsSection buildingId={building.id} buildingName={building.name} />
      <div className="flex items-center gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
          Building Info
        </h3>
        {canEdit && (
          <button
            className="opacity-0 group-hover/info:opacity-100 transition-opacity inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary"
            onClick={() =>
              navigate(getBuildingUrl(building.id, building.slug, building.short_id) + "/edit")
            }
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
      </div>
      <dl className="mt-3 divide-y divide-border-default">
        {rows.map(({ key, label, value }) => (
          <div key={key} className="flex items-baseline gap-6 py-3">
            <dt className="text-xs text-text-secondary shrink-0 w-24 md:w-28">{label}</dt>
            <dd className="text-sm text-text-primary flex-1 min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
