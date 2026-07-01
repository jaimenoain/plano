/**
 * useBuildingDrawerData
 *
 * Progressive-enhancement fetch for the redesigned building detail drawer.
 * The drawer paints instantly from the ClusterResponse it already has (name,
 * hero image, city, status); this hook fills in the richer "mini profile"
 * content once it resolves:
 *
 *   - identity/about  → fetchBuildingDetails() (architect, year, styles,
 *                       category, typologies, materials, architect_statement)
 *   - photo gallery   → get_building_reviews() images (official first, then by
 *                       likes), reusing the exact transform from the profile
 *   - community stats → visitor count + photo/review counts
 *   - your notes      → this user's building_posts (+ attached images)
 *   - collections     → which of the user's collections contain this building
 *
 * Everything runs in one React Query keyed by building id, so re-opening the
 * same building is instant and mutations can invalidate ['building-drawer', id].
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { fetchBuildingDetails } from '@/utils/supabaseFallback';
import { getBuildingImageUrl } from '@/utils/image';

export interface DrawerGalleryImage {
  id: string;
  url: string;
  caption?: string | null;
  is_official?: boolean;
}

export interface DrawerUserPost {
  id: string;
  body: string | null;
  created_at: string;
  updated_at: string;
  images: { id: string; url: string }[];
}

export interface BuildingDrawerData {
  architect: string | null;
  year: number | null;
  styles: string[];
  category: string | null;
  typologies: string[];
  materials: string[];
  architectStatement: string | null;
  gallery: DrawerGalleryImage[];
  stats: { visitors: number; photos: number; reviews: number };
  userPosts: DrawerUserPost[];
  collectionIds: string[];
}

interface ReviewImage {
  id: string;
  storage_path: string;
  likes_count?: number;
  created_at?: string;
  is_official?: boolean;
  caption?: string | null;
}
interface ReviewRow {
  id: string;
  user_id: string;
  content?: string | null;
  images?: ReviewImage[];
}

export function useBuildingDrawerData(
  buildingId: string,
  opts?: { enabled?: boolean; heroImageUrl?: string | null },
) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const heroUrl = getBuildingImageUrl(opts?.heroImageUrl ?? undefined);

  return useQuery<BuildingDrawerData>({
    queryKey: ['building-drawer', buildingId, userId],
    enabled: (opts?.enabled ?? true) && !!buildingId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [details, reviewsRes, visitorRes, userContent] = await Promise.all([
        // 1. Identity / about
        fetchBuildingDetails(buildingId).catch(() => null),
        // 2. Photos + review/photo counts
        supabase.rpc('get_building_reviews', { p_building_id: buildingId }),
        // 3. Visitor count
        supabase
          .from('user_buildings')
          .select('id', { count: 'exact', head: true })
          .eq('building_id', buildingId)
          .eq('status', 'visited'),
        // 4. This user's notes + collection membership
        fetchUserContent(buildingId, userId),
      ]);

      // ── Gallery + stats from reviews ──
      const rawEntries = (reviewsRes.error ? [] : (reviewsRes.data ?? [])) as unknown as ReviewRow[];
      const gallery: DrawerGalleryImage[] = [];
      const seenUrls = new Set<string>();
      let photoCount = 0;
      let reviewCount = 0;

      // Hero first, so the drawer's instant image stays the lead slide
      if (heroUrl) {
        gallery.push({ id: 'hero', url: heroUrl });
        seenUrls.add(heroUrl);
      }

      const collected: (DrawerGalleryImage & { likes: number; official: boolean })[] = [];
      rawEntries.forEach((entry) => {
        if (entry.content && entry.content.trim().length > 0) reviewCount += 1;
        (entry.images ?? []).forEach((img) => {
          photoCount += 1;
          const url = getBuildingImageUrl(img.storage_path);
          if (!url || seenUrls.has(url)) return;
          seenUrls.add(url);
          collected.push({
            id: img.id,
            url,
            caption: img.caption,
            is_official: img.is_official,
            likes: img.likes_count || 0,
            official: !!img.is_official,
          });
        });
      });

      collected.sort((a, b) => {
        if (a.official !== b.official) return a.official ? -1 : 1;
        return b.likes - a.likes;
      });
      collected.forEach(({ likes: _l, official: _o, ...img }) => gallery.push(img));

      const details2 = details as Record<string, unknown> | null;
      const architect =
        (details2?.creditedEntities as { name: string }[] | undefined)?.[0]?.name ?? null;

      return {
        architect,
        year: (details2?.year_completed as number | null) ?? null,
        styles: ((details2?.styles as { name: string }[] | undefined) ?? [])
          .map((s) => s?.name)
          .filter(Boolean) as string[],
        category: (details2?.category as string | null) ?? null,
        typologies: (details2?.typology as string[] | undefined) ?? [],
        materials: (details2?.materials as string[] | null) ?? [],
        architectStatement: (details2?.architect_statement as string | null) ?? null,
        gallery,
        stats: {
          visitors: visitorRes.count ?? 0,
          photos: photoCount,
          reviews: reviewCount,
        },
        userPosts: userContent.userPosts,
        collectionIds: userContent.collectionIds,
      };
    },
  });
}

async function fetchUserContent(
  buildingId: string,
  userId: string | null,
): Promise<{ userPosts: DrawerUserPost[]; collectionIds: string[] }> {
  if (!userId) return { userPosts: [], collectionIds: [] };

  const [postsRes, collectionsRes] = await Promise.all([
    supabase
      .from('building_posts')
      .select('id, body, created_at, updated_at')
      .eq('user_id', userId)
      .eq('building_id', buildingId)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('collection_items')
      .select('collection_id, collections(owner_id)')
      .eq('building_id', buildingId),
  ]);

  const posts = postsRes.data ?? [];
  const postIds = posts.map((p) => p.id);

  const imagesByPost = new Map<string, { id: string; url: string }[]>();
  if (postIds.length > 0) {
    const { data: imgRows } = await supabase
      .from('review_images')
      .select('id, storage_path, review_id')
      .in('review_id', postIds);
    (imgRows ?? []).forEach((img) => {
      const url = getBuildingImageUrl(img.storage_path);
      if (!url) return;
      const list = imagesByPost.get(img.review_id) ?? [];
      list.push({ id: img.id, url });
      imagesByPost.set(img.review_id, list);
    });
  }

  const userPosts: DrawerUserPost[] = posts
    .filter((p) => (p.body && p.body.trim().length > 0) || imagesByPost.get(p.id)?.length)
    .map((p) => ({
      id: p.id,
      body: p.body,
      created_at: p.created_at ?? '',
      updated_at: p.updated_at ?? p.created_at ?? '',
      images: imagesByPost.get(p.id) ?? [],
    }));

  const collectionIds = ((collectionsRes.data ?? []) as {
    collection_id: string;
    collections: { owner_id: string } | null;
  }[])
    .filter((item) => item.collections?.owner_id === userId)
    .map((item) => item.collection_id);

  return { userPosts, collectionIds };
}
