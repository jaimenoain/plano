import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding, ContactRater } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingImageUrl } from "@/utils/image";

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

  let enrichedBuildings = [...buildings];
  const buildingIds = buildings.map(b => b.id);

  // 1. Image URL Transformation (using helper)
  // RPC returns the path in main_image_url. We need to convert it to a full URL.
  enrichedBuildings = enrichedBuildings.map(b => ({
      ...b,
      main_image_url: getBuildingImageUrl(b.main_image_url) || null
  }));

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
  const [filterContacts, setFilterContacts] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
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
    queryKey: ["search-buildings", debouncedQuery, filterVisited, filterBucketList, filterContacts, minRating, userLocation, user?.id],
    queryFn: async () => {
        // Local filtering mode (My Buildings or Contacts)
        if (filterVisited || filterBucketList || filterContacts) {
            if (!user) return [];

            const statuses: string[] = [];
            if (filterVisited) statuses.push('visited');
            if (filterBucketList) statuses.push('pending');

            // If contacts is checked but no status, default to both (implied "All from contacts")
            if (statuses.length === 0 && filterContacts) {
                statuses.push('visited', 'pending');
            }

            let buildingIds: string[] = [];

            if (filterContacts) {
                // 1. Fetch contacts
                const { data: follows } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id);

                const contactIds = follows?.map(f => f.following_id) || [];

                if (contactIds.length > 0) {
                    // 2. Fetch contact buildings
                    let query = supabase
                        .from('user_buildings')
                        .select('building_id')
                        .in('user_id', contactIds)
                        .in('status', statuses);

                    if (minRating > 0) {
                        query = query.gte('rating', minRating);
                    }

                    const { data: contactBuildings, error: cbError } = await query;
                    if (cbError) throw cbError;

                    // Deduplicate IDs since multiple contacts might have visited the same building
                    buildingIds = Array.from(new Set(contactBuildings?.map(cb => cb.building_id) || []));
                }
            } else {
                // 1. Fetch user buildings IDs
                let query = supabase
                    .from('user_buildings')
                    .select('building_id')
                    .eq('user_id', user.id)
                    .in('status', statuses);

                if (minRating > 0) {
                    query = query.gte('rating', minRating);
                }

                const { data: userBuildings, error: ubError } = await query;

                if (ubError) throw ubError;
                buildingIds = userBuildings?.map(ub => ub.building_id) || [];
            }

            if (buildingIds.length === 0) return [];

            // 3. Fetch building details
            // Explicitly select main_image_url (computed column)
            let query = supabase
                .from('buildings')
                .select('*, main_image_url, architects:building_architects(architect:architects(name, id))')
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
                    main_image_url: b.main_image_url, // Pass path, enriched later
                    architects: b.architects?.map((a: any) => a.architect).filter(Boolean) || [],
                    year_completed: b.year_completed,
                    city: b.city,
                    country: b.country,
                    location_lat: b.location_lat,
                    location_lng: b.location_lng,
                    distance: distance,
                } as DiscoveryBuilding;
            }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

            return await enrichBuildings(mappedBuildings, user?.id);
        }

        // Global search mode (RPC)
        const radius = 20000000; // Large radius for general search
        const rpcResults = await searchBuildingsRpc({
            query_text: debouncedQuery || null,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: radius,
            filters: undefined,
            sort_by: undefined,
            p_limit: 500
        });

        // RPC returns main_image_url as path now (from computed column)
        // enrichBuildings will transform it to URL
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
      filterContacts,
      setFilterContacts,
      minRating,
      setMinRating,
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
