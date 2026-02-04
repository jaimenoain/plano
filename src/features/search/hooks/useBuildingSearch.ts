import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding, ContactRater, ContactInteraction } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { searchBuildingsRpc } from "@/utils/supabaseFallback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingImageUrl } from "@/utils/image";
import { parseLocation } from "@/utils/location";
import { filterLocalBuildings, applyClientFilters } from "../utils/searchFilters";
import { UserSearchResult } from "./useUserSearch";
import { useUserBuildingStatuses } from "@/hooks/useUserBuildingStatuses";

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

async function enrichBuildings(buildings: DiscoveryBuilding[], userId?: string, specificContactIds?: string[]) {
  if (!buildings.length) return [];

  let enrichedBuildings = [...buildings];
  const buildingIds = buildings.map(b => b.id);

  // 1. Fetch Missing Data (Status & Main Image)
  // RPC might not return status or main_image_url, so we fetch if missing.
  const missingStatusIds = enrichedBuildings.filter(b => b.status === undefined).map(b => b.id);
  const missingImageIds = enrichedBuildings.filter(b => b.main_image_url === undefined).map(b => b.id);

  const idsToFetch = Array.from(new Set([...missingStatusIds, ...missingImageIds]));

  if (idsToFetch.length > 0) {
      const { data: fetchedData } = await supabase
          .from('buildings')
          .select('id, status, main_image_url')
          .in('id', idsToFetch);

      const statusMap = new Map<string, string | null>();
      const imageMap = new Map<string, string | null>();

      fetchedData?.forEach((item: any) => {
          statusMap.set(item.id, item.status);
          imageMap.set(item.id, item.main_image_url);
      });

      enrichedBuildings = enrichedBuildings.map(b => {
          const updates: any = {};
          if (b.status === undefined) {
              updates.status = statusMap.get(b.id) as any || null;
          }
          if (b.main_image_url === undefined) {
              updates.main_image_url = imageMap.get(b.id) || null;
          }

          if (Object.keys(updates).length > 0) {
              return { ...b, ...updates };
          }
          return b;
      });
  }

  // 2. Image URL Transformation (using helper)
  // RPC returns the path in main_image_url. We need to convert it to a full URL.
  enrichedBuildings = enrichedBuildings.map(b => ({
      ...b,
      main_image_url: getBuildingImageUrl(b.main_image_url) || null
  }));

  // 3. Social Enrichment (Facepile)
  if (userId) {
    const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

    const followedIds = follows?.map(f => f.following_id) || [];

    // Combine followed contacts with specifically selected contacts (if any)
    const contactIds = Array.from(new Set([...followedIds, ...(specificContactIds || [])]));

    if (contactIds.length > 0) {
        const { data: contactInteractions } = await supabase
            .from('user_buildings')
            .select(`
                building_id,
                status,
                rating,
                user:profiles!inner(id, username, avatar_url)
            `)
            .in('building_id', buildingIds)
            .in('user_id', contactIds)
            .or('status.eq.visited,status.eq.pending,rating.not.is.null');

        if (contactInteractions && contactInteractions.length > 0) {
            const ratingsMap = new Map<string, ContactRater[]>();
            const visitorsMap = new Map<string, ContactRater[]>();
            const interactionsMap = new Map<string, ContactInteraction[]>();

            contactInteractions.forEach((item: any) => {
                const user = Array.isArray(item.user) ? item.user[0] : item.user;
                const person: ContactRater = {
                    id: user.id,
                    avatar_url: user.avatar_url,
                    username: user.username,
                    first_name: null,
                    last_name: null
                };

                const interaction: ContactInteraction = {
                    user: person,
                    status: item.status,
                    rating: item.rating
                };

                if (!interactionsMap.has(item.building_id)) {
                    interactionsMap.set(item.building_id, []);
                }
                interactionsMap.get(item.building_id)?.push(interaction);

                // Populate Raters
                if (item.rating !== null) {
                    if (!ratingsMap.has(item.building_id)) {
                        ratingsMap.set(item.building_id, []);
                    }
                    ratingsMap.get(item.building_id)?.push(person);
                }

                // Populate Visitors
                if (item.status === 'visited') {
                    if (!visitorsMap.has(item.building_id)) {
                        visitorsMap.set(item.building_id, []);
                    }
                    visitorsMap.get(item.building_id)?.push(person);
                }
            });

            enrichedBuildings = enrichedBuildings.map(b => {
                const rpcVisitors = b.visitors || b.contact_visitors || [];
                const clientVisitors = visitorsMap.get(b.id) || [];

                // Merge and dedupe visitors (RPC + Client)
                const mergedVisitors = [...rpcVisitors, ...clientVisitors].filter((v, i, self) =>
                    i === self.findIndex((t) => (t.id === v.id))
                );

                // Merge interactions (DB + RPC Visitors)
                const dbInteractions = interactionsMap.get(b.id) || [];
                const existingUserIds = new Set(dbInteractions.map(i => i.user.id));
                const rpcInteractions = rpcVisitors
                    .filter(v => !existingUserIds.has(v.id))
                    .map(v => ({
                        user: v,
                        status: 'visited' as const,
                        rating: null
                    }));

                const mergedInteractions = [...dbInteractions, ...rpcInteractions];

                return {
                    ...b,
                    contact_raters: ratingsMap.get(b.id) || [],
                    contact_visitors: mergedVisitors,
                    contact_interactions: mergedInteractions
                };
            });
        }
    } else {
        // If no contactIds to fetch (or no user), still ensure RPC visitors are mapped to contact_visitors
        enrichedBuildings = enrichedBuildings.map(b => {
            const rpcVisitors = b.visitors || b.contact_visitors || [];
            const rpcInteractions = rpcVisitors.map(v => ({
                user: v,
                status: 'visited' as const,
                rating: null
            }));
            return {
                ...b,
                contact_visitors: rpcVisitors,
                contact_interactions: rpcInteractions
            };
        });
    }
  } else {
      // If no userId, ensure RPC visitors are mapped
      enrichedBuildings = enrichedBuildings.map(b => {
          const rpcVisitors = b.visitors || b.contact_visitors || [];
          const rpcInteractions = rpcVisitors.map(v => ({
              user: v,
              status: 'visited' as const,
              rating: null
          }));
          return {
              ...b,
              contact_visitors: rpcVisitors,
              contact_interactions: rpcInteractions
          };
      });
  }

  return enrichedBuildings;
}

