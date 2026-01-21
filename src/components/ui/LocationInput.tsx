import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, {
  getGeocode,
} from "use-places-autocomplete";
// CHANGED: Import new functional API instead of the removed Loader class
import { setOptions, importLibrary } from "@googlemaps/js-api-loader"; 
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

// Libraries should be loaded via importLibrary now, but we keep this for consistency if needed elsewhere
const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = [
  "places",
];

interface LocationInputProps {
  value: string;
  onLocationSelected: (address: string, countryCode: string, placeName?: string) => void;
  className?: string;
  placeholder?: string;
  searchTypes?: string[];
  id?: string;
}

export function LocationInput({
  value,
  onLocationSelected,
  className,
  placeholder = "Search for a city...",
  searchTypes = ["(cities)"],
  id,
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

      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("VITE_GOOGLE_MAPS_API_KEY is missing");
        setHasError(true);
        return;
      }

      try {
        // FIXED: Use new functional API
        setOptions({
          key: apiKey,
          version: "weekly",
        });

        // Explicitly load the places library
        await importLibrary("places");
        await importLibrary("geocoding");
        
        setScriptLoaded(true);
      } catch (error) {
        console.error("Error loading Google Maps script", error);
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
}

function PlacesAutocomplete({
  defaultValue,
  onLocationSelected,
  placeholder,
  searchTypes,
  id,
}: PlacesAutocompleteProps) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      // If searchTypes is empty, pass undefined to search all types
      types: searchTypes && searchTypes.length > 0 ? searchTypes : undefined,
    },
    defaultValue,
    debounce: 300,
    initOnMount: true,
  });

  const [open, setOpen] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);

  // Sync internal value with external defaultValue updates
  useEffect(() => {
    if (defaultValue !== undefined && defaultValue !== value) {
        setValue(defaultValue, false);
    }
  }, [defaultValue, setValue, value]);

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
    } catch (error) {
      console.log("Error: ", error);
      // Fallback: save text even if geocode fails
      onLocationSelected(address, "", placeName);
    }
  };

  return (
    <div className="relative" ref={commandRef}>
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <CommandPrimitive.Input
            id={id}
            value={value}
            onValueChange={(val) => {
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
              "flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>

        {open && (status === "OK" || status === "ZERO_RESULTS") && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
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
