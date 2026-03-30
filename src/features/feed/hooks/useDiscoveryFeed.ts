import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ContactInteraction } from "@/features/search/components/types";

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
  architects: { id: string; name: string }[] | null;
  contact_interactions?: ContactInteraction[];
  images?: any[];
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
        p_city_filter: city || null,
        p_country_filter: country || null,
        p_region_filter: region || null,
        p_category_id: categoryId || null,
        p_typology_ids: typologyIds && typologyIds.length > 0 ? typologyIds : null,
        p_attribute_ids: attributeIds && attributeIds.length > 0 ? attributeIds : null,
        p_architect_ids: architectIds && architectIds.length > 0 ? architectIds : null,
      });

      if (error) throw error;

      const buildings = data as DiscoveryFeedItem[];

      if (buildings.length > 0) {
        const buildingIds = buildings.map(b => b.id);


        // Fetch Architects, Follows, and Images in parallel
        const [architectsRes, followsRes, ...imageResponses] = await Promise.all([
          supabase
            .from('building_architects')
            .select('building_id, architects(id, name)')
            .in('building_id', buildingIds),
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

        const architectsData = architectsRes.data;
        const followsData = followsRes.data;
        // Merge all individual building image results
        const imagesData = imageResponses.flatMap(res => res.data || []);

        // --- Process Architects ---
        if (architectsData) {
          const architectsMap: Record<string, { id: string; name: string }[]> = {};
          architectsData.forEach((item: any) => {
            if (item.architects) {
              if (!architectsMap[item.building_id]) {
                architectsMap[item.building_id] = [];
              }
              architectsMap[item.building_id].push(item.architects);
            }
          });
          buildings.forEach(building => {
            building.architects = architectsMap[building.id] || [];
          });
        }

        // --- Process Images ---
        if (imagesData) {
          const imagesMap: Record<string, any[]> = {};
          imagesData.forEach((item: any) => {
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

            interactions.forEach((item: any) => {
              const userProfile = Array.isArray(item.user) ? item.user[0] : item.user;

              const interaction: ContactInteraction = {
                user: {
                  id: userProfile.id,
                  username: userProfile.username,
                  avatar_url: userProfile.avatar_url,
                  first_name: userProfile.first_name,
                  last_name: userProfile.last_name
                },
                status: item.status,
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
