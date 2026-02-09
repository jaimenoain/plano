import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding, DiscoveryBuildingMapPin, ContactRater, ContactInteraction, MapItem, ClusterPoint, BuildingPoint } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { getBuildingsByIds } from "@/utils/supabaseFallback";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getBuildingImageUrl } from "@/utils/image";
import { parseLocation } from "@/utils/location";
import { filterLocalBuildings } from "../utils/searchFilters";
import { UserSearchResult } from "./useUserSearch";
import { useUserBuildingStatuses } from "@/hooks/useUserBuildingStatuses";
import { Bounds } from "@/utils/map";

// Type definitions for better type safety
interface BuildingDataItem {
  id: string;
  status: string | null;
  main_image_url: string | null;
}

interface ContactInteractionData {
  building_id: string;
  status: string | null;
  rating: number | null;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | {
    id: string;
    username: string;
    avatar_url: string | null;
  }[];
}

// Constants
const EARTH_RADIUS_METERS = 6371000; // Earth's radius in meters
const VALID_LOCATION_THRESHOLD = 0.0001; // Threshold for filtering invalid (0,0) coordinates
const DEFAULT_SEARCH_RADIUS = 20000000; // 20,000 km in meters

// Helper to calculate Haversine distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = EARTH_RADIUS_METERS * c;
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Validate if coordinates are valid and not at (0,0)
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= -90 && 
    lat <= 90 && 
    lng >= -180 && 
    lng <= 180 &&
    !(Math.abs(lat) < VALID_LOCATION_THRESHOLD && Math.abs(lng) < VALID_LOCATION_THRESHOLD)
  );
}

// Helper function to map visitors to interactions
function mapVisitorsToInteractions(visitors: ContactRater[]): ContactInteraction[] {
  return visitors.map(v => ({
    user: v,
    status: 'visited' as const,
    rating: null
  }));
}

// Helper function to normalize user data from query results
function normalizeUserData(user: any): ContactRater {
  const userData = Array.isArray(user) ? user[0] : user;
  return {
    id: userData.id,
    avatar_url: userData.avatar_url,
    username: userData.username,
    first_name: null,
    last_name: null
  };
}

