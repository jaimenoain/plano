// Not wired in product; candidate for removal.
import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin, Building2, Loader2, UserRound, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { supabase } from "@/integrations/supabase/client";
import { useMapContext } from "@/features/maps/providers/MapContext";
import { searchPeople } from "@/features/credits/api/people";
import { searchCompanies } from "@/features/credits/api/companies";
import { useNavigate } from "react-router";
type BuildingSearchRow = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

type BuildingResult = BuildingSearchRow;

interface OmniSearchBarProps {
  placeholder?: string;
  className?: string;
}

export function OmniSearchBar({
  placeholder = "Search places, buildings, people, companies...",
  className,
}: OmniSearchBarProps) {
  const { methods } = useMapContext();
  const navigate = useNavigate();
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
      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) return;

      try {
        setOptions({ key: apiKey, v: "weekly" });
        await importLibrary("places");
        await importLibrary("geocoding");
        setScriptLoaded(true);
      } catch {
      }
    };
    initMap();
  }, []);

  // Places Autocomplete
  const {
    ready: _ready,
    value: _placesValue,
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

  const entityEnabled = debouncedInput.length >= 2;

  // Buildings Query
  const { data: buildingsData, isFetching: isBuildingsFetching } = useQuery({
    queryKey: ["search-buildings", debouncedInput],
    queryFn: async () => {
      if (!debouncedInput || debouncedInput.length < 2) return [];
      const { data, error } = await supabase.rpc("search_buildings", {
        query_text: debouncedInput,
      });
      if (error) throw error;
      return (data as BuildingSearchRow[]).slice(0, 5);
    },
    enabled: entityEnabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: peopleData = [], isFetching: peopleFetching } = useQuery({
    queryKey: ["omni-search-people", debouncedInput],
    queryFn: async () => (await searchPeople(debouncedInput)).slice(0, 5),
    enabled: entityEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const { data: companiesData = [], isFetching: companiesFetching } = useQuery({
    queryKey: ["omni-search-companies", debouncedInput],
    queryFn: async () => (await searchCompanies(debouncedInput)).slice(0, 5),
    enabled: entityEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const entitiesLoading = isBuildingsFetching || peopleFetching || companiesFetching;

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
    } catch {
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

  const handlePersonSelect = (slug: string) => {
    setOpen(false);
    setInputValue("");
    navigate(`/person/${slug}`);
  };

  const handleCompanySelect = (slug: string) => {
    setOpen(false);
    setInputValue("");
    navigate(`/company/${slug}`);
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
  const hasPeople = peopleData.length > 0;
  const hasCompanies = companiesData.length > 0;
  const showDropdown =
    open && (hasPlaces || hasBuildings || hasPeople || hasCompanies || entitiesLoading);

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
          {entityEnabled && entitiesLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            </div>
          )}
        </div>

        {showDropdown && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95 max-h-[400px] overflow-y-auto">
            <CommandList>
              {hasPlaces && (
                <CommandGroup heading="Places">
                  {placesData.slice(0, 2).map(({ place_id, description }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handlePlaceSelect(description)}
                      className="cursor-pointer hover:bg-brand-secondary"
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                      <span>{description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {hasPlaces && (hasBuildings || hasPeople || hasCompanies) && <CommandSeparator />}

              {hasBuildings && (
                <CommandGroup heading="Buildings">
                  {buildingsData!.map((building: BuildingResult) => (
                    <CommandItem
                      key={building.id}
                      value={building.name}
                      onSelect={() => handleBuildingSelect(building)}
                      className="cursor-pointer hover:bg-brand-secondary"
                    >
                      <Building2 className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                      <div className="flex flex-col">
                        <span>{building.name}</span>
                        {building.city && (
                          <span className="text-xs text-text-secondary">
                            {building.city}
                            {building.country ? `, ${building.country}` : ""}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {(hasBuildings && (hasPeople || hasCompanies)) || (hasPeople && hasCompanies) ? (
                <CommandSeparator />
              ) : null}

              {hasPeople && (
                <CommandGroup heading="People">
                  {peopleData.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={person.name}
                      onSelect={() => handlePersonSelect(person.slug)}
                      className="cursor-pointer hover:bg-brand-secondary"
                    >
                      <UserRound className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                      <span>{person.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {hasPeople && hasCompanies ? <CommandSeparator /> : null}

              {hasCompanies && (
                <CommandGroup heading="Companies">
                  {companiesData.map((company) => (
                    <CommandItem
                      key={company.id}
                      value={company.name}
                      onSelect={() => handleCompanySelect(company.slug)}
                      className="cursor-pointer hover:bg-brand-secondary"
                    >
                      <Briefcase className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                      <span>{company.name}</span>
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
