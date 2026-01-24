import { useState, useEffect, useRef } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Command as CommandPrimitive } from "cmdk";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscoverySearchInputProps {
  value: string;
  onSearchChange: (value: string) => void;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function DiscoverySearchInput({
  value,
  onSearchChange,
  onLocationSelect,
  placeholder = "Search...",
  className,
}: DiscoverySearchInputProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

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

  const {
    ready,
    value: placesValue,
    setValue: setPlacesValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ["(cities)"],
    },
    debounce: 300,
    initOnMount: true,
  });

  // Sync external value with internal places value to ensure suggestions are relevant
  useEffect(() => {
      if (value !== placesValue) {
          setPlacesValue(value);
      }
  }, [value, setPlacesValue, placesValue]);

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

  const handleSelect = async (address: string) => {
    clearSuggestions();
    setOpen(false);

    // Clear search query to show all buildings in the new location
    onSearchChange("");

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      onLocationSelect({ lat, lng });
    } catch (error) {
      console.error("Geocoding error: ", error);
    }
  };

  if (!scriptLoaded) {
     return (
        <Input
            value={value}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className={className}
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
                className="w-full"
                autoComplete="off"
            />
        </div>

        {open && (status === "OK") && (
          <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
            <CommandList>
              <CommandGroup heading="Locations">
                {data.map(({ place_id, description }) => (
                    <CommandItem
                      key={place_id}
                      value={description}
                      onSelect={() => handleSelect(description)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{description}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
