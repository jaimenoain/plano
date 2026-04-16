import { createClient } from '@/integrations/supabase/client';
import type { LocalityDTO } from '@/features/localities/types';
import type { FeedCollection } from '@/types/feed';

// ─── Localities ──────────────────────────────────────────────────────────────

export interface GuidesLocalityRow {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  slug: string;
  citySlug: string;
  heroImageUrl: string | null;
  buildingsCount: number;
}

export async function getGuidesLocalities(): Promise<GuidesLocalityRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('localities')
    .select('id, city, country, country_code, slug, city_slug, hero_image_url, buildings_count')
    .gt('buildings_count', 0)
    .order('buildings_count', { ascending: false })
    .limit(120);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    city: row.city,
    country: row.country,
    countryCode: row.country_code,
    slug: row.slug,
    citySlug: row.city_slug,
    heroImageUrl: row.hero_image_url ?? null,
    buildingsCount: row.buildings_count,
  }));
}

// ─── Popular collections ──────────────────────────────────────────────────────

export interface PopularCollection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  ownerId: string;
  ownerUsername: string;
  itemCount: number;
  favouritesCount: number;
  hasItinerary: boolean;
  previewImages: string[];
}

export async function getPopularCollections(limit = 12): Promise<PopularCollection[]> {
  const supabase = createClient();

  // Fetch public collections with favourite counts via a join
  const { data, error } = await supabase
    .from('collections')
    .select(`
      id,
      name,
      slug,
      description,
      owner_id,
      itinerary,
      profiles!collections_owner_id_fkey (username),
      collection_items (
        buildings (
          hero_image_url,
          community_preview_url
        )
      ),
      collection_favorites (count)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit * 3); // over-fetch so we can sort by favourites client-side

  if (error) throw error;

  const rows = (data ?? []).map((row: any) => {
    const favouritesCount: number = row.collection_favorites?.[0]?.count ?? 0;
    const items: any[] = row.collection_items ?? [];
    const previewImages: string[] = items
      .slice(0, 4)
      .map((item: any) => item.buildings?.hero_image_url ?? item.buildings?.community_preview_url)
      .filter(Boolean) as string[];

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? null,
      ownerId: row.owner_id,
      ownerUsername: (row.profiles as any)?.username ?? '',
      itemCount: items.length,
      favouritesCount,
      hasItinerary: row.itinerary !== null,
      previewImages,
    };
  });

  // Sort by favourites descending, then take top N
  return rows
    .sort((a, b) => b.favouritesCount - a.favouritesCount)
    .slice(0, limit);
}