// URL Param Parsers
const getArrayParam = (param: string | null) => param ? param.split(",") : [];
const getBoolParam = (param: string | null, defaultVal: boolean) => param !== null ? param === "true" : defaultVal;
const getNumParam = (param: string | null, defaultVal: number) => param ? parseInt(param) : defaultVal;
const getJsonParam = <T>(param: string | null, defaultVal: T): T => {
  if (!param) return defaultVal;
  try {
    return JSON.parse(param);
  } catch (e) {
    console.error("Failed to parse JSON param:", param, e);
    return defaultVal;
  }
};

export function useBuildingSearch({ searchTriggerVersion }: { searchTriggerVersion?: number } = {}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedQuery = useDebounce(searchQuery, 300);

  // New Filters State
  const [statusFilters, setStatusFilters] = useState<string[]>(getArrayParam(searchParams.get("status")));
  const [hideVisited, setHideVisited] = useState(getBoolParam(searchParams.get("hideVisited"), false));
  const [hideSaved, setHideSaved] = useState(getBoolParam(searchParams.get("hideSaved"), false));
  const [hideHidden, setHideHidden] = useState(getBoolParam(searchParams.get("hideHidden"), true));
  const [hideWithoutImages, setHideWithoutImages] = useState(getBoolParam(searchParams.get("hideWithoutImages"), false));

  const [filterContacts, setFilterContacts] = useState(getBoolParam(searchParams.get("filterContacts"), false));
  const [personalMinRating, setPersonalMinRating] = useState<number>(getNumParam(searchParams.get("minRating"), 0));
  const [contactMinRating, setContactMinRating] = useState<number>(getNumParam(searchParams.get("contactMinRating"), 0));

  // Pagination State
  const [page, setPage] = useState(0);

  const [selectedArchitects, setSelectedArchitects] = useState<{ id: string; name: string }[]>(
    getJsonParam(searchParams.get("architects"), [])
  );
  const [selectedCollections, setSelectedCollections] = useState<{ id: string; name: string }[]>(
    getJsonParam(searchParams.get("collections"), [])
  );
  const [viewMode, setViewMode] = useState<'list' | 'map'>((searchParams.get("view") as 'list' | 'map') || 'map');

  // New Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("category") || null);
  const [selectedTypologies, setSelectedTypologies] = useState<string[]>(getArrayParam(searchParams.get("typologies")));
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>(getArrayParam(searchParams.get("attributes")));
  const [selectedContacts, setSelectedContacts] = useState<UserSearchResult[]>([]);

  // Resolve rated_by profiles from URL
  const ratedByParam = searchParams.get("rated_by");
  const { data: ratedByProfiles, isLoading: isLoadingRatedBy } = useQuery({
      queryKey: ['rated-by-profiles', ratedByParam],
      queryFn: async () => {
          if (!ratedByParam) return [];
          const usernames = ratedByParam.split(',').map(s => s.trim()).filter(Boolean);
          if (usernames.length === 0) return [];

          const { data } = await supabase
              .from('profiles')
              .select('id, username, avatar_url, first_name, last_name')
              .in('username', usernames);

          return data?.map(p => ({
              id: p.id,
              username: p.username,
              avatar_url: p.avatar_url,
              name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.username,
              bio: null // Not needed for selection
          } as UserSearchResult)) || [];
      },
      enabled: !!ratedByParam,
      staleTime: 1000 * 60 * 60 // 1 hour
  });

  // Sync resolved profiles to state
  useEffect(() => {
      if (ratedByProfiles && ratedByProfiles.length > 0) {
          const currentUsername = user?.username;
          const otherContacts = ratedByProfiles.filter(p => p.username !== currentUsername);

          setSelectedContacts(otherContacts);
      } else if (!ratedByParam) {
          // If param removed, clear contacts
          setSelectedContacts([]);
      }
  }, [ratedByProfiles, user, ratedByParam]);

  // Default to London or URL params
  const [userLocation, setUserLocation] = useState({
    lat: parseFloat(searchParams.get("lat") || "51.5074"),
    lng: parseFloat(searchParams.get("lng") || "-0.1278")
  });

  const { location: gpsLocation, requestLocation: requestLocationInternal } = useUserLocation();
  const { statuses: userStatuses } = useUserBuildingStatuses();

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

  // Reset pagination when filters change
  useEffect(() => {
    setPage(0);
  }, [
    debouncedQuery,
    statusFilters,
    hideVisited,
    hideSaved,
    hideHidden,
    hideWithoutImages,
    filterContacts,
    personalMinRating,
    contactMinRating,
    selectedArchitects,
    selectedCollections,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    selectedContacts,
  ]);

  // Sync state to URL params
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedQuery) params.set("q", debouncedQuery);

    // Location
    params.set("lat", userLocation.lat.toString());
    params.set("lng", userLocation.lng.toString());

    // View Mode
    if (viewMode !== 'map') params.set("view", viewMode);

    // Filters
    if (statusFilters.length > 0) params.set("status", statusFilters.join(","));
    if (hideVisited) params.set("hideVisited", "true");
    if (hideSaved) params.set("hideSaved", "true");
    if (!hideHidden) params.set("hideHidden", "false"); // Default is true
    if (hideWithoutImages) params.set("hideWithoutImages", "true");

    if (filterContacts) params.set("filterContacts", "true");
    if (personalMinRating > 0) params.set("minRating", personalMinRating.toString());
    if (contactMinRating > 0) params.set("contactMinRating", contactMinRating.toString());

    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTypologies.length > 0) params.set("typologies", selectedTypologies.join(","));
    if (selectedAttributes.length > 0) params.set("attributes", selectedAttributes.join(","));

    if (selectedArchitects.length > 0) params.set("architects", JSON.stringify(selectedArchitects));
    if (selectedCollections.length > 0) params.set("collections", JSON.stringify(selectedCollections));

    // Construct rated_by param
    const ratedByUsers = new Set<string>();
    if ((statusFilters.length > 0 || personalMinRating > 0) && user?.username) {
        ratedByUsers.add(user.username);
    }
    selectedContacts.forEach(c => {
        if (c.username) ratedByUsers.add(c.username);
    });

    if (ratedByUsers.size > 0) {
        params.set("rated_by", Array.from(ratedByUsers).join(","));
    } else if (isLoadingRatedBy && ratedByParam) {
        params.set("rated_by", ratedByParam);
    }

    setSearchParams(params, { replace: true });
  }, [
    isLoadingRatedBy,
    ratedByParam,
    debouncedQuery,
    userLocation,
    viewMode,
    statusFilters,
    hideVisited,
    hideSaved,
    hideHidden,
    hideWithoutImages,
    filterContacts,
    personalMinRating,
    contactMinRating,
    selectedCategory,
    selectedTypologies,
    selectedAttributes,
    selectedArchitects,
    selectedCollections,
    selectedContacts,
    setSearchParams,
    user
  ]);

  const requestLocation = async () => {
    const loc = await requestLocationInternal();
    if (loc) {
      setUserLocation(loc);
      return loc;
    }
    return null;
  };

  // Fetch available collections for the user
  const { data: availableCollections } = useQuery({
    queryKey: ['user-collections', user?.id],
    queryFn: async () => {
        if (!user) return [];
        const { data } = await supabase
            .from('collections')
            .select('id, name')
            .eq('owner_id', user.id)
            .order('name');

        return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Search query
  const { data: rawBuildings, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: [
        "search-buildings",
        debouncedQuery,
        statusFilters,
        filterContacts,
        personalMinRating,
        contactMinRating,
        selectedArchitects,
        selectedCollections,
        selectedCategory,
        selectedTypologies,
        selectedAttributes,
        selectedContacts,
        userLocation,
        user?.id,
        page,
        searchTriggerVersion
    ],
    queryFn: async () => {
        // Local filtering mode (My Buildings or Contacts)
        const hasSpecificContacts = selectedContacts.length > 0;
        const hasCollections = selectedCollections.length > 0;
        const hasPersonalRating = personalMinRating > 0;
        const hasStatusFilters = statusFilters.length > 0;
        const ratedByMe = hasStatusFilters || hasPersonalRating;

        // Input Sanitization
        const cleanQuery = debouncedQuery.trim() || null;

        if (ratedByMe || filterContacts || hasSpecificContacts || hasCollections) {

            const buildingIds = new Set<string>();

            // Determine Target Users
            const targetUserIds = new Set<string>();
            if (hasSpecificContacts) {
                selectedContacts.forEach(c => targetUserIds.add(c.id));
            }
            if (ratedByMe && user) {
                targetUserIds.add(user.id);
            }

            // 1. Fetch from Target Users (Unified)
            if (targetUserIds.size > 0) {
                 let query = supabase
                    .from('user_buildings')
                    .select('building_id')
                    .in('user_id', Array.from(targetUserIds));

                 // Apply Status Filters
                 // If specific status filters are set, they apply to all target users.
                 const activeStatuses: string[] = [];
                 if (statusFilters.includes('visited')) activeStatuses.push('visited');
                 if (statusFilters.includes('saved')) activeStatuses.push('pending');

                 // If no status filters are set (e.g. just rated_by=peter), we imply "all interesting interactions"
                 // equivalent to what was previously used for contacts: visited + pending + rated
                 if (activeStatuses.length > 0) {
                     query = query.in('status', activeStatuses);
                 } else {
                     // Default: visited or pending or rated
                     query = query.or('status.eq.visited,status.eq.pending,rating.not.is.null');
                 }

                 // Apply Rating Filters
                 const effectiveMinRating = Math.max(personalMinRating, contactMinRating);
                 if (effectiveMinRating > 0) {
                     query = query.gte('rating', effectiveMinRating);
                 }

                 const { data: userBuildings, error: ubError } = await query;
                 if (ubError) throw ubError;

                 userBuildings?.forEach(ub => buildingIds.add(ub.building_id));
            }

            // 2. Generic "Filter Contacts" (Any Followed Contact)
            if (filterContacts && user) {
                // Fetch all follows
                const { data: follows } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', user.id);
                const contactIds = follows?.map(f => f.following_id) || [];

                if (contactIds.length > 0) {
                    let query = supabase
                        .from('user_buildings')
                        .select('building_id')
                        .in('user_id', contactIds)
                        .in('status', ['visited', 'pending']); // Default for "Any Contact"

                    if (contactMinRating > 0) {
                        query = query.gte('rating', contactMinRating);
                    }

                    const { data: contactBuildings, error: cbError } = await query;
                    if (cbError) throw cbError;

                    contactBuildings?.forEach(cb => buildingIds.add(cb.building_id));
                }
            }

            // 3. Collections (Mapas del usuario)
            if (hasCollections) {
                 const { data: collectionItems, error: cError } = await supabase
                     .from('collection_items')
                     .select('building_id')
                     .in('collection_id', selectedCollections.map(c => c.id));

                 if (cError) throw cError;

                 collectionItems?.forEach(item => buildingIds.add(item.building_id));
            }

            if (buildingIds.size === 0) return [];

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
                .in('id', Array.from(buildingIds));

            if (cleanQuery) {
                query = query.ilike('name', `%${cleanQuery}%`);
            }

            const { data: buildingsData, error: bError } = await query;
            if (bError) throw bError;

            // 4. Apply Characteristics / Architect Filters in Memory
            const filteredData = filterLocalBuildings(buildingsData || [], {
                categoryId: (selectedCategory && selectedCategory.trim() !== "") ? selectedCategory : null,
                typologyIds: selectedTypologies,
                attributeIds: selectedAttributes,
                selectedArchitects: selectedArchitects.map(a => a.id)
            });

            // 5. Map to DiscoveryBuilding and calculate distance
            const mappedBuildings = filteredData.map((b: any) => {
                const coords = parseLocation(b.location);
                const location_lat = coords?.lat || 0;
                const location_lng = coords?.lng || 0;

                const distance = getDistanceFromLatLonInM(
                    userLocation.lat,
                    userLocation.lng,
                    location_lat,
                    location_lng
                );

                return {
                    id: b.id,
                    name: b.name,
                    main_image_url: b.main_image_url,
                    architects: b.architects?.map((a: any) => a.architect).filter(Boolean) || [],
                    year_completed: b.year_completed,
                    city: b.city,
                    country: b.country,
                    location_lat: location_lat,
                    location_lng: location_lng,
                    distance: distance,
                    status: b.status,
                    // Pass through metadata if needed downstream
                } as DiscoveryBuilding;
            })
            .filter(b => !(b.location_lat === 0 && b.location_lng === 0))
            .sort((a, b) => (a.distance || 0) - (b.distance || 0));

            return await enrichBuildings(mappedBuildings, user?.id, selectedContacts.map(c => c.id));
        }

        // Global search mode (RPC)
        const radius = 20000000;
        const rpcResults = await searchBuildingsRpc({
            query_text: cleanQuery,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: radius,
            filters: {
                architects: selectedArchitects.length > 0 ? selectedArchitects.map(a => a.id) : undefined,
                category_id: (selectedCategory && selectedCategory.trim() !== "") ? selectedCategory : undefined,
                typology_ids: selectedTypologies.length > 0 ? selectedTypologies : undefined,
                attribute_ids: selectedAttributes.length > 0 ? selectedAttributes : undefined
            },
            sort_by: undefined,
            p_limit: 500
        });

        // Sanitize RPC results to remove (0,0) locations
        const sanitizedResults = rpcResults.filter(b => !(b.location_lat === 0 && b.location_lng === 0));

        return await enrichBuildings(sanitizedResults, user?.id, selectedContacts.map(c => c.id));
    },
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  // Apply exclusion logic and other client-side filters
  const buildings = useMemo(() => {
    if (!rawBuildings) return [];

    return applyClientFilters(rawBuildings, {
      hideSaved,
      hideVisited,
      hideHidden,
      hideWithoutImages,
      userStatuses
    });
  }, [rawBuildings, hideSaved, hideVisited, hideHidden, hideWithoutImages, userStatuses]);

  const updateLocation = (center: { lat: number, lng: number }) => {
      setUserLocation(center);
  };

  return {
      searchQuery,
      setSearchQuery,
      // New State
      statusFilters,
      setStatusFilters,
      hideVisited,
      setHideVisited,
      hideSaved,
      setHideSaved,
      hideHidden,
      setHideHidden,
      hideWithoutImages,
      setHideWithoutImages,
      // ...
      filterContacts,
      setFilterContacts,
      personalMinRating,
      setPersonalMinRating,
      contactMinRating,
      setContactMinRating,
      selectedArchitects,
      setSelectedArchitects,
      selectedCollections,
      setSelectedCollections,
      availableCollections,
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
      debouncedQuery,
      isLoading,
      isFetching,
      isPlaceholderData,
      // Pagination
      page,
      setPage,
  };
}
