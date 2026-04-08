import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ContactInteraction, ContactRater } from "@/features/search/components/types";

export interface DiscoveryFeedImageRow {
  id: string;
  storage_path: string;
  likes_count?: number | null;
  created_at?: string | null;
  user_buildings?: {
    building_id: string;
    user: ContactRater | ContactRater[];
  } | null;
}

interface BuildingCreditEmbedRow {
  building_id: string;
  person: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
}

interface UserBuildingInteractionRow {
  building_id: string;
  status: string;
  rating: number | null;
  user: ContactRater | ContactRater[];
}

export interface DiscoveryFeedItem {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  year_completed: number | null;
  slug: string | null;
  main_image_url: string | null;
  save_count: number;
  credits: { id: string; name: string }[] | null;
  contact_interactions?: ContactInteraction[];
  images?: DiscoveryFeedImageRow[];
}

export interface DiscoveryFilters {
  city?: string | null;
  country?: string | null;
  region?: string | null;
  categoryId?: string | null;
  typologyIds?: string[];
  attributeIds?: string[];
  architectIds?: string[];
}

export function useDiscoveryFeed(filters: DiscoveryFilters) {
  const { user } = useAuth();
  const LIMIT = 10;

  // Destructure for dependency array stability
  const { city, country, region, categoryId, typologyIds, attributeIds, architectIds } = filters;

  return useInfiniteQuery({
    queryKey: ["discovery_feed", user?.id, city, country, region, categoryId, typologyIds, attributeIds, architectIds],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_discovery_feed", {
        p_user_id: user.id,
        p_limit: LIMIT,
        p_offset: pageParam,
        ...(city ? { p_city_filter: city } : {}),
        ...(country ? { p_country_filter: country } : {}),
        ...(region ? { p_region_filter: region } : {}),
        ...(categoryId ? { p_category_id: categoryId } : {}),
        ...(typologyIds && typologyIds.length > 0 ? { p_typology_ids: typologyIds } : {}),
        ...(attributeIds && attributeIds.length > 0 ? { p_attribute_ids: attributeIds } : {}),
        ...(architectIds && architectIds.length > 0 ? { p_architect_ids: architectIds } : {}),
      });

      if (error) throw error;

      const buildings = data as unknown as DiscoveryFeedItem[];

      if (buildings.length > 0) {
        const buildingIds = buildings.map(b => b.id);


        // Fetch primary credits, follows, and images in parallel
        const [creditsRes, followsRes, ...imageResponses] = await Promise.all([
          supabase
            .from("building_credits")
            .select(
              `
              building_id,
              credit_tier,
              status,
              person:people(id, name),
              company:companies(id, name)
            `,
            )
            .in("building_id", buildingIds)
            .eq("credit_tier", "primary")
            .in("status", ["active", "verified"]),
          supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id),
          // Fetch up to 10 images for each building individually so one doesn't starve the rest
          ...buildingIds.map(buildingId =>
              supabase
                .from('review_images')
                .select(`
                  id,
                  storage_path,
                  likes_count,
                  created_at,
                  user_buildings!review_images_review_id_fkey!inner(
                    building_id,
                    user:profiles(
                      id,
                      username,
                      avatar_url,
                      first_name,
                      last_name
                    )
                  )
                `)
                .eq('user_buildings.building_id', buildingId)
                .order('likes_count', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(10)
          )
        ]);

        const creditsData = creditsRes.data;
        const followsData = followsRes.data;
        // Merge all individual building image results
        const imagesData = imageResponses.flatMap(res => res.data || []);

        if (creditsData) {
          const creditsMap: Record<string, { id: string; name: string }[]> = {};
          (creditsData as unknown as BuildingCreditEmbedRow[]).forEach((item) => {
            const p = item.person;
            const c = item.company;
            let entry: { id: string; name: string } | null = null;
            if (p && c) entry = { id: p.id, name: `${p.name} @ ${c.name}` };
            else if (p) entry = { id: p.id, name: p.name };
            else if (c) entry = { id: c.id, name: c.name };
            if (entry) {
              if (!creditsMap[item.building_id]) creditsMap[item.building_id] = [];
              creditsMap[item.building_id].push(entry);
            }
          });
          buildings.forEach((building) => {
            building.credits = creditsMap[building.id] || [];
          });
        }

        // --- Process Images ---
        if (imagesData) {
          const imagesMap: Record<string, DiscoveryFeedImageRow[]> = {};
          (imagesData as unknown as DiscoveryFeedImageRow[]).forEach((item) => {
             const buildingId = item.user_buildings?.building_id;
             if (buildingId) {
                 if (!imagesMap[buildingId]) imagesMap[buildingId] = [];
                 // Keep max 10 images per building to match useBuildingImages behavior
                 if (imagesMap[buildingId].length < 10) {
                     imagesMap[buildingId].push(item);
                 }
             }
          });
          buildings.forEach(building => {
              building.images = imagesMap[building.id] || [];
          });
        }

        // --- Process Interactions ---
        const followedIds = followsData?.map(f => f.following_id) || [];
        if (followedIds.length > 0) {
          const { data: interactions } = await supabase
            .from('user_buildings')
            .select(`
                building_id,
                status,
                rating,
                user:profiles!inner(id, username, avatar_url, first_name, last_name)
            `)
            .in('building_id', buildingIds)
            .in('user_id', followedIds)
            .or('status.eq.visited,status.eq.pending,rating.gt.0');

          if (interactions) {
            const interactionsMap: Record<string, ContactInteraction[]> = {};

            (interactions as unknown as UserBuildingInteractionRow[]).forEach((item) => {
              const userProfile = Array.isArray(item.user) ? item.user[0] : item.user;

              const interaction: ContactInteraction = {
                user: {
                  id: userProfile.id,
                  username: userProfile.username ?? null,
                  avatar_url: userProfile.avatar_url,
                  first_name: userProfile.first_name ?? null,
                  last_name: userProfile.last_name ?? null
                },
                status: item.status as ContactInteraction["status"],
                rating: item.rating
              };

              if (!interactionsMap[item.building_id]) {
                interactionsMap[item.building_id] = [];
              }
              interactionsMap[item.building_id].push(interaction);
            });

            buildings.forEach(building => {
              building.contact_interactions = interactionsMap[building.id] || [];
            });
          }
        }
      }

      return buildings;
    },
    getNextPageParam: (lastPage, allPages) => {
      // If we got fewer results than limit, there are no more pages
      if (lastPage.length < LIMIT) return undefined;
      return allPages.length * LIMIT;
    },
    enabled: !!user,
    initialPageParam: 0,
  });
}
