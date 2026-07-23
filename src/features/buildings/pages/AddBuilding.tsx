import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { LocationInput } from "@/components/ui/LocationInput";
import {
  BuildingFormLabel,
  BuildingFormPanel,
  BuildingPageHeader,
} from "@/features/buildings/components/building-form-ui";
import { supabase } from "@/integrations/supabase/client";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";
import { importLibrary } from "@googlemaps/js-api-loader";
import { config } from "@/config";
import { Loader2, MapPin, Layers, CheckCircle2, Search } from "lucide-react";
import MapGL, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocation, useNavigate, useSearchParams, type MetaFunction } from "react-router";
import { toast } from "sonner";
import { AddBuildingDetails } from "../components/AddBuildingDetails";
import { AddBuildingAuthGate, AddBuildingAuthLoading } from "../components/AddBuildingAuthGate";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getBuildingUrl } from "@/utils/url";
import {
  NearbyBuildingsList,
  type NearbyBuilding,
} from "../components/NearbyBuildingsList";
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";
import { AppLayout } from "@/components/layout/AppLayout";
import { extractLocationDetails } from "@/lib/location-utils";
import { useAutocompleteSuggestions } from "@/hooks/useAutocompleteSuggestions";

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

// Helper to parse Geocoder results
const STOP_WORDS = [
  'building', 'tower', 'house', 'center', 'centre', 'plaza', 'court',
  'hall', 'residence', 'residences', 'apartment', 'apartments', 'condo',
  'condos', 'office', 'offices', 'station', 'park', 'garden', 'gardens',
  'bridge', 'church', 'museum', 'hotel', 'school', 'college', 'university',
  'library', 'hospital', 'terminal', 'airport', 'mall', 'market', 'store',
  'shop', 'block', 'street', 'avenue', 'road'
];

