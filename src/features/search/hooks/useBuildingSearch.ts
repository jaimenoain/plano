import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding } from "../components/types";
import { useUserLocation } from "@/hooks/useUserLocation";
import { searchBuildingsRpc, getDiscoveryFiltersRpc } from "@/utils/supabaseFallback";

export function useBuildingSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'relevance'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

  // Default to London
  const [userLocation, setUserLocation] = useState({
    lat: 51.5074,
    lng: -0.1278
  });

  const { location: gpsLocation, requestLocation } = useUserLocation();

  useEffect(() => {
    if (gpsLocation) {
      setUserLocation(gpsLocation);
    }
  }, [gpsLocation]);

  // Fetch filters options
  const { data: filterOptions } = useQuery({
    queryKey: ["discovery-filters"],
    queryFn: async () => {
      return await getDiscoveryFiltersRpc();
    }
  });

  // Search query
  const { data: buildings, isLoading } = useQuery({
    queryKey: ["search-buildings", debouncedQuery, selectedCity, selectedStyles, sortBy, userLocation],
    queryFn: async () => {
        const filters = {
            cities: selectedCity === "all" ? [] : [selectedCity],
            styles: selectedStyles
        };

        return await searchBuildingsRpc({
            query_text: debouncedQuery || null,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: 500000, // 500km radius
            filters: filters,
            sort_by: sortBy
        });
    },
    staleTime: 1000 * 60, // 1 min
    placeholderData: keepPreviousData,
  });

  // Auto-switch to relevance on search/filter interaction
  useEffect(() => {
    if (debouncedQuery || selectedCity !== "all" || selectedStyles.length > 0) {
        setSortBy('relevance');
    }
  }, [debouncedQuery, selectedCity, selectedStyles]);

  const updateLocation = (center: { lat: number, lng: number }) => {
      // Only update if significantly different to avoid loops/jitters?
      // But react state update with same value is cheap.
      setUserLocation(center);

      // If panning map without active search criteria, switch to distance
      if (!debouncedQuery && selectedCity === "all" && selectedStyles.length === 0) {
          setSortBy('distance');
      }
  };

  return {
      searchQuery,
      setSearchQuery,
      selectedCity,
      setSelectedCity,
      selectedStyles,
      setSelectedStyles,
      sortBy,
      setSortBy,
      viewMode,
      setViewMode,
      userLocation,
      updateLocation,
      requestLocation,
      buildings: buildings || [],
      isLoading,
      availableCities: filterOptions?.cities || [],
      availableStyles: filterOptions?.styles || [],
  };
}
