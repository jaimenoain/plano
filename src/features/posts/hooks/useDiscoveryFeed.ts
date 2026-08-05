import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CreditRole } from "@/features/credits/types";
import type { ExploreViewportBounds } from "@/features/explore/exploreLocationFilter";
import {
  hydrateDiscoveryBuildings,
  type ContactInteraction,
  type BuildingCreditEmbedRow,
  type DiscoveryFeedImageRow,
  type UserBuildingInteractionRow,
} from "../utils/discoveryFeedHydration";

export type { DiscoveryFeedImageRow };

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

/**
 * Keyset cursor into the feed, matching the RPC's `(save_count DESC, id ASC)` order.
 *
 * Not an offset: `get_discovery_feed` hides every building the user has interacted
 * with, and Explore records one for each building paged past, so the result set
 * shrinks as it is read. An offset computed from pages-so-far therefore landed past
 * buildings that were never shown — they vanished from the feed without being seen.
 */
export interface DiscoveryCursor {
  saveCount: number;
  id: string;
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

  // Cache follows separately so they are not re-fetched on every page load.
  // The result is stable (changes only when the user follows/unfollows someone)
  // and is shared across all pages of the infinite query.
  const { data: followedIds = [] } = useQuery({
    queryKey: ["follows", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id);
      return data?.map((f) => f.following_id) ?? [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

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
    queryFn: async ({ pageParam }) => {
      if (!user) return [];
      const cursor = pageParam as DiscoveryCursor | null;

      // Always send extended-only array params (even as []) so PostgREST picks the
      // canonical function when a legacy get_discovery_feed(uuid,int,int,text) overload
      // still exists on the database; omitting them can make the RPC ambiguous.
      const { data, error } = await supabase.rpc("get_discovery_feed", {
        p_user_id: user.id,
        p_limit: LIMIT,
        // Legacy positional arg the RPC still declares; the cursor supersedes it.
        p_offset: 0,
        ...(cursor
          ? { p_after_save_count: cursor.saveCount, p_after_id: cursor.id }
          : {}),
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

      if (buildings.length === 0) return buildings;

      const buildingIds = buildings.map((b) => b.id);

      // Single batched image query instead of one-per-building.
      // review_images.review_id references building_posts (post-20270872 migration).
      const imagesQuery = supabase
        .from("review_images")
        .select(
          `
          id,
          storage_path,
          likes_count,
          created_at,
          building_posts!review_images_review_id_fkey!inner(
            building_id,
            user:profiles!building_posts_user_id_fkey(id, username, avatar_url)
          )
        `,
        )
        .in("building_posts.building_id", buildingIds)
        .order("likes_count", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(buildingIds.length * 10);

      // Fetch credits, images, and interactions (when follows exist) all at once.
      const [creditsRes, imagesRes, interactionsRes] = await Promise.all([
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
        imagesQuery,
        followedIds.length > 0
          ? supabase
              .from("user_buildings")
              .select(
                `
              building_id,
              status,
              rating,
              user:profiles!inner(id, username, avatar_url)
            `,
              )
              .in("building_id", buildingIds)
              .in("user_id", followedIds)
              .or("status.eq.visited,status.eq.pending,rating.gt.0")
          : Promise.resolve({ data: [] as UserBuildingInteractionRow[] }),
      ]);

      return hydrateDiscoveryBuildings(buildings, {
        credits: creditsRes.data as unknown as BuildingCreditEmbedRow[] | null,
        images: imagesRes.data as unknown as DiscoveryFeedImageRow[] | null,
        interactions: (
          interactionsRes as { data: UserBuildingInteractionRow[] | null }
        ).data,
      });
    },
    getNextPageParam: (lastPage): DiscoveryCursor | undefined => {
      if (lastPage.length < LIMIT) return undefined;
      const last = lastPage[lastPage.length - 1];
      return { saveCount: last.save_count ?? 0, id: last.id };
    },
    enabled: !!user,
    initialPageParam: null as DiscoveryCursor | null,
  });
}
