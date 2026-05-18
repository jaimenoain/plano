export const ARCHITECTURE_PREFIX = '/architecture';

export const getCountryUrl = (countryCode: string): string =>
  `${ARCHITECTURE_PREFIX}/${countryCode.toLowerCase()}`;

export const getLocalityUrl = (countryCode: string, citySlug: string): string =>
  `${ARCHITECTURE_PREFIX}/${countryCode.toLowerCase()}/${citySlug}`;

export const getBuildingLocalityUrl = (
  countryCode: string,
  citySlug: string,
  id: string,
  slug?: string | null,
  shortId?: number | null,
): string => {
  const idSegment = shortId != null ? String(shortId) : id;
  const s = slug?.trim();
  if (s) {
    return `${ARCHITECTURE_PREFIX}/${countryCode.toLowerCase()}/${citySlug}/${idSegment}/${s}`;
  }
  return `${ARCHITECTURE_PREFIX}/${countryCode.toLowerCase()}/${citySlug}/${idSegment}`;
};

export const getEventUrl = (event: {
  slug: string;
  countryCode: string | null;
  citySlug: string | null;
}): string => {
  if (event.countryCode && event.citySlug) {
    return `/events/${event.countryCode.toLowerCase()}/${event.citySlug}/${event.slug}`;
  }
  return `/events/${event.slug}`;
};

export type BuildingLinkInput = {
  id: string;
  slug?: string | null;
  short_id?: number | null;
  locality_country_code?: string | null;
  locality_city_slug?: string | null;
};

/** Prefer /architecture/:cc/:city/... when locality data is present; else legacy /building/... */
export const resolveBuildingUrl = (building: BuildingLinkInput): string => {
  if (building.locality_country_code && building.locality_city_slug) {
    return getBuildingLocalityUrl(
      building.locality_country_code,
      building.locality_city_slug,
      building.id,
      building.slug,
      building.short_id ?? null,
    );
  }
  return getBuildingUrl(building.id, building.slug, building.short_id ?? undefined);
};

/** Fallback for callers that don't yet have locality data. */
export const getBuildingUrl = (id: string, slug?: string | null, shortId?: number | null) => {
  if (shortId !== undefined && shortId !== null) {
    const s = slug?.trim();
    if (s) {
      return `/building/${shortId}/${s}`;
    }
    return `/building/${shortId}`;
  }
  return `/building/${id}`;
};

/**
 * Converts a string into a URL-safe slug.
 *
 * - Normalizes characters (NFD) and removes diacritics
 * - Converts to lowercase
 * - Replaces non-alphanumeric character sequences with a single hyphen
 * - Strips leading and trailing hyphens
 */
export const slugify = (text: string): string => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('getCountryUrl', () => {
    expect(getCountryUrl('FR')).toBe('/architecture/fr');
    expect(getCountryUrl('gb')).toBe('/architecture/gb');
  });
  it('getLocalityUrl', () => {
    expect(getLocalityUrl('FR', 'paris')).toBe('/architecture/fr/paris');
  });
  it('getBuildingLocalityUrl with slug and shortId', () => {
    expect(getBuildingLocalityUrl('FR', 'paris', 'uuid-123', 'tour-eiffel', 42)).toBe(
      '/architecture/fr/paris/42/tour-eiffel',
    );
  });
  it('getBuildingLocalityUrl without slug', () => {
    expect(getBuildingLocalityUrl('FR', 'paris', 'uuid-123', null, 42)).toBe(
      '/architecture/fr/paris/42',
    );
  });
  it('getBuildingLocalityUrl without shortId falls back to id', () => {
    expect(getBuildingLocalityUrl('GB', 'london', 'uuid-456', 'tate-modern')).toBe(
      '/architecture/gb/london/uuid-456/tate-modern',
    );
  });
  it('getEventUrl with locality', () => {
    expect(getEventUrl({ slug: 'my-event', countryCode: 'GB', citySlug: 'london' })).toBe('/events/gb/london/my-event');
  });
  it('getEventUrl without locality falls back to /events/:slug', () => {
    expect(getEventUrl({ slug: 'my-event', countryCode: null, citySlug: null })).toBe('/events/my-event');
  });
  it('getBuildingUrl fallback unchanged', () => {
    expect(getBuildingUrl('uuid-1', 'slug', 99)).toBe('/building/99/slug');
    expect(getBuildingUrl('uuid-1', null, 99)).toBe('/building/99');
    expect(getBuildingUrl('uuid-1')).toBe('/building/uuid-1');
  });
  it('resolveBuildingUrl prefers locality path', () => {
    expect(
      resolveBuildingUrl({
        id: 'uuid-1',
        slug: 'tour-eiffel',
        short_id: 42,
        locality_country_code: 'FR',
        locality_city_slug: 'paris',
      }),
    ).toBe('/architecture/fr/paris/42/tour-eiffel');
  });
  it('resolveBuildingUrl falls back without locality', () => {
    expect(resolveBuildingUrl({ id: 'uuid-1', slug: 'slug', short_id: 99 })).toBe(
      '/building/99/slug',
    );
  });
}
