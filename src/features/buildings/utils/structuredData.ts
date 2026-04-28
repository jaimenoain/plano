import type { BuildingDetails } from "../pages/BuildingDetails";
import type { BuildingCreditWithEntities } from "@/features/credits/types";
import {
  visiblePrimaryCredits,
  primaryCreditPlainLabel,
} from "@/features/credits/buildingCreditDisplay";
import { getBuildingUrl, getBuildingLocalityUrl, getCountryUrl, getLocalityUrl } from "@/utils/url";

export const SITE_URL = "https://plano.app";

/** Common English country names → ISO 3166-1 alpha-2 (Google prefers codes when known). */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  chile: "CL",
  argentina: "AR",
  peru: "PE",
  brazil: "BR",
  colombia: "CO",
  mexico: "MX",
  canada: "CA",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
  ireland: "IE",
  france: "FR",
  germany: "DE",
  italy: "IT",
  spain: "ES",
  portugal: "PT",
  netherlands: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  norway: "NO",
  sweden: "SE",
  denmark: "DK",
  finland: "FI",
  poland: "PL",
  greece: "GR",
  croatia: "HR",
  turkey: "TR",
  israel: "IL",
  egypt: "EG",
  "south africa": "ZA",
  japan: "JP",
  china: "CN",
  india: "IN",
  australia: "AU",
  "new zealand": "NZ",
  singapore: "SG",
  "south korea": "KR",
  korea: "KR",
  taiwan: "TW",
  uae: "AE",
  "united arab emirates": "AE",
  qatar: "QA",
  "saudi arabia": "SA",
  "hong kong": "HK",
};

function countryToIso3166Alpha2(country: string | null | undefined): string | undefined {
  if (country == null || typeof country !== "string") return undefined;
  const t = country.trim();
  if (!t) return undefined;
  if (/^[A-Za-z]{2}$/.test(t)) {
    return t.toUpperCase();
  }
  return COUNTRY_NAME_TO_ISO[t.toLowerCase()];
}

export function buildingAbsoluteUrl(building: BuildingDetails): string {
  return `${SITE_URL}${getBuildingUrl(building.id, building.slug, building.short_id)}`;
}

/** Returns the canonical absolute URL: locality-scoped when locality data is available, legacy /building/ otherwise. */
export function buildingCanonicalUrl(
  building: BuildingDetails,
  locality?: { country_code: string; city_slug: string } | null,
): string {
  if (locality) {
    return `${SITE_URL}${getBuildingLocalityUrl(locality.country_code, locality.city_slug, building.id, building.slug, building.short_id)}`;
  }
  return buildingAbsoluteUrl(building);
}

export interface BuildingRatingData {
  averageRating: number;
  reviewCount: number;
}