async function enrichBuildings(
  buildings: DiscoveryBuilding[], 
  userId?: string, 
  specificContactIds?: string[]
): Promise<DiscoveryBuilding[]> {
  if (!buildings.length) return [];

  let enrichedBuildings = [...buildings];
  const buildingIds = buildings.map(b => b.id);

  // 1. Fetch Missing Data (Status & Main Image)
  const missingStatusIds = enrichedBuildings.filter(b => b.status === undefined).map(b => b.id);
  const missingImageIds = enrichedBuildings.filter(b => b.main_image_url === undefined).map(b => b.id);
  const idsToFetch = Array.from(new Set([...missingStatusIds, ...missingImageIds]));

  if (idsToFetch.length > 0) {
    try {
      const { data: fetchedData, error } = await supabase
        .from('buildings')
        .select('id, status, main_image_url')
        .in('id', idsToFetch);

      if (error) {
        console.error('Error fetching building data:', error);
      } else if (fetchedData) {
        const statusMap = new Map<string, string | null>();
        const imageMap = new Map<string, string | null>();

        fetchedData.forEach((item: BuildingDataItem) => {
          statusMap.set(item.id, item.status);
          imageMap.set(item.id, item.main_image_url);
        });

        enrichedBuildings = enrichedBuildings.map(b => {
          const updates: Partial<DiscoveryBuilding> = {};
          if (b.status === undefined) {
            updates.status = statusMap.get(b.id) as any || null;
          }
          if (b.main_image_url === undefined) {
            updates.main_image_url = imageMap.get(b.id) || null;
          }

          return Object.keys(updates).length > 0 ? { ...b, ...updates } : b;
        });
      }
    } catch (error) {
      console.error('Exception fetching building data:', error);
    }
  }

  // 2. Image URL Transformation
  enrichedBuildings = enrichedBuildings.map(b => ({
    ...b,
    main_image_url: getBuildingImageUrl(b.main_image_url) || null
  }));

  // 3. Social Enrichment (Facepile)
  if (userId) {
    try {
      const { data: follows, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      if (followsError) {
        console.error('Error fetching follows:', followsError);
      }

      const followedIds = Array.isArray(follows) ? follows.map(f => f.following_id) : [];
      const contactIds = Array.from(new Set([...followedIds, ...(specificContactIds || [])]));

      if (contactIds.length > 0) {
        const { data: contactInteractions, error: interactionsError } = await supabase
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

        if (interactionsError) {
          console.error('Error fetching contact interactions:', interactionsError);
        } else if (contactInteractions && contactInteractions.length > 0) {
          const ratingsMap = new Map<string, ContactRater[]>();
          const visitorsMap = new Map<string, ContactRater[]>();
          const interactionsMap = new Map<string, ContactInteraction[]>();

          contactInteractions.forEach((item: ContactInteractionData) => {
            const person = normalizeUserData(item.user);

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
        // No contactIds to fetch, map RPC visitors
        enrichedBuildings = enrichedBuildings.map(b => {
          const rpcVisitors = b.visitors || b.contact_visitors || [];
          return {
            ...b,
            contact_visitors: rpcVisitors,
            contact_interactions: mapVisitorsToInteractions(rpcVisitors)
          };
        });
      }
    } catch (error) {
      console.error('Exception during social enrichment:', error);
      // Fall back to RPC visitors only
      enrichedBuildings = enrichedBuildings.map(b => {
        const rpcVisitors = b.visitors || b.contact_visitors || [];
        return {
          ...b,
          contact_visitors: rpcVisitors,
          contact_interactions: mapVisitorsToInteractions(rpcVisitors)
        };
      });
    }
  } else {
    // No userId, map RPC visitors
    enrichedBuildings = enrichedBuildings.map(b => {
      const rpcVisitors = b.visitors || b.contact_visitors || [];
      return {
        ...b,
        contact_visitors: rpcVisitors,
        contact_interactions: mapVisitorsToInteractions(rpcVisitors)
      };
    });
  }

  return enrichedBuildings;
}

// URL Param Parsers
const getArrayParam = (param: string | null): string[] => param ? param.split(",") : [];
const getBoolParam = (param: string | null, defaultVal: boolean): boolean => 
  param !== null ? param === "true" : defaultVal;
const getNumParam = (param: string | null, defaultVal: number): number => 
  param ? parseInt(param, 10) : defaultVal;
const getJsonParam = <T>(param: string | null, defaultVal: T): T => {
  if (!param) return defaultVal;
  try {
    return JSON.parse(param);
  } catch (e) {
    console.error("Failed to parse JSON param:", param, e);
    return defaultVal;
  }
};

export function useBuildingSearch({ searchTriggerVersion, bounds, zoom = 12 }: { searchTriggerVersion?: number, bounds?: Bounds | null, zoom?: number } = {}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const debouncedBounds = useDebounce(bounds, 300);

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

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, first_name, last_name')
          .in('username', usernames);

        if (error) {
          console.error('Error fetching rated_by profiles:', error);
          return [];
        }

        return data?.map(p => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.username,
          bio: null
        } as UserSearchResult)) || [];
      } catch (error) {
        console.error('Exception fetching rated_by profiles:', error);
        return [];
      }
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
    if (!hideHidden) params.set("hideHidden", "false");
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

  const requestLocation = useCallback(async () => {
    const loc = await requestLocationInternal();
    if (loc) {
      setUserLocation(loc);
      return loc;
    }
    return null;
  }, [requestLocationInternal]);

  // Fetch available collections for the user
  const { data: availableCollections } = useQuery({
    queryKey: ['user-collections', user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const { data, error } = await supabase
          .from('collections')
          .select('id, name')
          .eq('owner_id', user.id)
          .order('name');

        if (error) {
          console.error('Error fetching collections:', error);
          return [];
        }

        return data || [];
      } catch (error) {
        console.error('Exception fetching collections:', error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Hydration State
  const [idsToHydrate, setIdsToHydrate] = useState<string[]>([]);

  // Map Data Query (Lightweight Pins)
  const { data: mapPins, isLoading: isMapLoading, isFetching: isMapFetching } = useQuery({
    queryKey: [
      "map-pins",
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
      userLocation, // Keep tracking location for distance calculation in local mode? Yes.
      debouncedBounds, // Use debounced bounds
      zoom, // Use zoom level
      user?.id,
      searchTriggerVersion
    ],
    queryFn: async () => {
      try {
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
            try {
              let query = supabase
                .from('user_buildings')
                .select('building_id')
                .in('user_id', Array.from(targetUserIds));

              // Apply Status Filters
              const activeStatuses: string[] = [];
              if (statusFilters.includes('visited')) activeStatuses.push('visited');
              if (statusFilters.includes('saved')) activeStatuses.push('pending');

              if (activeStatuses.length > 0) {
                query = query.in('status', activeStatuses);
              } else {
                query = query.or('status.eq.visited,status.eq.pending,rating.not.is.null');
              }

              const effectiveMinRating = Math.max(personalMinRating, contactMinRating);
              if (effectiveMinRating > 0) {
                query = query.gte('rating', effectiveMinRating);
              }

              const { data: userBuildings, error: ubError } = await query;
              if (ubError) {
                console.error('Error fetching user buildings:', ubError);
              } else {
                userBuildings?.forEach(ub => buildingIds.add(ub.building_id));
              }
            } catch (error) {
              console.error('Exception fetching user buildings:', error);
            }
          }

          // 2. Generic "Filter Contacts" (Any Followed Contact)
          if (filterContacts && user) {
            try {
              const { data: follows, error: followsError } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', user.id);

              if (followsError) {
                console.error('Error fetching follows for filter:', followsError);
              } else {
                const contactIds = Array.isArray(follows) ? follows.map(f => f.following_id) : [];

                if (contactIds.length > 0) {
                  let query = supabase
                    .from('user_buildings')
                    .select('building_id')
                    .in('user_id', contactIds)
                    .in('status', ['visited', 'pending']);

                  if (contactMinRating > 0) {
                    query = query.gte('rating', contactMinRating);
                  }

                  const { data: contactBuildings, error: cbError } = await query;
                  if (cbError) {
                    console.error('Error fetching contact buildings:', cbError);
                  } else {
                    contactBuildings?.forEach(cb => buildingIds.add(cb.building_id));
                  }
                }
              }
            } catch (error) {
              console.error('Exception fetching contact buildings:', error);
            }
          }

          // 3. Collections
          if (hasCollections) {
            try {
              const { data: collectionItems, error: cError } = await supabase
                .from('collection_items')
                .select('building_id')
                .in('collection_id', selectedCollections.map(c => c.id));

              if (cError) {
                console.error('Error fetching collection items:', cError);
              } else {
                collectionItems?.forEach(item => buildingIds.add(item.building_id));
              }
            } catch (error) {
              console.error('Exception fetching collection items:', error);
            }
          }

          if (buildingIds.size === 0) return [];

          // 4. Fetch lightweight building data + Metadata for filtering
          try {
            // Need columns for filtering: functional_category_id, typologies, attributes, architects
            let query = supabase
              .from('buildings')
              .select(`
                id,
                location,
                status,
                name,
                main_image_url,
                slug,
                architects:building_architects(architect_id),
                functional_category_id,
                typologies:building_functional_typologies(typology_id),
                attributes:building_attributes(attribute_id)
              `)
              .in('id', Array.from(buildingIds));

            if (cleanQuery) {
              query = query.ilike('name', `%${cleanQuery}%`);
            }

            const { data: buildingsData, error: bError } = await query;
            if (bError) {
              console.error('Error fetching buildings data:', bError);
              return [];
            }

            // 5. Apply Characteristics / Architect Filters in Memory
            const preFilteredData = (buildingsData || []).map((b: any) => ({
                ...b,
                architects: b.architects?.map((a: any) => ({ id: a.architect_id })) || []
            }));

            const filteredData = filterLocalBuildings(preFilteredData, {
              categoryId: (selectedCategory && selectedCategory.trim() !== "") ? selectedCategory : null,
              typologyIds: selectedTypologies,
              attributeIds: selectedAttributes,
              selectedArchitects: selectedArchitects.map(a => a.id)
            });

            // 6. Map to MapItem (BuildingPoint)
            return filteredData
              .map((b: any) => {
                const coords = parseLocation(b.location);
                const location_lat = coords?.lat || 0;
                const location_lng = coords?.lng || 0;

                return {
                  id: b.id,
                  lat: location_lat,
                  lng: location_lng,
                  count: 1,
                  is_cluster: false,
                  name: b.name,
                  slug: b.slug,
                  image_url: b.main_image_url,
                  architect_names: []
                } as BuildingPoint;
              })
              .filter(b => isValidCoordinate(b.lat, b.lng));
          } catch (error) {
            console.error('Exception in local search mode:', error);
            return [];
          }
        }

        // Global search mode (RPC)
        try {
          // Calculate buffered bounds
          let min_lat, max_lat, min_lng, max_lng;

          if (debouncedBounds) {
            const latBuffer = (debouncedBounds.north - debouncedBounds.south) * 0.25; // 25% buffer
            const lngBuffer = (debouncedBounds.east - debouncedBounds.west) * 0.25;

            min_lat = debouncedBounds.south - latBuffer;
            max_lat = debouncedBounds.north + latBuffer;
            min_lng = debouncedBounds.west - lngBuffer;
            max_lng = debouncedBounds.east + lngBuffer;
          }

          const { data, error } = await supabase.rpc('get_map_clusters', {
            min_lat,
            max_lat,
            min_lng,
            max_lng,
            zoom: Math.round(zoom),
            filters: {
              query: cleanQuery,
              architect_ids: selectedArchitects.length > 0 ? selectedArchitects.map(a => a.id) : undefined,
              category_id: (selectedCategory && selectedCategory.trim() !== "") ? selectedCategory : undefined,
              typology_ids: selectedTypologies.length > 0 ? selectedTypologies : undefined,
              attribute_ids: selectedAttributes.length > 0 ? selectedAttributes : undefined
            }
          });

          if (error) {
            console.error('Error fetching map clusters:', error);
            return [];
          }

          // Sanitize RPC results to remove invalid locations
          return (data as MapItem[]).filter(b =>
            isValidCoordinate(b.lat, b.lng)
          );
        } catch (error) {
          console.error('Exception in global search mode:', error);
          return [];
        }
      } catch (error) {
        console.error('Exception in search query:', error);
        return [];
      }
    },
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  // Apply exclusion logic (client-side) for map pins if needed?
  // `applyClientFilters` uses `hideSaved`, `hideVisited`, `userStatuses`.
  // `userStatuses` comes from hook.
  // We can filter `mapPins` using `userStatuses`.

  const filteredMapPins = useMemo(() => {
    if (!mapPins) return [];

    // Simple client-side filter implementation for map pins
    // Reuse applyClientFilters logic but applied to lightweight objects?
    // applyClientFilters expects DiscoveryBuilding with status property (construction status).
    // But it mainly uses `userStatuses` map.

    // We can replicate logic here:
    return mapPins.filter(b => {
        // userStatuses is a Record<string, string>, not a Map

        // For clusters, we can't easily filter by status unless the cluster has status info (it usually doesn't).
        if (b.is_cluster) return true;

        const userStatus = (userStatuses as any)[b.id];

        // Hide Hidden
        if (hideHidden && userStatus === 'hidden') return false; // Usually hidden means 'hidden' status

        // Hide Visited
        if (hideVisited && userStatus === 'visited') return false;

        // Hide Saved
        if (hideSaved && userStatus === 'pending') return false;

        return true;
    });
  }, [mapPins, hideSaved, hideVisited, hideHidden, userStatuses]);

  // List Data Query (Rich Items)
  const { data: richListItems, isLoading: isListLoading, isFetching: isListFetching } = useQuery({
      queryKey: ['rich-list-items', idsToHydrate, user?.id],
      queryFn: async () => {
          if (idsToHydrate.length === 0) return [];

          try {
              const buildings = await getBuildingsByIds(idsToHydrate);

              // Map to DiscoveryBuilding structure (add distance, etc)
              const mappedBuildings = buildings.map((b: any) => {
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
                  } as DiscoveryBuilding;
              });

              // Apply client filters again? No, the IDs were selected from visible map pins which were already filtered.
              // BUT 'hideWithoutImages' might not have been applied on map pins.
              // So rich list items might include items without images if we selected them from map.
              // But list should hydrate them. If we want to hide them from list, we should filter them here or in SearchPage.
              // SearchPage slices visible IDs. If we filter here, we might return fewer than expected items.

              const enriched = await enrichBuildings(
                mappedBuildings,
                user?.id,
                selectedContacts.map(c => c.id)
              );

              return enriched;
          } catch (error) {
              console.error("Error fetching rich list items", error);
              return [];
          }
      },
      enabled: idsToHydrate.length > 0,
      staleTime: 1000 * 60 * 5, // Cache rich items longer
      placeholderData: keepPreviousData
  });

  const updateLocation = useCallback((center: { lat: number, lng: number }) => {
    setUserLocation(center);
  }, []);

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
    mapPins: filteredMapPins || [],
    richListItems: richListItems || [],
    setIdsToHydrate,
    debouncedQuery,
    isLoading: isMapLoading, // Main loading state is map
    isFetching: isMapFetching,
    isListLoading,
    isListFetching,
    isPlaceholderData: false, // Not using placeholder data for map pins the same way
    // Pagination
    page,
    setPage,
  };
}
