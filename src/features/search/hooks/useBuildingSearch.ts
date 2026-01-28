import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding, ContactRater } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingImageUrl } from "@/utils/image";
import { filterLocalBuildings } from "../utils/searchFilters";
import { UserSearchResult } from "./useUserSearch";

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
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [filterVisited, setFilterVisited] = useState(false);
  const [filterBucketList, setFilterBucketList] = useState(false);
  const [filterContacts, setFilterContacts] = useState(false);
  const [personalMinRating, setPersonalMinRating] = useState<number>(0);
  const [contactMinRating, setContactMinRating] = useState<number>(0);

  const [selectedArchitects, setSelectedArchitects] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  // New Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTypologies, setSelectedTypologies] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<UserSearchResult[]>([]);

  // Default to London or URL params
  const [userLocation, setUserLocation] = useState({
    lat: parseFloat(searchParams.get("lat") || "51.5074"),
    lng: parseFloat(searchParams.get("lng") || "-0.1278")
  });

  const { location: gpsLocation, requestLocation: requestLocationInternal } = useUserLocation();

  useEffect(() => {
    // Only attempt to get GPS location if no location params provided in URL
    if (!searchParams.get("lat") || !searchParams.get("lng")) {
      requestLocationInternal({ silent: true });
    }
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
    queryKey: [
        "search-buildings",
        debouncedQuery,
        filterVisited,
        filterBucketList,
        filterContacts,
        personalMinRating,
        contactMinRating,
        selectedArchitects,
        selectedCategory,
        selectedTypologies,
        selectedAttributes,
        selectedContacts,
        userLocation,
        user?.id
    ],
    queryFn: async () => {
        // Local filtering mode (My Buildings or Contacts)
        const hasSpecificContacts = selectedContacts.length > 0;
        if (filterVisited || filterBucketList || filterContacts || hasSpecificContacts) {
            if (!user) return [];

            let buildingIds: string[] = [];

            // 1. Contact Buildings (Any or Specific)
            if (filterContacts || hasSpecificContacts) {
                let contactIds: string[] = [];

                if (hasSpecificContacts) {
                    contactIds = selectedContacts.map(c => c.id);
                } else {
                    // Fetch all follows
                    const { data: follows } = await supabase
                        .from('follows')
                        .select('following_id')
                        .eq('follower_id', user.id);
                    contactIds = follows?.map(f => f.following_id) || [];
                }

                // For contacts, we show all visited/pending buildings
                const contactStatuses = ['visited', 'pending'];

                if (contactIds.length > 0) {
                    let query = supabase
                        .from('user_buildings')
                        .select('building_id')
                        .in('user_id', contactIds)
                        .in('status', contactStatuses);

                    if (contactMinRating > 0) {
                        query = query.gte('rating', contactMinRating);
                    }

                    const { data: contactBuildings, error: cbError } = await query;
                    if (cbError) throw cbError;

                    const ids = contactBuildings?.map(cb => cb.building_id) || [];
                    buildingIds = [...buildingIds, ...ids];
                }
            }

            // 2. Personal Buildings
            if (filterVisited || filterBucketList) {
                const personalStatuses: string[] = [];
                if (filterVisited) personalStatuses.push('visited');
                if (filterBucketList) personalStatuses.push('pending');

                let query = supabase
                    .from('user_buildings')
                    .select('building_id')
                    .eq('user_id', user.id)
                    .in('status', personalStatuses);

                if (personalMinRating > 0) {
                    query = query.gte('rating', personalMinRating);
                }

                const { data: userBuildings, error: ubError } = await query;
                if (ubError) throw ubError;

                const ids = userBuildings?.map(ub => ub.building_id) || [];
                buildingIds = [...buildingIds, ...ids];
            }

            // Deduplicate
            buildingIds = Array.from(new Set(buildingIds));

            if (buildingIds.length === 0) return [];

            // 3. Fetch building details + Metadata for filtering
            let query = supabase
                .from('buildings')
                .select(`
                    *,
                    main_image_url,
                    architects:building_architects(architect:architects(name, id)),
                    functional_category_id,
                    typologies:building_functional_typologies(typology_id),
                    attributes:building_attributes(attribute_id)
                `)
                .in('id', buildingIds);

            if (debouncedQuery) {
                query = query.ilike('name', `%${debouncedQuery}%`);
            }

            const { data: buildingsData, error: bError } = await query;
            if (bError) throw bError;

            // 4. Apply Characteristics / Architect Filters in Memory
            const filteredData = filterLocalBuildings(buildingsData || [], {
                categoryId: selectedCategory,
                typologyIds: selectedTypologies,
                attributeIds: selectedAttributes,
                selectedArchitects: selectedArchitects
            });

            // 5. Map to DiscoveryBuilding and calculate distance
            const mappedBuildings = filteredData.map((b: any) => {
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
                    // Pass through metadata if needed downstream, but DiscoveryBuilding interface might not have it
                } as DiscoveryBuilding;
            }).sort((a, b) => (a.distance || 0) - (b.distance || 0));

            return await enrichBuildings(mappedBuildings, user?.id);
        }

        // Global search mode (RPC)
        const radius = 20000000;
        const rpcResults = await searchBuildingsRpc({
            query_text: debouncedQuery || null,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: radius,
            filters: {
                architects: selectedArchitects.length > 0 ? selectedArchitects : undefined,
                category_id: selectedCategory || undefined,
                typology_ids: selectedTypologies.length > 0 ? selectedTypologies : undefined,
                attribute_ids: selectedAttributes.length > 0 ? selectedAttributes : undefined
            },
            sort_by: undefined,
            p_limit: 500
        });

        return await enrichBuildings(rpcResults, user?.id);
    },
    staleTime: 1000 * 60,
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
      personalMinRating,
      setPersonalMinRating,
      contactMinRating,
      setContactMinRating,
      selectedArchitects,
      setSelectedArchitects,
      selectedCategory,
      setSelectedCategory,
      selectedTypologies,
      setSelectedTypologies,
      selectedAttributes,
      setSelectedAttributes,
      selectedContacts,
      setSelectedContacts,
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
