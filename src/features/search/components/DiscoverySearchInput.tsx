/**
 * DiscoverySearchInput.tsx — Refined with A24 editorial aesthetic
 *
 * Visual changes. Place suggestions use `AutocompleteSuggestion.fetchAutocompleteSuggestions` (new API).
 *
 * Input height: h-12 → h-10 (consistent with other inputs in the app).
 *   Applied in three places: StaticSearchFallback, the !scriptLoaded fallback
 *   Input, and the main Input inside the Command component.
 *
 * Suggestion dropdown:
 *   shadow-lg removed — border + frosted background is sufficient.
 *   hover:bg-brand-secondary → hover:bg-surface-muted/50 (monochromatic
 *   content surface — no neon lime on suggestion hover).
 *   "Locations" CommandGroup heading removed — obvious from context,
 *   and the heading rendered a visible label that added visual noise.
 */
import { useState, useEffect, useRef } from "react";
import { useAutocompleteSuggestions } from "@/hooks/useAutocompleteSuggestions";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";
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
import { MapPin, Building2, UserRound, Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bounds } from "@/utils/map";
import { ClientOnly } from "@/components/common/ClientOnly";
import { supabase } from "@/integrations/supabase/client";
import { searchPeople } from "@/features/credits/api/people";
import { searchCompanies } from "@/features/credits/api/companies";

export interface Suggestion {
  place_id: string;
  description: string;
}

type BuildingSearchRow = {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
};

interface DiscoverySearchInputProps {
  value: string;
  onSearchChange: (value: string) => void;
  onLocationSelect: (location: { lat: number; lng: number }, bounds?: Bounds) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onTopLocationChange?: (location: { description: string; place_id: string } | null) => void;
  disableDropdown?: boolean;
  onSuggestionsChange?: (suggestions: Suggestion[]) => void;
  onPlaceDetails?: (details: google.maps.GeocoderResult) => void | Promise<void>;
  /** When true (and dropdown enabled), show buildings, people, and companies under Places. */
  showMixedEntitySuggestions?: boolean;
  onBuildingPick?: (building: BuildingSearchRow) => void;
  onPersonPick?: (person: { slug: string }) => void;
  onCompanyPick?: (company: { slug: string }) => void;
}

/** Non-interactive shell for SSR and pre-hydration */
function StaticSearchFallback({
  value,
  placeholder = "Search...",
  className,
}: Pick<DiscoverySearchInputProps, "value" | "placeholder" | "className">) {
  return (
    <Input
      readOnly
      aria-readonly="true"
      tabIndex={-1}
      value={value}
      placeholder={placeholder}
      className={cn("h-10", className)}
    />
  );
}