export function buildingStructuredData(
  building: BuildingDetails,
  credits?: BuildingCreditWithEntities[],
  ratingData?: BuildingRatingData,
  locality?: { country_code: string; city_slug: string } | null,
) {
  const url = buildingCanonicalUrl(building, locality);
  const year = building.year_completed;
  const yearIso =
    typeof year === "number" && Number.isFinite(year)
      ? `${year}-01-01`
      : undefined;

  const addressCountry = countryToIso3166Alpha2(building.country);

  const address = building.address
    ? {
        "@type": "PostalAddress" as const,
        streetAddress: building.address,
        ...(building.city ? { addressLocality: building.city } : {}),
        ...(addressCountry ? { addressCountry } : {}),
      }
    : undefined;

  const architectFromCredits =
    credits && credits.length > 0
      ? visiblePrimaryCredits(credits).flatMap((c) => {
          const nodes: Array<
            | { "@type": "Person"; name: string; url: string }
            | { "@type": "Organization"; name: string; url: string }
          > = [];
          if (c.person) {
            nodes.push({
              "@type": "Person",
              name: c.person.name,
              url: `${SITE_URL}/person/${c.person.slug}`,
            });
          }
          if (c.company) {
            nodes.push({
              "@type": "Organization",
              name: c.company.name,
              url: `${SITE_URL}/company/${c.company.slug}`,
            });
          }
          return nodes;
        })
      : [];

  const architect =
    architectFromCredits.length > 0 ? architectFromCredits : undefined;

  const styleProperties =
    building.styles && building.styles.length > 0
      ? building.styles.map((s) => ({
          "@type": "PropertyValue" as const,
          name: "Architectural style",
          value: s.name,
        }))
      : undefined;

  const aggregateRating =
    ratingData && ratingData.reviewCount > 0
      ? {
          "@type": "AggregateRating" as const,
          ratingValue: ratingData.averageRating,
          reviewCount: ratingData.reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LandmarkOrBuilding",
    name: building.name,
    ...(building.alt_name ? { alternateName: building.alt_name } : {}),
    url,
    ...(address ? { address } : {}),
    ...(yearIso ? { dateCreated: yearIso } : {}),
    ...(architect ? { architect } : {}),
    ...(styleProperties ? { additionalProperty: styleProperties } : {}),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildingBreadcrumbStructuredData(
  building: BuildingDetails,
  locality?: { country_code: string; city_slug: string; city: string; country: string } | null,
): object {
  const items: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }> = [
    { "@type": "ListItem", position: 1, name: "Plano", item: SITE_URL },
  ];

  if (locality) {
    const buildingUrl = `${SITE_URL}${getBuildingLocalityUrl(locality.country_code, locality.city_slug, building.id, building.slug, building.short_id)}`;
    items.push({
      "@type": "ListItem",
      position: 2,
      name: "Architecture",
      item: `${SITE_URL}/architecture`,
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: locality.country,
      item: `${SITE_URL}${getCountryUrl(locality.country_code)}`,
    });
    items.push({
      "@type": "ListItem",
      position: 4,
      name: locality.city,
      item: `${SITE_URL}${getLocalityUrl(locality.country_code, locality.city_slug)}`,
    });
    items.push({
      "@type": "ListItem",
      position: 5,
      name: building.name,
      item: buildingUrl,
    });
  } else {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: building.name,
      item: buildingAbsoluteUrl(building),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function collectionStructuredData(collection: {
  name: string;
  description: string | null;
  slug: string;
  /** Canonical list URL (e.g. `/:username/map/:slug`); defaults to legacy `/collection/:slug` if omitted. */
  listUrl?: string;
  buildings: Array<{ id: string; name: string; slug: string | null; short_id: number | null }>;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: collection.name,
    ...(collection.description ? { description: collection.description } : {}),
    url:
      collection.listUrl?.trim() ||
      `${SITE_URL}/collection/${collection.slug}`,
    numberOfItems: collection.buildings.length,
    itemListElement: collection.buildings.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: `${SITE_URL}${getBuildingUrl(b.id, b.slug, b.short_id)}`,
    })),
  };
}

export function buildingDescription(
  building: BuildingDetails,
  credits?: BuildingCreditWithEntities[],
): string {
  const parts: string[] = [];
  if (building.city && building.country) {
    parts.push(`Located in ${building.city}, ${building.country}.`);
  }
  if (building.year_completed) {
    parts.push(`Completed in ${building.year_completed}.`);
  }
  const creditLabels =
    credits && credits.length > 0
      ? visiblePrimaryCredits(credits)
          .map(primaryCreditPlainLabel)
          .filter((s) => s.length > 0)
      : [];
  if (creditLabels.length > 0) {
    parts.push(`Designed by ${creditLabels.join(", ")}.`);
  }
  if (parts.length === 0) {
    return `Discover ${building.name} on Plano — the world's architecture, cataloged.`;
  }
  return `${building.name}. ${parts.join(" ")} Discover this building on Plano.`;
}

