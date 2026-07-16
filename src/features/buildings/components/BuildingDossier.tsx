import {
  formatSqm,
  sizeCategoryLabel,
  SizeReferencePopover,
} from "./BuildingSizeReference";
import { formatCatalogLabel } from "./BuildingInfoSection";
import type { BuildingDetails } from "../pages/BuildingDetails";

// ─── Dossier ──────────────────────────────────────────────────────────────────

export interface DossierRow {
  key: string;
  label: string;
  value: string;
  /** Quiet second line under the value (e.g. access notes). */
  secondary?: string;
}

/** Pure row builder — the reference record the dossier renders. */
export function buildDossierRows(building: BuildingDetails): DossierRow[] {
  const rows: DossierRow[] = [];

  const address = building.address?.trim();
  if (address) {
    // Stored addresses often already end in the city ("… London, UK") — only
    // append the parts the address string doesn't carry yet.
    const tail = [building.city, building.country].filter(
      (p): p is string => !!p && !address.toLowerCase().includes(p.toLowerCase()),
    );
    rows.push({ key: "address", label: "Address", value: [address, ...tail].join(", ") });
  }

  if (building.category?.trim())
    rows.push({ key: "category", label: "Category", value: building.category });

  const context = formatCatalogLabel(building.context);
  if (context) rows.push({ key: "context", label: "Context", value: context });

  const intervention = formatCatalogLabel(building.intervention);
  if (intervention)
    rows.push({ key: "intervention", label: "Intervention", value: intervention });

  const sizeParts: string[] = [];
  if (building.size_category) sizeParts.push(sizeCategoryLabel(building.size_category));
  if (building.size_sqm) sizeParts.push(formatSqm(building.size_sqm));
  if (building.storeys) sizeParts.push(`${building.storeys} storeys`);
  if (building.height_m) sizeParts.push(`${building.height_m} m`);
  if (sizeParts.length > 0)
    rows.push({ key: "size", label: "Size", value: sizeParts.join(" · ") });

  if (building.materials?.length)
    rows.push({ key: "materials", label: "Materials", value: building.materials.join(" · ") });

  const accessParts = [
    formatCatalogLabel(building.access_level),
    formatCatalogLabel(building.access_logistics),
    formatCatalogLabel(building.access_cost),
  ].filter((v): v is string => Boolean(v));
  const accessNotes = building.access_notes?.trim();
  if (accessParts.length > 0 || accessNotes) {
    rows.push({
      key: "access",
      label: "Access",
      value: accessParts.join(" · "),
      secondary: accessNotes || undefined,
    });
  }

  const aka = [building.alt_name, ...(building.aliases ?? [])]
    .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
    .map((a) => a.trim())
    .filter((a) => a !== building.name);
  const akaDeduped = [...new Set(aka)];
  if (akaDeduped.length > 0)
    rows.push({ key: "aka", label: "Also known as", value: akaDeduped.join(" · ") });

  return rows;
}

/**
 * The consolidated details record — one label-column section (rhyming with the
 * Overview tab's Statement layout, mock `.bldg-body`) whose body is a hairline
 * definition list. Multi-value fields join with `·`; no chips, per the design
 * system's unboxed editorial grammar.
 */
export function BuildingDossier({ building }: { building: BuildingDetails }) {
  const rows = buildDossierRows(building);
  if (rows.length === 0) return null;

  return (
    <section
      aria-labelledby="building-dossier-heading"
      className="md:grid md:grid-cols-[220px_1fr] md:gap-16"
    >
      <h2
        id="building-dossier-heading"
        className="mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-text-secondary md:mb-0 md:pt-[1.125rem]"
      >
        Details
      </h2>
      <dl className="divide-y divide-border-default">
        {rows.map(({ key, label, value, secondary }) => (
          <div
            key={key}
            className="grid grid-cols-[110px_1fr] items-baseline gap-4 py-3.5 sm:grid-cols-[140px_1fr] sm:gap-6"
          >
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-text-disabled">
              {label}
              {key === "size" && <SizeReferencePopover />}
            </dt>
            <dd className="min-w-0 text-[15px] leading-relaxed text-text-primary">
              {value}
              {secondary && (
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{secondary}</p>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