function DiscoverySearchInputInner({
  value,
  onSearchChange,
  onLocationSelect,
  placeholder = "Search...",
  className,
  onKeyDown,
  onTopLocationChange,
  disableDropdown = false,
  onSuggestionsChange,
  onPlaceDetails,
  showMixedEntitySuggestions = false,
  onBuildingPick,
  onPersonPick,
  onCompanyPick,
}: DiscoverySearchInputProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const entitySearchEnabled =
    showMixedEntitySuggestions && !disableDropdown && open && value.trim().length >= 2;

  const { data: buildingsData = [], isFetching: buildingsFetching } = useQuery({
    queryKey: ["discovery-search-buildings", value.trim()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_buildings", {
        query_text: value.trim(),
      });
      if (error) throw error;
      return (data as BuildingSearchRow[]).slice(0, 5);
    },
    enabled: entitySearchEnabled,
    staleTime: 60_000,
  });

  const { data: peopleData = [], isFetching: peopleFetching } = useQuery({
    queryKey: ["discovery-search-people", value.trim()],
    queryFn: async () => (await searchPeople(value.trim())).slice(0, 5),
    enabled: entitySearchEnabled,
    staleTime: 60_000,
  });

  const { data: companiesData = [], isFetching: companiesFetching } = useQuery({
    queryKey: ["discovery-search-companies", value.trim()],
    queryFn: async () => (await searchCompanies(value.trim())).slice(0, 5),
    enabled: entitySearchEnabled,
    staleTime: 60_000,
  });

  const entitiesLoading = buildingsFetching || peopleFetching || companiesFetching;

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
        await Promise.race([
          Promise.all([importLibrary("places"), importLibrary("geocoding")]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Google Maps load timeout")), 10000)
          ),
        ]);
        setScriptLoaded(true);
      } catch { /* Google Maps load failed/timed out: scriptLoaded stays false → plain <Input> fallback */ }
    };
    initMap();
  }, []);

  const {
    ready,
    value: placesValue,
    setValue: setPlacesValue,
    suggestions: { status, data },
    clearSuggestions,
    init,
  } = useAutocompleteSuggestions({
    types: ["(regions)"],
    debounce: 300,
    initOnMount: false,
  });

  useEffect(() => { if (scriptLoaded) init(); }, [scriptLoaded, init]);

  useEffect(() => {
    if (ready && value) setPlacesValue(value);
  }, [ready, value, setPlacesValue]);

  useEffect(() => {
    if (status === "OK") {
      const suggestions = data.map(d => ({ place_id: d.place_id, description: d.description }));
      onSuggestionsChange?.(suggestions);
      if (data.length > 0) {
        onTopLocationChange?.({ description: data[0].description, place_id: data[0].place_id });
      } else {
        onTopLocationChange?.(null);
      }
    } else {
      onSuggestionsChange?.([]);
      onTopLocationChange?.(null);
    }
  }, [data, status, onTopLocationChange, onSuggestionsChange]);

  useEffect(() => {
    if (value !== placesValue) setPlacesValue(value);
  }, [value, setPlacesValue, placesValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (address: string) => {
    clearSuggestions();
    setOpen(false);
    onSearchChange("");
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      let bounds: Bounds | undefined;
      const viewport = results[0].geometry.viewport;
      if (viewport && typeof viewport.getNorthEast === "function") {
        bounds = {
          north: viewport.getNorthEast().lat(),
          south: viewport.getSouthWest().lat(),
          east: viewport.getNorthEast().lng(),
          west: viewport.getSouthWest().lng(),
        };
      }
      onLocationSelect({ lat, lng }, bounds);
      await onPlaceDetails?.(results[0]);
    } catch { /* geocode failed (no result / network / API error): leave selection unchanged */ }
  };

  // Pre-hydration fallback with correct height
  if (!scriptLoaded) {
    return (
      <Input
        value={value}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className={cn("h-10", className)}
      />
    );
  }

  return (
    <div className={cn("relative", className)} ref={commandRef}>
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => {
              const val = e.target.value;
              onSearchChange(val);
              setPlacesValue(val);
              setOpen(!!val);
            }}
            onFocus={() => setOpen(!!value)}
            placeholder={placeholder}
            // h-10: reduced from h-12 — tighter, consistent with the rest of the app
            className="w-full h-10 pr-9"
            autoComplete="off"
            onKeyDown={onKeyDown}
          />
          {entitySearchEnabled && entitiesLoading ? (
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-text-secondary" aria-hidden />
            </div>
          ) : null}
        </div>

        {!disableDropdown &&
          open &&
          (status === "OK" ||
            (showMixedEntitySuggestions &&
              value.trim().length >= 2 &&
              (buildingsData.length > 0 || peopleData.length > 0 || companiesData.length > 0 || entitiesLoading))) && (
          <div
            // shadow-lg removed — border + background is sufficient
            className="absolute top-[calc(100%+4px)] left-0 w-full z-50 border border-border-default bg-surface-overlay text-text-primary outline-hidden animate-in fade-in-0 zoom-in-95 max-h-[min(24rem,70vh)] overflow-y-auto"
          >
            <CommandList>
              {status === "OK" && data.length > 0 ? (
                <CommandGroup>
                  {data.slice(0, 3).map(({ place_id, description }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handleSelect(description)}
                      className="cursor-pointer hover:bg-surface-muted/50"
                    >
                      <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.5} />
                      <span className="text-sm">{description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              {showMixedEntitySuggestions && value.trim().length >= 2 ? (
                <>
                  {status === "OK" && data.length > 0 ? <CommandSeparator /> : null}

                  {buildingsData.length > 0 ? (
                    <CommandGroup heading="Buildings">
                      {buildingsData.map((building) => (
                        <CommandItem
                          key={building.id}
                          value={`b-${building.id}`}
                          onSelect={() => {
                            setOpen(false);
                            clearSuggestions();
                            onBuildingPick?.(building);
                          }}
                          className="cursor-pointer hover:bg-surface-muted/50"
                        >
                          <Building2 className="mr-2 h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.5} />
                          <div className="flex min-w-0 flex-col">
                            <span className="text-sm truncate">{building.name}</span>
                            {(building.city || building.country) && (
                              <span className="text-2xs text-text-secondary truncate">
                                {[building.city, building.country].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {buildingsData.length > 0 && (peopleData.length > 0 || companiesData.length > 0) ? (
                    <CommandSeparator />
                  ) : null}

                  {peopleData.length > 0 ? (
                    <CommandGroup heading="People">
                      {peopleData.map((person) => (
                        <CommandItem
                          key={person.id}
                          value={`p-${person.id}`}
                          onSelect={() => {
                            setOpen(false);
                            clearSuggestions();
                            onPersonPick?.({ slug: person.slug });
                          }}
                          className="cursor-pointer hover:bg-surface-muted/50"
                        >
                          <UserRound className="mr-2 h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.5} />
                          <span className="text-sm truncate">{person.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}

                  {peopleData.length > 0 && companiesData.length > 0 ? <CommandSeparator /> : null}

                  {companiesData.length > 0 ? (
                    <CommandGroup heading="Companies">
                      {companiesData.map((company) => (
                        <CommandItem
                          key={company.id}
                          value={`c-${company.id}`}
                          onSelect={() => {
                            setOpen(false);
                            clearSuggestions();
                            onCompanyPick?.({ slug: company.slug });
                          }}
                          className="cursor-pointer hover:bg-surface-muted/50"
                        >
                          <Briefcase className="mr-2 h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.5} />
                          <span className="text-sm truncate">{company.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </>
              ) : null}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}

export function DiscoverySearchInput(props: DiscoverySearchInputProps) {
  return (
    <ClientOnly
      fallback={
        <StaticSearchFallback
          value={props.value}
          placeholder={props.placeholder}
          className={props.className}
        />
      }
    >
      <DiscoverySearchInputInner {...props} />
    </ClientOnly>
  );
}