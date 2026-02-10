import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useMapContext } from "@/features/maps/providers/MapContext";
import { Database } from "@/integrations/supabase/types";

type BuildingResult = Database["public"]["Functions"]["search_buildings"]["Returns"][number];

interface OmniSearchBarProps {
  placeholder?: string;
  className?: string;
}

export function OmniSearchBar({
  placeholder = "Search places or buildings...",
  className,
}: OmniSearchBarProps) {
  const { methods } = useMapContext();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const debouncedInput = useDebounce(inputValue, 300);

  // Load Google Maps Script
  useEffect(() => {
    const initMap = async () => {
      if (window.google?.maps?.places) {
        setScriptLoaded(true);
        return;
      }
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      try {
        setOptions({ key: apiKey, version: "weekly" });
        await importLibrary("places");
        await importLibrary("geocoding");
        setScriptLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps script", error);
      }
    };
    initMap();
  }, []);

  // Places Autocomplete
  const {
    ready,
    value: placesValue,
    setValue: setPlacesValue,
    suggestions: { status: placesStatus, data: placesData },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["(regions)"],
    },
    debounce: 300,
    initOnMount: true,
  });

  // Buildings Query
  const { data: buildingsData, isLoading: isBuildingsLoading } = useQuery({
    queryKey: ["search-buildings", debouncedInput],
    queryFn: async () => {
      if (!debouncedInput || debouncedInput.length < 2) return [];
      const { data, error } = await supabase.rpc("search_buildings", {
        query_text: debouncedInput,
      });
      if (error) throw error;
      return data;
    },
    enabled: debouncedInput.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync input value with places
  useEffect(() => {
    setPlacesValue(inputValue);
  }, [inputValue, setPlacesValue]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        commandRef.current &&
        !commandRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePlaceSelect = async (address: string) => {
    clearSuggestions();
    setOpen(false);
    setInputValue(""); // Clear input

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      methods.moveMap(lat, lng, 12);
    } catch (error) {
      console.error("Geocoding error: ", error);
    }
  };

  const handleBuildingSelect = (building: BuildingResult) => {
    setOpen(false);
    setInputValue(""); // Clear input

    // Update filter
    methods.setFilter("query", building.name);

    // Optional: Move map if location available
    if (building.location_lat && building.location_lng) {
      methods.moveMap(building.location_lat, building.location_lng, 16);
    }
  };

  if (!scriptLoaded) {
    return (
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  const hasPlaces = placesStatus === "OK" && placesData.length > 0;
  const hasBuildings = buildingsData && buildingsData.length > 0;
  const showDropdown = open && (hasPlaces || hasBuildings || isBuildingsLoading);

  return (
    <div className={cn("relative", className)} ref={commandRef}>
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="relative">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setOpen(!!e.target.value);
            }}
            onFocus={() => setOpen(!!inputValue)}
            placeholder={placeholder}
            className="w-full pr-10"
            autoComplete="off"
          />
          {isBuildingsLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-[400px] overflow-y-auto">
            <CommandList>
              {hasPlaces && (
                <CommandGroup heading="Places">
                  {placesData.slice(0, 2).map(({ place_id, description }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handlePlaceSelect(description)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {hasPlaces && hasBuildings && <CommandSeparator />}

              {hasBuildings && (
                <CommandGroup heading="Buildings">
                  {buildingsData.map((building) => (
                    <CommandItem
                      key={building.id}
                      value={building.name}
                      onSelect={() => handleBuildingSelect(building)}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{building.name}</span>
                        {building.city && (
                          <span className="text-xs text-muted-foreground">
                            {building.city}
                            {building.country ? `, ${building.country}` : ""}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
