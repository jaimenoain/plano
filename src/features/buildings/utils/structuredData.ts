import type { BuildingDetails } from "../pages/BuildingDetails";

const SITE_URL = "https://plano.app";

export function buildingStructuredData(building: BuildingDetails) {
  return {
    "@context": "https://schema.org",
    "@type": "LandmarkOrBuilding",
    name: building.name,
    ...(building.alt_name && { alternateName: building.alt_name }),
    url: `${SITE_URL}/building/${building.short_id ?? building.id}/${building.slug}`,
    ...(building.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: building.address,
        addressLocality: building.city ?? undefined,
        addressCountry: building.country ?? undefined,
      },
    }),
    ...(building.year_completed && { dateCreated: String(building.year_completed) }),
    ...(building.architects?.length > 0 && {
      architect: building.architects.map((a) => ({
        "@type": "Person",
        name: a.name,
        url: `${SITE_URL}/architect/${a.id}`,
      })),
    }),
    ...(building.styles?.length > 0 && {
      additionalType: building.styles.map((s) => s.name),
    }),
  };
}

export function buildingDescription(building: BuildingDetails): string {
  const parts: string[] = [];
  if (building.city && building.country) {
    parts.push(`Located in ${building.city}, ${building.country}.`);
  }
  if (building.year_completed) {
    parts.push(`Completed in ${building.year_completed}.`);
  }
  if (building.architects?.length > 0) {
    parts.push(
      `Designed by ${building.architects.map((a) => a.name).join(", ")}.`
    );
  }
  if (parts.length === 0) {
    return `Discover ${building.name} on Plano — the world's architecture, cataloged.`;
  }
  return `${building.name}. ${parts.join(" ")} Discover this building on Plano.`;
}

export function architectStructuredData(architect: { id: string; name: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: architect.name,
    url: `${SITE_URL}/architect/${architect.id}`,
    jobTitle: "Architect",
  };
}

