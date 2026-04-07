/**
 * DiscoverySearchInput.tsx — Refined with A24 editorial aesthetic
 *
 * Visual changes (all Google Maps / Places Autocomplete logic unchanged):
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
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bounds } from "@/utils/map";
import { ClientOnly } from "@/components/common/ClientOnly";

export interface Suggestion {
  place_id: string;
  description: string;
}

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
  onPlaceDetails?: (details: google.maps.GeocoderResult) => void;
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
      } catch {}
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
  } = usePlacesAutocomplete({
    requestOptions: { types: ["(regions)"] },
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
      onPlaceDetails?.(results[0]);
    } catch {}
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
            className="w-full h-10"
            autoComplete="off"
            onKeyDown={onKeyDown}
          />
        </div>

        {!disableDropdown && open && status === "OK" && (
          <div
            // shadow-lg removed — border + background is sufficient
            className="absolute top-[calc(100%+4px)] left-0 w-full z-50 border border-border-default bg-surface-overlay text-text-primary outline-none animate-in fade-in-0 zoom-in-95"
          >
            <CommandList>
              {/* CommandGroup heading removed — obvious from context */}
              <CommandGroup>
                {data.map(({ place_id, description }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={() => handleSelect(description)}
                    // hover:bg-surface-muted/50 replaces hover:bg-brand-secondary
                    className="cursor-pointer hover:bg-surface-muted/50"
                  >
                    <MapPin className="mr-2 h-3.5 w-3.5 shrink-0 text-text-disabled" strokeWidth={1.5} />
                    <span className="text-sm">{description}</span>
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