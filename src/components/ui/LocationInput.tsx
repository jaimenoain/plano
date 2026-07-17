import { useState, useEffect, useRef } from "react";
import { useAutocompleteSuggestions } from "@/hooks/useAutocompleteSuggestions";
import { getGeocode } from "@/lib/googleMapsGeocoding";
// CHANGED: Import new functional API instead of the removed Loader class
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"; 
import { config } from "@/config";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";


interface LocationInputProps {
  value: string;
  onLocationSelected: (address: string, countryCode: string, placeName?: string) => void;
  className?: string;
  placeholder?: string;
  searchTypes?: string[];
  id?: string;
  /**
   * When set to a non-empty string, the input programmatically seeds its query
   * with this text, runs the autocomplete search, and opens the suggestions
   * dropdown — e.g. to locate a building from its name. Fire
   * {@link LocationInputProps.onAutoSearchConsumed} to clear the trigger.
   */
  autoSearchQuery?: string | null;
  /** Called once an `autoSearchQuery` has been applied, so the caller can reset it. */
  onAutoSearchConsumed?: () => void;
}

export function LocationInput({
  value,
  onLocationSelected,
  className,
  placeholder = "Search for a city...",
  searchTypes = ["(cities)"],
  id,
  autoSearchQuery,
  onAutoSearchConsumed,
}: LocationInputProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Load Google Maps Script
  useEffect(() => {
    const initMap = async () => {
      // Check if already loaded globally
      if (window.google?.maps?.places) {
        setScriptLoaded(true);
        return;
      }

      const apiKey = config.googleMaps.apiKey;
      if (!apiKey) {
setHasError(true);
        return;
      }

      try {
        // FIXED: Use new functional API
        setOptions({
          key: apiKey,
          v: "weekly",
        });

        // Explicitly load the places library
        await importLibrary("places");
        await importLibrary("geocoding");
        
        setScriptLoaded(true);
      } catch (_error) {
setHasError(true);
      }
    };

    initMap();
  }, []);

  if (hasError) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onLocationSelected(e.target.value, "")}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {scriptLoaded ? (
        <PlacesAutocomplete
          defaultValue={value}
          onLocationSelected={onLocationSelected}
          placeholder={placeholder}
          searchTypes={searchTypes}
          id={id}
          autoSearchQuery={autoSearchQuery}
          onAutoSearchConsumed={onAutoSearchConsumed}
        />
      ) : (
        <Button variant="outline" disabled className="w-full justify-start">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading Maps...
        </Button>
      )}
    </div>
  );
}

interface PlacesAutocompleteProps {
  defaultValue: string;
  onLocationSelected: (address: string, countryCode: string, placeName?: string) => void;
  placeholder: string;
  searchTypes: string[];
  id?: string;
  autoSearchQuery?: string | null;
  onAutoSearchConsumed?: () => void;
}

function PlacesAutocomplete({
  defaultValue,
  onLocationSelected,
  placeholder,
  searchTypes,
  id,
  autoSearchQuery,
  onAutoSearchConsumed,
}: PlacesAutocompleteProps) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = useAutocompleteSuggestions({
    types: searchTypes && searchTypes.length > 0 ? searchTypes : undefined,
    defaultValue,
    debounce: 300,
    initOnMount: true,
  });

  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  // Remembers a value we seeded programmatically so the defaultValue sync effect
  // below doesn't immediately reset it back to the (still-stale) parent value.
  const seededQueryRef = useRef<string | null>(null);

  // Sync internal value with external defaultValue updates
  useEffect(() => {
    if (defaultValue !== undefined && defaultValue !== value) {
        // Preserve a freshly-seeded programmatic search until the user acts on it.
        if (seededQueryRef.current !== null && value === seededQueryRef.current) return;
        setValue(defaultValue, false);
    }
  }, [defaultValue, setValue, value]);

  // Programmatic search: seed the query, run the fetch, and open the dropdown
  // when the caller requests it (e.g. locate a building from its name).
  useEffect(() => {
    const query = autoSearchQuery?.trim();
    if (!ready || !query) return;
    seededQueryRef.current = query;
    setValue(query, true);
    setOpen(true);
    onAutoSearchConsumed?.();
  }, [autoSearchQuery, ready, setValue, onAutoSearchConsumed]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (address: string, placeName?: string) => {
    seededQueryRef.current = null;
    setValue(address, false);
    clearSuggestions();
    setOpen(false);

    try {
      const results = await getGeocode({ address });
      const addressComponents = results[0]?.address_components;

      const countryComponent = addressComponents?.find((c) =>
        c.types.includes("country")
      );

      const countryCode = countryComponent ? countryComponent.short_name : "";

      onLocationSelected(address, countryCode, placeName);
    } catch (_error) {
// Fallback: save text even if geocode fails
      onLocationSelected(address, "", placeName);
    }
  };

  return (
    <div className="relative" ref={commandRef}>
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-text-secondary z-10" />
          <CommandPrimitive.Input
            id={id}
            value={value}
            onValueChange={(val) => {
              seededQueryRef.current = null;
              setValue(val);
              // FIXED: Update parent immediately so typing is saved even if no suggestion is clicked
              onLocationSelected(val, "");
              setOpen(!!val);
            }}
            onFocus={() => setOpen(!!value)}
            disabled={!ready}
            placeholder={placeholder}
            autoComplete="off" // FIXED: Disable browser autocomplete
            className={cn(
              "flex h-10 w-full rounded-sm border border-border-default bg-surface-muted pl-9 pr-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-disabled focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        {open && (status === "OK" || status === "ZERO_RESULTS") && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-1150 rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-hidden animate-in fade-in-0 zoom-in-95">
            <CommandList>
              <CommandGroup>
                {status === "OK" &&
                  data.map(({ place_id, description, structured_formatting }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handleSelect(description, structured_formatting?.main_text)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0" />
                      <span>{description}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
              {status === "ZERO_RESULTS" && (
                <CommandEmpty>No results found.</CommandEmpty>
              )}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
