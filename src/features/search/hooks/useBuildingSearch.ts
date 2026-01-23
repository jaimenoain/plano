import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { DiscoveryBuilding } from "../components/types";

export function useBuildingSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'distance' | 'relevance'>('distance');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Default to London
  const [userLocation, setUserLocation] = useState({
    lat: 51.5074,
    lng: -0.1278
  });

  // Fetch filters options
  const { data: filterOptions } = useQuery({
    queryKey: ["discovery-filters"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_discovery_filters');
      if (error) throw error;
      return data as { cities: string[], styles: string[] };
    }
  });

  // Search query
  const { data: buildings, isLoading, isFetching } = useQuery({
    queryKey: ["search-buildings", debouncedQuery, selectedCity, selectedStyles, sortBy, userLocation],
    queryFn: async () => {
        const filters = {
            city: selectedCity === "all" ? null : selectedCity,
            styles: selectedStyles
        };

        const { data, error } = await supabase.rpc('search_buildings', {
            query_text: debouncedQuery || null,
            location_coordinates: { lat: userLocation.lat, lng: userLocation.lng },
            radius_meters: 500000, // 500km radius
            filters: filters,
            sort_by: sortBy
        });

        if (error) {
            console.error("Search error:", error);
            return [];
        }
        return data as DiscoveryBuilding[];
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
      buildings: buildings || [],
      isLoading,
      isFetching,
      availableCities: filterOptions?.cities || [],
      availableStyles: filterOptions?.styles || [],
  };
}
