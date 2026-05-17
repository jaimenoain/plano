export type GeoScope = 'global' | 'national' | 'local';

export interface PlanoUpdate {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string | null;
  heroImageUrl: string | null;
  tags: string[];
  geoScope: GeoScope;
  countryCode: string | null;
  localityId: string | null;
  localityCity: string | null;
  publishedAt: string | null;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUpdatePayload {
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  hero_image_url?: string | null;
  tags?: string[];
  geo_scope: GeoScope;
  country_code?: string | null;
  locality_id?: string | null;
  published_at?: string | null;
  author_id: string;
}

export interface UpdateUpdatePayload {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  body?: string | null;
  hero_image_url?: string | null;
  tags?: string[];
  geo_scope?: GeoScope;
  country_code?: string | null;
  locality_id?: string | null;
  published_at?: string | null;
}