export const meta: MetaFunction = () => [
  { title: "Add Building | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function AddBuilding() {
  const [step, setStep] = useState<1 | 2 | null>(1);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [locationPrecision, setLocationPrecision] = useState<'exact' | 'approximate'>('exact');
  const [potentialName, setPotentialName] = useState<string | undefined>(undefined);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [extractedLocation, setExtractedLocation] = useState<{ city: string | null; country: string | null; countryCode: string | null }>({ city: null, country: null, countryCode: null });
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  // Guards against re-running the name-driven lookup for a name we already searched.
  const lastAutoSearchedName = useRef<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Seed the name once from the URL (?name=) so the field stays freely
  // editable afterward. A URL→state effect would re-inject the param whenever
  // the field is cleared, trapping the user on the (often approximate) value.
  const [nameInput, setNameInput] = useState<string>(() => searchParams.get("name") ?? "");
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [isMapClient, setIsMapClient] = useState(false);

  useEffect(() => {
    setIsMapClient(true);
  }, []);

  // Load Google Maps
  useEffect(() => {
    const loadMaps = async () => {
        if (window.google?.maps?.places) {
            setMapsLoaded(true);
            return;
        }
        const apiKey = config.googleMaps.apiKey;
        if (apiKey) {
            try {
                await importLibrary("places");
                await importLibrary("geocoding");
                setMapsLoaded(true);
            } catch (_e) {
}
        }
    };
    loadMaps();
  }, []);

  // Fetch user relationships
  const { data: userBuildingsMap } = useQuery({
    queryKey: ["user-buildings-map-add", user?.id],
    enabled: !!user,
    queryFn: async () => {
        if (!user) return new Map();

        const { data, error } = await supabase
            .from("user_buildings")
            .select("building_id, status")
            .eq("user_id", user.id);

        if (error) {
return new Map();
        }

        const map = new Map();
        data.forEach((item: { building_id: string; status: string }) => {
            map.set(item.building_id, item.status);
        });
        return map;
    }
  });

  // Default to London, but this will be overridden if we can get user location or just start somewhere generic
  const [viewState, setViewState] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
  }>({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Background "did you mean?" lookup driven by the building name. It NEVER fills
  // the location field — matches are surfaced as a dismissible suggestion list, so
  // a name that Google can't resolve (obscure, foreign-language, not a POI) simply
  // shows nothing instead of hindering the address search. Biased to the current
  // map view so generic names ("City Hall") resolve to the right area.
  const nameLocator = useAutocompleteSuggestions({
    debounce: 350,
    initOnMount: true,
    locationBias: { lat: viewState.latitude, lng: viewState.longitude },
  });

  // Handle URL parameters for initial location
  useEffect(() => {
    if (!mapsLoaded) return undefined; // Wait for maps to load

    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);

      if (!isNaN(lat) && !isNaN(lng)) {
        setViewState((prev) => ({ ...prev, latitude: lat, longitude: lng, zoom: 16 }));
        setMarkerPosition({ lat, lng });

        // Reverse geocode to get address details
        try {
          getGeocode({ location: { lat, lng } })
            .then((results) => {
              if (results && results.length > 0) {
                setSelectedAddress(results[0].formatted_address);
                const details = extractLocationDetails(results[0]);
                setExtractedLocation(details);
              }
            })
            .catch((_error) => {
          void _error;
});
        } catch (_e) {
}
      }
    }
    return undefined;
  }, [searchParams, mapsLoaded]);

  const [finalLocationData, setFinalLocationData] = useState<{
    lat: number;
    lng: number;
    address: string;
    name?: string;
    city?: string | null;
    country?: string | null;
    countryCode?: string | null;
    precision: 'exact' | 'approximate';
  } | null>(null);


  // Debounced duplicate check
  useEffect(() => {
    if (!markerPosition) return undefined;

    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const queryName = nameInput || potentialName || "";
        const normalizedQuery = queryName.toLowerCase().trim();

        // Run two concurrent checks:
        // 1. Strict Location Check: 50m radius, ANY name (ensure collisions are caught)
        // 2. Fuzzy Name Check: 5km radius, matching name (catch duplicates placed slightly off)

        // Wrap RPC calls in try-catch
        let locationData: NearbyBuilding[] = [];
        let nameData: NearbyBuilding[] = [];

        try {
            const locationCheckPromise = supabase.rpc('find_nearby_buildings', {
                lat: markerPosition.lat,
                long: markerPosition.lng,
                radius_meters: 2000,
                name_query: ""
            });

            // Only run name check if we have a name to check and it's not a generic stop word
            const nameCheckPromise = (queryName.length >= 3 && !STOP_WORDS.includes(normalizedQuery))
                ? supabase.rpc('find_nearby_buildings', {
                    lat: markerPosition.lat,
                    long: markerPosition.lng,
                    radius_meters: 50000, // Wider 50km radius
                    name_query: queryName
                })
                : Promise.resolve({ data: [], error: null });

            const [locationResult, nameResult] = await Promise.all([locationCheckPromise, nameCheckPromise]);

            if (!locationResult.error) {
                locationData =
                  (locationResult.data as unknown as NearbyBuilding[]) || [];
            }

            if (!nameResult.error) {
                nameData = (nameResult.data as unknown as NearbyBuilding[]) || [];
            }
        } catch (_err) {
          void _err;
        }

        // Filter name results to ensure relevance
        // search_buildings handles relevance sorting, so we assume top results are relevant if they match query
        // We filter client-side:
        // 1. If very close (<= 50m), keep it.
        // 2. If far (> 50m), enforce stricter similarity threshold (e.g., > 0.6) to avoid showing irrelevant results.
        const validNameMatches = nameData.filter(d => {
            if (d.dist_meters <= 50) return true;

            // For far buildings, require higher similarity
            const similarity = d.similarity_score || 0;
            return similarity >= 0.6;
        });

        // Filter location results: keep if <= 50m OR if approximate (within 2km)
        const relevantLocationMatches = locationData.filter(d =>
            d.dist_meters <= 50 || d.location_precision === 'approximate'
        );

        // Merge and deduplicate by ID
        const allDuplicates = [...relevantLocationMatches, ...validNameMatches];
        const uniqueDuplicates = Array.from(new window.Map(allDuplicates.map(item => [item.id, item])).values());

        // Sort: Exact location matches (<= 50m) first, then high-confidence name matches
        uniqueDuplicates.sort((a, b) => {
            const aExact = a.dist_meters <= 50;
            const bExact = b.dist_meters <= 50;

            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;

            // If both are exact location matches, sort by distance
            if (aExact && bExact) {
                return a.dist_meters - b.dist_meters;
            }

            // If both are fuzzy matches (> 50m), sort by similarity score (descending)
            const aSim = a.similarity_score || 0;
            const bSim = b.similarity_score || 0;

            if (aSim !== bSim) {
                return bSim - aSim;
            }

            return a.dist_meters - b.dist_meters;
        });

        setDuplicates(uniqueDuplicates);
      } catch (_error) {
} finally {
        setCheckingDuplicates(false);
      }
    };

    const timer = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timer);
  }, [markerPosition, nameInput, potentialName]);

  const handleLocationSelected = async (address: string, countryCode: string, placeName?: string) => {
    setSelectedAddress(address);
    setPotentialName(placeName);

    if (!nameInput && placeName) {
      setNameInput(placeName);
    }

    // Only move map if this seems like a genuine selection (has country code or place name)
    // or if the address is long enough to be specific.
    if (countryCode || placeName) {
      try {
        const results = await getGeocode({ address });
        if (results && results.length > 0) {
          const { lat, lng } = await getLatLng(results[0]);
          setMarkerPosition({ lat, lng });
          setViewState({
            latitude: lat,
            longitude: lng,
            zoom: 16
          });

          const details = extractLocationDetails(results[0]);
          setExtractedLocation(details);
        }
      } catch (_error) {
toast.error("Location search failed. Please click on the map to set the location manually.");
      }
    }
  };

  const handleMapClick = async (event: MapMouseEvent) => {
    const { lat, lng } = event.lngLat;
    setMarkerPosition({ lat, lng });

    try {
      const results = await getGeocode({ location: { lat, lng } });
      if (results && results.length > 0) {
        setSelectedAddress(results[0].formatted_address);
        const details = extractLocationDetails(results[0]);
        setExtractedLocation(details);
      }
    } catch (_error) {
// We don't block the user if reverse geocoding fails, they just won't get an auto-filled address
      if (!selectedAddress) {
        toast.error("Could not fetch address details, but location is set.");
      }
    }
  };

  // Quietly look the building name up in Places so a named landmark ("The Shard")
  // can be located. Runs in the background — it never fills the location field, so
  // a name Google can't resolve costs the user nothing.
  const maybeLocateFromName = (): void => {
    const query = nameInput.trim();
    if (
      query.length < 3 ||
      markerPosition ||
      selectedAddress ||
      lastAutoSearchedName.current === query
    ) {
      return;
    }
    lastAutoSearchedName.current = query;
    nameLocator.setValue(query, true);
  };

  // User tapped one of the name-derived suggestions → resolve it to a pin.
  const handleNameSuggestionPick = (description: string, placeName?: string): void => {
    nameLocator.clearSuggestions();
    void handleLocationSelected(description, "", placeName);
  };

  // Show the name suggestions only while the location is still unset — once a pin
  // exists or the user is searching an address, they're irrelevant.
  const nameSuggestions =
    !markerPosition && !selectedAddress && nameLocator.suggestions.status === "OK"
      ? nameLocator.suggestions.data.slice(0, 3)
      : [];

  const proceedToStep2 = (): void => {
    if (!markerPosition) return;

    if (duplicates.length > 0) {
      setShowDuplicateDialog(true);
      return;
    }

    forceProceedToStep2();
  };

  const forceProceedToStep2 = () => {
    if (markerPosition) {
        setFinalLocationData({
            lat: markerPosition.lat,
            lng: markerPosition.lng,
            address: selectedAddress ?? "",
            name: nameInput ?? "",
            city: extractedLocation.city,
            country: extractedLocation.country,
            countryCode: extractedLocation.countryCode,
            precision: locationPrecision
        });
        setStep(2);
        setShowDuplicateDialog(false);
    }
  };

  if (authLoading) {
    return <AddBuildingAuthLoading />;
  }

  if (!user) {
    const redirectTarget = encodeURIComponent(`${location.pathname}${location.search}`);
    return <AddBuildingAuthGate redirectTarget={redirectTarget} />;
  }

  if (step === 2 && finalLocationData) {
    return (
      <AppLayout title="Add Building" showBack>
        <div className="min-h-screen bg-surface-default">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <AddBuildingDetails
              locationData={finalLocationData}
              onBack={() => setStep(1)}
              returnTo={searchParams.get("returnTo") ?? undefined}
            />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Add Building" showBack>
    <div className="min-h-screen bg-surface-default">
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <BuildingPageHeader
        title="Add Building"
        description="Pinpoint the location on the map, then continue to add details."
      />

      <div className="grid gap-6 md:grid-cols-[350px_1fr]">
        {/* Sidebar / Controls */}
        <div className="space-y-6">
          <BuildingFormPanel title="Location details">
            <div className="space-y-4">
              <div className="space-y-2">
                <BuildingFormLabel htmlFor="building-name">Building name (optional)</BuildingFormLabel>
                <Input
                  id="building-name"
                  placeholder="e.g. The Shard"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onBlur={maybeLocateFromName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      maybeLocateFromName();
                    }
                  }}
                  autoComplete="off"
                />
                <p className="text-xs text-text-secondary">
                  We&apos;ll use this to help find the building on the map.
                </p>
              </div>

              <div className="space-y-2">
                <BuildingFormLabel>Location search</BuildingFormLabel>
                <LocationInput
                  value={selectedAddress ?? ""}
                  onLocationSelected={handleLocationSelected}
                  placeholder="Search by name or address..."
                  searchTypes={[]}
                  className="w-full"
                />
                <p className="text-xs text-text-secondary">
                  Search or click on the map to set location.
                </p>

                {/* Non-destructive "did you mean?" matches derived from the name.
                    Never fills the field; absent when the name has no match. */}
                {nameSuggestions.length > 0 && (
                  <div className="overflow-hidden rounded-sm border border-border-default bg-surface-muted">
                    <p className="eyebrow tracking-widest px-3 pb-1.5 pt-2.5 text-text-secondary">
                      Matches for “{nameInput.trim()}”
                    </p>
                    <ul>
                      {nameSuggestions.map((s) => (
                        <li key={s.place_id}>
                          <button
                            type="button"
                            onClick={() =>
                              handleNameSuggestionPick(s.description, s.structured_formatting?.main_text)
                            }
                            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface-default"
                          >
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-text-primary">
                                {s.structured_formatting?.main_text ?? s.description}
                              </span>
                              <span className="block truncate text-xs text-text-secondary">
                                {s.description}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                    id="approximate-location-add"
                    checked={locationPrecision === 'approximate'}
                    onCheckedChange={(checked) => setLocationPrecision(checked ? 'approximate' : 'exact')}
                />
                <div className="grid gap-1.5 leading-none">
                    <BuildingFormLabel
                        htmlFor="approximate-location-add"
                        className="normal-case tracking-normal text-sm text-text-primary"
                    >
                        Approximate location
                    </BuildingFormLabel>
                    <p className="text-xs text-text-secondary">
                        Check this if the exact location is unknown. The pin will represent a general area (e.g. city center).
                    </p>
                </div>
              </div>

              {/* Location status — always states whether the requirement is met */}
              <div
                id="location-requirement"
                className={`flex items-start gap-2 rounded-sm border p-3 text-sm ${
                  markerPosition
                    ? "border-feedback-success/40 bg-feedback-success/10"
                    : "border-border-default bg-surface-muted"
                }`}
              >
                {markerPosition ? (
                  <>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-feedback-success" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary">
                        {locationPrecision === "approximate" ? "Approximate location set" : "Location set"}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {selectedAddress || "Custom map pin"}
                      </p>
                      <p className="mt-0.5 text-xs text-text-disabled">
                        {markerPosition.lat.toFixed(5)}, {markerPosition.lng.toFixed(5)}
                        {checkingDuplicates && (
                          <span className="ml-2 inline-flex items-center gap-1 text-text-secondary">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking nearby…
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Search className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary">Location not set</p>
                      <p className="text-xs text-text-secondary">
                        Search above or tap anywhere on the map to drop a pin.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Button
                onClick={proceedToStep2}
                disabled={!markerPosition || checkingDuplicates}
                aria-describedby="location-requirement"
                className="w-full"
              >
                {checkingDuplicates ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </BuildingFormPanel>

          {/* Duplicates List */}
          {duplicates.length > 0 && (
            <BuildingFormPanel title={`Nearby buildings (${duplicates.length})`}>
              <p className="text-xs text-text-secondary mb-4">
                We found similar buildings in the database.
              </p>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                <NearbyBuildingsList
                  duplicates={duplicates}
                  onSelect={(id) => navigate(getBuildingUrl(id))}
                />
              </div>
            </BuildingFormPanel>
          )}
        </div>

        {/* Map Area */}
        <div className="h-[360px] md:h-[600px] rounded-sm overflow-hidden border border-border-default relative bg-surface-muted">
          {!isMapClient ? (
            <div className="flex h-full w-full items-center justify-center" aria-hidden>
              <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
            </div>
          ) : (
            <>
              <MapGL
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                onClick={handleMapClick}
                mapLib={maplibregl}
                style={{ width: "100%", height: "100%" }}
                mapStyle={isSatellite ? SATELLITE_MAP_STYLE : DEFAULT_MAP_STYLE}
                cursor="crosshair"
              >
                <NavigationControl position="top-right" />

                {/* User Pin */}
                {markerPosition && (
                  <Marker
                    longitude={markerPosition.lng}
                    latitude={markerPosition.lat}
                    anchor="bottom"
                    draggable
                    onDragEnd={(e) => {
                        const { lat, lng } = e.lngLat;
                        setMarkerPosition({ lat, lng });
                        // Trigger reverse geocode for dragged pin
                        getGeocode({ location: { lat, lng } }).then(results => {
                            if (results && results.length > 0) {
                                setSelectedAddress(results[0].formatted_address);
                                const details = extractLocationDetails(results[0]);
                                setExtractedLocation(details);
                            }
                        });
                    }}
                  >
                    <div className="flex flex-col items-center">
                        {locationPrecision === 'approximate' ? (
                            <div className="w-7 h-7 rounded-full bg-text-primary border-[3px] border-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-transform" />
                        ) : (
                            <MapPin
                                className="h-9 w-9 text-white fill-text-primary drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-colors"
                                strokeWidth={1.5}
                            />
                        )}
                        <div className="w-2 h-1 bg-black/40 rounded-full blur-[1px]"></div>
                    </div>
                  </Marker>
                )}

                {/* Duplicates */}
                {duplicates.map((building) => {
                  const status = userBuildingsMap?.get(building.id);
                  const pinColor = status === 'visited' ? 'bg-brand-primary' : status === 'pending' ? 'bg-feedback-warning' : 'bg-text-secondary';
                  const label = status === 'visited' ? 'V' : status === 'pending' ? 'P' : 'B';

                  return (
                  <Marker
                    key={building.id}
                    longitude={building.location_lng}
                    latitude={building.location_lat}
                    anchor="bottom"
                    onClick={(e) => {
                        e.originalEvent.stopPropagation();
                        // Locality URL not available: NearbyBuilding does not include locality_country_code/city_slug — requires duplicate-check RPC to join localities table
                        navigate(getBuildingUrl(building.id));
                    }}
                    className="cursor-pointer hover:z-10"
                  >
                     <div className="group relative flex flex-col items-center">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap">
                            <div className="bg-foreground text-background text-xs px-2 py-1 rounded-sm border border-border-default">
                                {building.name} {status && `(${status})`}
                            </div>
                            <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-foreground"></div>
                        </div>

                        <div className={`w-6 h-6 rounded-full ${pinColor} border-2 border-white shadow-none flex items-center justify-center text-white text-[10px] font-bold`}>
                            {label}
                        </div>
                     </div>
                  </Marker>
                )})}
              </MapGL>

              {/* Overlay Legend or Status */}
              <div className="absolute top-4 left-4 bg-surface-default/95 backdrop-blur-sm px-3 py-2 rounded-sm border border-border-default text-xs space-y-1">
                 <div className="flex items-center gap-2">
                     {locationPrecision === 'approximate' ? (
                         <div className="w-3 h-3 rounded-full bg-text-primary border border-white shadow-xs" />
                     ) : (
                         <MapPin className="h-3 w-3 text-white fill-text-primary drop-shadow-xs" strokeWidth={1.5} />
                     )}
                     <span>Selected Location</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-text-secondary border border-surface-card"></div>
                     <span>Existing Building</span>
                 </div>
                 {checkingDuplicates && (
                     <div className="flex items-center gap-2 text-text-secondary pt-1 border-t mt-1">
                         <Loader2 className="h-3 w-3 animate-spin" />
                         <span>Checking nearby...</span>
                     </div>
                 )}
              </div>

              {/* Empty-state hint: makes the second unblock path (tap the map) obvious */}
              {!markerPosition && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
                  <div className="flex items-center gap-2 rounded-sm border border-border-default bg-surface-default/95 px-4 py-2.5 text-sm text-text-primary shadow-lg backdrop-blur-sm">
                    <MapPin className="h-4 w-4 text-text-secondary" strokeWidth={1.5} />
                    Tap anywhere to drop a pin
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 z-10">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSatellite(!isSatellite)}
                  className="bg-surface-default/90 backdrop-blur-sm border border-border-default hover:bg-surface-muted"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {isSatellite ? "Map" : "Satellite"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Duplicate Building Found</DialogTitle>
                <DialogDescription>
                    It looks like this building is already in the database. Do you want to add this one to your list instead?
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 my-2">
                <NearbyBuildingsList
                  duplicates={duplicates}
                  onSelect={(id) => navigate(getBuildingUrl(id))}
                />
            </div>
            <DialogFooter className="sm:justify-start">
                <Button variant="ghost" className="text-text-secondary text-xs" onClick={forceProceedToStep2}>
                    No, I want to create a new entry
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
    </AppLayout>
  );
}
