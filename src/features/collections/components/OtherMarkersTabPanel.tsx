import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MapPin, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config";
import { useAutocompleteSuggestions } from "@/hooks/useAutocompleteSuggestions";
import { fetchPlaceDetailsNew } from "@/lib/googleMapsGeocoding";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import type { CollectionMarker } from "@/features/collections/types";
import {
  getCollectionMarkerLucideIcon,
  mapGoogleTypesToCollectionCategory,
  pickGooglePrimaryTypeForStorage,
} from "@/features/collections/markerPlaceDisplay";

function displayMarkerSecondaryLine(marker: CollectionMarker): string | null {
  let displayAddress = marker.address;
  if (displayAddress && marker.name) {
    if (displayAddress.startsWith(`${marker.name}, `)) {
      displayAddress = displayAddress.substring(marker.name.length + 2);
    } else if (displayAddress.startsWith(`${marker.name},`)) {
      displayAddress = displayAddress.substring(marker.name.length + 1).trim();
    }
  }
  return displayAddress?.trim() || null;
}

function markerCategoryIcon(marker: CollectionMarker): LucideIcon {
  return getCollectionMarkerLucideIcon(marker.category, marker.google_primary_type);
}

/** Search field + suggestion list; mounts only after Google Places script is ready (see parent). */
function PlacesAutocompleteFields({
  collectionId,
  userId,
  markersCount,
  onCollectionDataChanged,
}: {
  collectionId: string;
  userId: string;
  markersCount: number;
  onCollectionDataChanged?: () => void;
}) {
  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
    init,
  } = useAutocompleteSuggestions({
    debounce: 300,
    initOnMount: false,
    legacyAutocompleteFallback: false,
  });

  useEffect(() => {
    init();
  }, [init]);

  const queryClient = useQueryClient();

  const handleSelect = async (address: string, placeId: string, mainText: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const details = await fetchPlaceDetailsNew(placeId);
      const category = mapGoogleTypesToCollectionCategory(details.types);
      const googlePrimaryType = pickGooglePrimaryTypeForStorage(details.primaryType, details.types);
      const name = details.displayName?.trim() || mainText;

      const { error } = await supabase.from("collection_markers").insert({
        collection_id: collectionId,
        google_place_id: placeId,
        google_primary_type: googlePrimaryType,
        name,
        category,
        lat: details.lat,
        lng: details.lng,
        address: details.formattedAddress || address,
        created_by: userId,
      });

      if (error) throw error;

      toast.success("Place added to collection");
      setValue("", false);
      queryClient.invalidateQueries({ queryKey: ["collection_markers", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
      onCollectionDataChanged?.();
    } catch (_error) {
      toast.error("Failed to add place");
    }
  };

  const showIdleHint = status !== "OK" && status !== "ZERO_RESULTS" && status !== "ERROR" && markersCount === 0;

  return (
    <Command shouldFilter={false} className="flex flex-col bg-transparent shadow-none rounded-none border-0">
      <div className="shrink-0 px-4 pb-3 pt-1">
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary z-10 pointer-events-none" />
          <CommandPrimitive.Input
            value={value}
            onValueChange={(val) => {
              setValue(val);
            }}
            disabled={!ready}
            placeholder="Search for a place to add…"
            autoComplete="off"
            className={cn(
              "flex h-10 w-full rounded-sm border-0 bg-brand-secondary pl-9 pr-3 py-2 text-sm shadow-none outline-hidden ring-0",
              "placeholder:text-text-secondary focus-visible:ring-1 focus-visible:ring-brand-accent focus-visible:ring-offset-0",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        {status === "OK" || status === "ZERO_RESULTS" ? (
          <CommandList className="max-h-none overflow-visible p-0">
            {status === "OK" && data.length > 0 ? (
              <CommandGroup heading="Suggestions" className="**:[[cmdk-group-heading]]:px-0 **:[[cmdk-group-heading]]:pb-2">
                {data.map(({ place_id, description, structured_formatting }) => (
                  <CommandItem
                    key={place_id}
                    value={description}
                    onSelect={() =>
                      handleSelect(description, place_id, structured_formatting?.main_text || description)
                    }
                    className="cursor-pointer rounded-none px-2 aria-selected:bg-brand-secondary"
                  >
                    <MapPin className="mr-2 h-4 w-4 shrink-0 text-text-secondary" />
                    <span className="text-sm">{description}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {status === "ZERO_RESULTS" && <CommandEmpty className="py-6 text-sm">No results found.</CommandEmpty>}
          </CommandList>
        ) : status === "ERROR" ? (
          <p className="py-6 text-center text-sm text-text-secondary">
            Could not load suggestions. Confirm Places is enabled for this project&apos;s API key.
          </p>
        ) : showIdleHint ? (
          <p className="py-4 text-center text-sm leading-relaxed text-text-secondary">
            Search above to add restaurants, hotels, transit stops, and other places. New picks appear on your map straight away.
          </p>
        ) : null}
      </div>
    </Command>
  );
}

/** "Other markers" tab of the Add-to-Collection dialog: Google Places search + the places already pinned. */
export function OtherMarkersTabPanel({
  collectionId,
  userId,
  dialogOpen,
  onCollectionDataChanged,
}: {
  collectionId: string;
  userId: string;
  dialogOpen: boolean;
  onCollectionDataChanged?: () => void;
}) {
  const queryClient = useQueryClient();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
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
        setOptions({
          key: apiKey,
          v: "weekly",
        });

        await importLibrary("places");

        setScriptLoaded(true);
      } catch (_error) {
        setHasError(true);
      }
    };

    initMap();
  }, []);

  const { data: markers = [], isLoading: markersLoading } = useQuery({
    queryKey: ["collection_markers", collectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_markers")
        .select("*")
        .eq("collection_id", collectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CollectionMarker[];
    },
    enabled: !!collectionId && dialogOpen,
  });

  const removeMarkerMutation = useMutation({
    mutationFn: async (markerId: string) => {
      const { error } = await supabase.from("collection_markers").delete().eq("id", markerId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Place removed from collection");
      queryClient.invalidateQueries({ queryKey: ["collection_markers", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["collection_items", collectionId] });
      onCollectionDataChanged?.();
    },
    onError: () => {
      toast.error("Could not remove place");
    },
  });

  const handleRemoveMarker = (markerId: string) => {
    setRemovingId(markerId);
    removeMarkerMutation.mutate(markerId, {
      onSettled: () => setRemovingId(null),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {hasError ? (
        <div className="flex flex-1 flex-col justify-center px-4 pb-8 text-center text-sm text-feedback-destructive">
          Could not load Google Places. Try again later.
        </div>
      ) : !scriptLoaded ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-text-secondary">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-xs">Loading place search…</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col pb-4">
            <PlacesAutocompleteFields
              collectionId={collectionId}
              userId={userId}
              markersCount={markers.length}
              onCollectionDataChanged={onCollectionDataChanged}
            />
            <div className="px-4 pt-4">
              {markersLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-sm bg-brand-secondary/80 animate-pulse" />
                  ))}
                </div>
              ) : markers.length > 0 ? (
                <>
                  <p className="mb-2 eyebrow tracking-widest">
                    Places on this map
                  </p>
                  <ul className="space-y-0.5">
                    {markers.map((marker) => {
                      const Icon = markerCategoryIcon(marker);
                      const line2 = displayMarkerSecondaryLine(marker);
                      const busy = removingId === marker.id;
                      return (
                        <li key={marker.id}>
                          <div className="flex items-start gap-2 rounded-sm px-2 py-2 transition-colors hover:bg-brand-secondary/60">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug text-text-primary">{marker.name}</p>
                              {line2 ? (
                                <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{line2}</p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-text-secondary hover:text-text-primary"
                              disabled={busy}
                              onClick={() => handleRemoveMarker(marker.id)}
                              title="Remove from collection"
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
