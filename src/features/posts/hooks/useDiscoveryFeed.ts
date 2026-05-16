import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ContactInteraction, ContactRater } from "@/features/search/components/types";
import type { CreditRole } from "@/features/credits/types";
import type { ExploreViewportBounds } from "@/features/explore/exploreLocationFilter";

export interface DiscoveryFeedImageRow {
  id: string;
  storage_path: string;
  likes_count?: number | null;
  created_at?: string | null;
  building_posts?: {
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
  short_id: number | null;
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
  /** ISO 3166-1 alpha-2 from geocoder; preferred over free-text `country` for RPC matching. */
  countryCode?: string | null;
  region?: string | null;
  /** Tier 1: catalog locality from resolve_locality_for_explore + localities row. */
  localityId?: string | null;
  /** Tier 2: Google viewport when tier 1 did not match; omitted when localityId is set. */
  viewportBounds?: ExploreViewportBounds | null;
  categoryId?: string | null;
  typologyIds?: string[];
  attributeIds?: string[];
  architectIds?: string[];
  creditRoles?: CreditRole[];
  contactUserIds?: string[];
  buildingStatuses?: string[];
}

export function useDiscoveryFeed(filters: DiscoveryFilters) {
  const { user } = useAuth();
  const LIMIT = 10;

  // Destructure for dependency array stability
  const {
    city,
    country,
    countryCode,
    region,
    localityId,
    viewportBounds,
    categoryId,
    typologyIds,
    attributeIds,
    architectIds,
    creditRoles,
    contactUserIds,
    buildingStatuses,
  } = filters;

  return useInfiniteQuery({
    queryKey: [
      "discovery_feed",
      user?.id,
      city,
      country,
      countryCode,
      region,
      localityId,
      viewportBounds,
      categoryId,
      typologyIds,
      attributeIds,
      architectIds,
      creditRoles,
      contactUserIds,
      buildingStatuses,
    ],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return [];

      // Always send extended-only array params (even as []) so PostgREST picks the
      // canonical function when a legacy get_discovery_feed(uuid,int,int,text) overload
      // still exists on the database; omitting them can make the RPC ambiguous.
      const { data, error } = await supabase.rpc("get_discovery_feed", {
        p_user_id: user.id,
        p_limit: LIMIT,
        p_offset: pageParam,
        ...(city ? { p_city_filter: city } : {}),
        ...(country ? { p_country_filter: country } : {}),
        ...(countryCode ? { p_country_code_filter: countryCode } : {}),
        ...(region ? { p_region_filter: region } : {}),
        ...(localityId ? { p_locality_id: localityId } : {}),
        ...(!localityId && viewportBounds
          ? {
              p_min_lat: viewportBounds.minLat,
              p_max_lat: viewportBounds.maxLat,
              p_min_lng: viewportBounds.minLng,
              p_max_lng: viewportBounds.maxLng,
            }
          : {}),
        ...(categoryId ? { p_category_id: categoryId } : {}),
        p_typology_ids: typologyIds && typologyIds.length > 0 ? typologyIds : [],
        p_attribute_ids:
          attributeIds && attributeIds.length > 0 ? attributeIds : [],
        p_architect_ids:
          architectIds && architectIds.length > 0 ? architectIds : [],
        p_credit_roles:
          creditRoles && creditRoles.length > 0 ? creditRoles : [],
        p_contact_user_ids:
          contactUserIds && contactUserIds.length > 0 ? contactUserIds : [],
        p_building_statuses:
          buildingStatuses && buildingStatuses.length > 0 ? buildingStatuses : [],
      });

      if (error) throw error;

      const raw = data as unknown;
      const buildings: DiscoveryFeedItem[] = Array.isArray(raw)
        ? (raw as DiscoveryFeedItem[])
        : raw != null && typeof raw === "object"
          ? [raw as DiscoveryFeedItem]
          : [];

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
          // Fetch up to 10 images for each building individually so one doesn't starve the rest.
          // review_images.review_id now references building_posts (was user_buildings before
          // the 20270872 migration); keep the embed pointed at the canonical FK.
          ...buildingIds.map(buildingId =>
              supabase
                .from('review_images')
                .select(`
                  id,
                  storage_path,
                  likes_count,
                  created_at,
                  building_posts!review_images_review_id_fkey!inner(
                    building_id,
                    user:profiles(
                      id,
                      username,
                      avatar_url
                    )
                  )
                `)
                .eq('building_posts.building_id', buildingId)
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
             const buildingId = item.building_posts?.building_id;
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
                user:profiles!inner(id, username, avatar_url)
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
                  first_name: null,
                  last_name: null,
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
