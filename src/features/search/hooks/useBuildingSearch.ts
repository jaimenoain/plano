import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding, ContactRater } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Helper to calculate Haversine distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in meters
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

async function enrichBuildings(buildings: DiscoveryBuilding[], userId?: string) {
  if (!buildings.length) return [];

  const buildingIds = buildings.map(b => b.id);
  let enrichedBuildings = [...buildings];

  // 1. Image Enrichment
  const { data: reviews } = await supabase
    .from('user_buildings')
    .select('id, building_id')
    .in('building_id', buildingIds);

  if (reviews && reviews.length) {
    const reviewIds = reviews.map(r => r.id);
    const reviewToBuildingMap = new Map(reviews.map(r => [r.id, r.building_id]));

    const { data: images } = await supabase
        .from('review_images')
        .select('storage_path, likes_count, created_at, review_id')
        .in('review_id', reviewIds)
        .order('likes_count', { ascending: false })
        .order('created_at', { ascending: false });

    if (images && images.length) {
        const buildingImageMap = new Map<string, string>();
        for (const img of images) {
            const buildingId = reviewToBuildingMap.get(img.review_id);
            if (buildingId && !buildingImageMap.has(buildingId)) {
                const { data: { publicUrl } } = supabase.storage.from('review_images').getPublicUrl(img.storage_path);
                buildingImageMap.set(buildingId, publicUrl);
            }
        }
        enrichedBuildings = enrichedBuildings.map(b => {
            if (buildingImageMap.has(b.id)) {
                return { ...b, main_image_url: buildingImageMap.get(b.id) || b.main_image_url };
            }
            return b;
        });
    }
  }

  // 2. Social Enrichment (Facepile)
  if (userId) {
    const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    const contactIds = follows?.map(f => f.following_id) || [];

    if (contactIds.length > 0) {
        const { data: contactRatings } = await supabase
            .from('user_buildings')
            .select(`
                building_id,
                user:profiles!inner(id, first_name, last_name, avatar_url)
            `)
            .in('building_id', buildingIds)
            .in('user_id', contactIds)
            .not('rating', 'is', null);

        if (contactRatings && contactRatings.length > 0) {
            const ratingsMap = new Map<string, ContactRater[]>();

            contactRatings.forEach((item: any) => {
                const user = Array.isArray(item.user) ? item.user[0] : item.user;
                const rater: ContactRater = {
                    id: user.id,
                    avatar_url: user.avatar_url,
                    first_name: user.first_name,
                    last_name: user.last_name
                };

                if (!ratingsMap.has(item.building_id)) {
                    ratingsMap.set(item.building_id, []);
                }
                ratingsMap.get(item.building_id)?.push(rater);
            });

            enrichedBuildings = enrichedBuildings.map(b => ({
                ...b,
                contact_raters: ratingsMap.get(b.id) || []
            }));
        }
    }
  }

  return enrichedBuildings;
}

export function useBuildingSearch() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [filterVisited, setFilterVisited] = useState(false);
  const [filterBucketList, setFilterBucketList] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  // Default to London
  const [userLocation, setUserLocation] = useState({
    lat: 51.5074,
    lng: -0.1278
  });

  const { location: gpsLocation, requestLocation: requestLocationInternal } = useUserLocation();

  useEffect(() => {
    // Attempt to get user location on mount (silently)
    requestLocationInternal({ silent: true });
  }, []);

  useEffect(() => {
    if (gpsLocation) {
      setUserLocation(gpsLocation);
    }
  }, [gpsLocation]);

  const requestLocation = async () => {
    const loc = await requestLocationInternal();
    if (loc) {
      setUserLocation(loc);
      return loc;
    }
    return null;
  };

  // Search query
  const { data: buildings, isLoading, isFetching } = useQuery({
    queryKey: ["search-buildings", debouncedQuery, filterVisited, filterBucketList, userLocation, user?.id],
    queryFn: async () => {
        // Local filtering mode (My Buildings)
        if (filterVisited || filterBucketList) {
            if (!user) return [];

            const statuses: string[] = [];
            if (filterVisited) statuses.push('visited');
            if (filterBucketList) statuses.push('pending');

            // 1. Fetch user buildings IDs
            const { data: userBuildings, error: ubError } = await supabase
                .from('user_buildings')
                .select('building_id')
                .eq('user_id', user.id)
                .in('status', statuses);

            if (ubError) throw ubError;
            if (!userBuildings || userBuildings.length === 0) return [];

            const buildingIds = userBuildings.map(ub => ub.building_id);

            // 2. Fetch building details
            let query = supabase
                .from('buildings')
                .select('*, architects:building_architects(architect:architects(name, id))')
                .in('id', buildingIds);

            if (debouncedQuery) {
                query = query.ilike('name', `%${debouncedQuery}%`);
            }

            const { data: buildingsData, error: bError } = await query;
            if (bError) throw bError;

            // 3. Map to DiscoveryBuilding and calculate distance
            const mappedBuildings = (buildingsData || []).map((b: any) => {
                const distance = getDistanceFromLatLonInM(
                    userLocation.lat,
                    userLocation.lng,
                    b.location_lat,
                    b.location_lng
                );

                return {
                    id: b.id,
                    name: b.name,
                    main_image_url: b.main_image_url,
                    architects: b.architects?.map((a: any) => a.architect).filter(Boolean) || [],
                    year_completed: b.year_completed,
                    city: b.city,
                    country: b.country,
                    location_lat: b.location_lat,
                    location_lng: b.location_lng,
                    distance: distance,
                    // social_context: could fetch social info if needed, but skipping for now
                } as DiscoveryBuilding;
            }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

            return await enrichBuildings(mappedBuildings, user?.id);
        }

        // Global search mode (RPC)
        const radius = 20000000; // Large radius for general search
        // Pass undefined for filters and sort_by as we removed them
        const rpcResults = await searchBuildingsRpc({
            query_text: debouncedQuery || null,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: radius,
            filters: undefined,
            sort_by: undefined
        });

        return await enrichBuildings(rpcResults, user?.id);
    },
    staleTime: 1000 * 60, // 1 min
    placeholderData: keepPreviousData,
  });

  const updateLocation = (center: { lat: number, lng: number }) => {
      setUserLocation(center);
  };

  return {
      searchQuery,
      setSearchQuery,
      filterVisited,
      setFilterVisited,
      filterBucketList,
      setFilterBucketList,
      viewMode,
      setViewMode,
      userLocation,
      updateLocation,
      requestLocation,
      gpsLocation,
      buildings: buildings || [],
      isLoading,
      isFetching,
  };
}