/** Schema.org Person for `/person/:slug` (Roadmap Task 3.1). */
export function personPageStructuredData(person: {
  name: string;
  slug: string;
  nationality: string | null;
  imageAbsoluteUrl: string | null;
}) {
  const url = `${SITE_URL}/person/${person.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    url,
    ...(person.nationality ? { nationality: person.nationality } : {}),
    ...(person.imageAbsoluteUrl ? { image: person.imageAbsoluteUrl } : {}),
  };
}

/** Schema.org Organization for `/company/:slug` (Roadmap Task 4.1). */
export function companyPageStructuredData(company: {
  name: string;
  slug: string;
  country: string | null;
  logoAbsoluteUrl: string | null;
  website: string | null;
}) {
  const url = `${SITE_URL}/company/${company.slug}`;
  const sameAs =
    company.website?.trim() != null && company.website.trim().length > 0
      ? company.website.trim().startsWith("http")
        ? company.website.trim()
        : `https://${company.website.trim()}`
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    url,
    ...(company.country?.trim()
      ? {
          address: {
            "@type": "PostalAddress" as const,
            addressCountry: company.country.trim(),
          },
        }
      : {}),
    ...(company.logoAbsoluteUrl
      ? { logo: company.logoAbsoluteUrl, image: company.logoAbsoluteUrl }
      : {}),
    ...(sameAs ? { sameAs } : {}),
  };
}

/** Schema.org ItemList + BreadcrumbList for `/architecture/:cc/:city` locality pages. */
export function localityPageStructuredData(
  locality: {
    slug: string;
    city: string;
    country: string;
    country_code: string;
    city_slug: string;
    buildings_count: number;
    lat: number | null;
    lng: number | null;
    description: string | null;
  },
  buildings: Array<{
    id: string;
    name: string;
    slug: string | null;
    short_id: number;
  }>,
  canonicalUrl: string,
): object {
  const countryUrl = `${SITE_URL}${getCountryUrl(locality.country_code)}`;
  const localityUrl = `${SITE_URL}${getLocalityUrl(locality.country_code, locality.city_slug)}`;

  const itemList = {
    "@type": "ItemList",
    name: `Architecture in ${locality.city}, ${locality.country}`,
    ...(locality.description ? { description: locality.description } : {}),
    url: canonicalUrl,
    numberOfItems: locality.buildings_count,
    itemListElement: buildings.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: `${SITE_URL}${getBuildingUrl(b.id, b.slug, b.short_id)}`,
    })),
    ...(locality.lat && locality.lng
      ? {
          spatialCoverage: {
            "@type": "Place",
            geo: {
              "@type": "GeoCoordinates",
              latitude: locality.lat,
              longitude: locality.lng,
            },
          },
        }
      : {}),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Plano", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Architecture", item: `${SITE_URL}/architecture` },
      { "@type": "ListItem", position: 3, name: locality.country, item: countryUrl },
      { "@type": "ListItem", position: 4, name: locality.city, item: localityUrl },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [itemList, breadcrumb],
  };
}

/** Schema.org ItemList + BreadcrumbList for `/architecture/:cc` country pages. */
export function countryPageStructuredData(
  countryCode: string,
  countryName: string,
  localities: Array<{ city: string; country_code: string; city_slug: string }>,
  canonicalUrl: string,
): object {
  const itemList = {
    "@type": "ItemList",
    name: `Architecture in ${countryName}`,
    url: canonicalUrl,
    numberOfItems: localities.length,
    itemListElement: localities.map((loc, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: loc.city,
      url: `${SITE_URL}${getLocalityUrl(loc.country_code, loc.city_slug)}`,
    })),
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Plano", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Architecture", item: `${SITE_URL}/architecture` },
      { "@type": "ListItem", position: 3, name: countryName, item: `${SITE_URL}${getCountryUrl(countryCode)}` },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [itemList, breadcrumb],
  };
}

export function profileStructuredData(profile: {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
}) {
  const bio = profile.bio?.trim();
  const image = profile.avatar_url?.trim();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.username,
    alternateName: `@${profile.username}`,
    url: `${SITE_URL}/profile/${profile.username}`,
    ...(bio ? { description: bio } : {}),
    ...(image ? { image } : {}),
  };
}
