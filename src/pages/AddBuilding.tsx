import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationInput } from "@/components/ui/LocationInput";
import { supabase } from "@/integrations/supabase/client";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { importLibrary } from "@googlemaps/js-api-loader";
import { Loader2, MapPin, Navigation, Plus, ArrowRight, Bookmark, Check, Building2 } from "lucide-react";
import MapGL, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AddBuildingDetails } from "@/components/AddBuildingDetails";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { RecommendDialog } from "@/components/common/RecommendDialog";
import { useQuery } from "@tanstack/react-query";

// Helper to parse Geocoder results
const extractLocationDetails = (result: any) => {
  let city = null;
  let country = null;

  if (!result || !result.address_components) return { city, country };

  for (const component of result.address_components) {
    if (component.types.includes('locality')) {
      city = component.long_name;
    }
    if (component.types.includes('country')) {
      country = component.long_name;
    }
  }

  // Fallback for city if locality is missing
  if (!city) {
     for (const component of result.address_components) {
        if (component.types.includes('administrative_area_level_2')) {
            city = component.long_name;
            break;
        }
     }
  }

  return { city, country };
};

interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
  similarity_score?: number;
  main_image_url?: string | null;
}

export default function AddBuilding() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [potentialName, setPotentialName] = useState<string | undefined>(undefined);
  const [nameInput, setNameInput] = useState("");
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [extractedLocation, setExtractedLocation] = useState<{ city: string | null; country: string | null }>({ city: null, country: null });
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [selectedBuildingForVisit, setSelectedBuildingForVisit] = useState<{ id: string; name: string } | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Load Google Maps
  useEffect(() => {
    const loadMaps = async () => {
        if (window.google?.maps?.places) {
            setMapsLoaded(true);
            return;
        }
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
            try {
                await importLibrary("places");
                await importLibrary("geocoding");
                setMapsLoaded(true);
            } catch (e) {
                console.error("Failed to load maps", e);
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

        // @ts-ignore - log table exists, user_buildings does not
        const { data, error } = await supabase
            .from("log")
            .select("film_id, status")
            .eq("user_id", user.id);

        if (error) {
            console.error("Error fetching user buildings (log):", error);
            return new Map();
        }

        const map = new Map();
        data.forEach((item: any) => {
            // Map film_id to building_id and status
            let status = item.status;
            if (status === 'watchlist') status = 'pending';
            if (status === 'watched') status = 'visited';
            map.set(item.film_id, status);
        });
        return map;
    }
  });

  // Default to London, but this will be overridden if we can get user location or just start somewhere generic
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  // Handle URL parameters for initial location
  useEffect(() => {
    if (!mapsLoaded) return; // Wait for maps to load

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
            .catch((error) => {
              console.error("Initial reverse geocoding error:", error);
            });
        } catch (e) {
          console.error("Geocoding failed to initialize:", e);
        }
      }
    }
  }, [searchParams, mapsLoaded]);

  const [finalLocationData, setFinalLocationData] = useState<{
    lat: number;
    lng: number;
    address: string;
    name?: string;
    city?: string | null;
    country?: string | null;
  } | null>(null);


  // Debounced duplicate check
  useEffect(() => {
    if (!markerPosition) return;

    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const queryName = nameInput || potentialName || "";

        // Run two concurrent checks:
        // 1. Strict Location Check: 50m radius, ANY name (ensure collisions are caught)
        // 2. Fuzzy Name Check: 5km radius, matching name (catch duplicates placed slightly off)

        // Wrap RPC calls in try-catch because find_nearby_buildings might not exist
        let locationData: NearbyBuilding[] = [];
        let nameData: NearbyBuilding[] = [];

        try {
            // @ts-ignore
            const locationCheckPromise = supabase.rpc('search_buildings', {
                location_coordinates: { lat: markerPosition.lat, lng: markerPosition.lng },
                radius_meters: 50,
                query_text: ""
            });

            // Only run name check if we have a name to check
            const nameCheckPromise = (queryName.length >= 3)
                // @ts-ignore
                ? supabase.rpc('search_buildings', {
                    location_coordinates: { lat: markerPosition.lat, lng: markerPosition.lng },
                    radius_meters: 50000, // Wider 50km radius
                    query_text: queryName,
                    sort_by: 'relevance'
                })
                : Promise.resolve({ data: [], error: null });

            const [locationResult, nameResult] = await Promise.all([locationCheckPromise, nameCheckPromise]);

            if (locationResult.error) {
                console.warn("search_buildings RPC failed", locationResult.error);
            } else {
                // Map distance_meters to dist_meters
                locationData = (locationResult.data || []).map((d: any) => ({
                    ...d,
                    dist_meters: d.distance_meters || 0
                }));
            }

            if (nameResult.error) {
                 console.warn("search_buildings RPC failed", nameResult.error);
            } else {
                // Map distance_meters to dist_meters
                nameData = (nameResult.data || []).map((d: any) => ({
                    ...d,
                    dist_meters: d.distance_meters || 0
                }));
            }
        } catch (err) {
            console.warn("Exception checking duplicates:", err);
        }

        // Filter name results to ensure relevance
        // search_buildings handles relevance sorting, so we assume top results are relevant if they match query
        // We filter client-side: keep if dist < 50 (covered by location check anyway) OR if we have a name query (implicit relevance)
        const validNameMatches = nameData.filter(d =>
            d.dist_meters <= 50 || queryName.length >= 3
        );

        // Merge and deduplicate by ID
        const allDuplicates = [...locationData, ...validNameMatches];
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
      } catch (error) {
        console.error("Error checking duplicates:", error);
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
    if (countryCode || placeName || address.length > 5) {
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
      } catch (error) {
        console.error("Geocoding error:", error);
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
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // We don't block the user if reverse geocoding fails, they just won't get an auto-filled address
      if (!selectedAddress) {
        toast.error("Could not fetch address details, but location is set.");
      }
    }
  };

  const proceedToStep2 = () => {
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
            address: selectedAddress,
            name: nameInput,
            city: extractedLocation.city,
            country: extractedLocation.country
        });
        setStep(2);
        setShowDuplicateDialog(false);
    }
  };

  const handleAddToMyList = async (buildingId: string, status: 'pending' | 'visited') => {
    if (!user) {
      toast.error("You must be logged in to add buildings.");
      return;
    }

    try {
      // Map status
      const dbStatus = status === 'pending' ? 'watchlist' : 'watched';

      // @ts-ignore - log table exists
      const { error } = await supabase
        .from("log")
        .upsert({
          user_id: user.id,
          film_id: buildingId,
          status: dbStatus,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, film_id' });

      if (error) throw error;

      const action = status === 'pending' ? "Bucket List" : "Visited list";

      if (status === 'pending') {
          const building = duplicates.find(d => d.id === buildingId);
          if (building) {
              setSelectedBuildingForVisit({ id: buildingId, name: building.name });
              setShowVisitDialog(true);
              toast.success(`Building added to your ${action}!`);
          } else {
              toast.success(`Building added to your ${action}!`);
              navigate(`/building/${buildingId}`);
          }
      } else {
          toast.success(`Building added to your ${action}!`);
          navigate(`/building/${buildingId}`);
      }

    } catch (error) {
      console.error("Error adding building to list:", error);
      toast.error("Failed to add building to your list.");
    }
  };

  if (step === 2 && finalLocationData) {
    return <div className="container max-w-2xl py-8"><AddBuildingDetails locationData={finalLocationData} onBack={() => setStep(1)} /></div>;
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add a Building</h1>
        <p className="text-muted-foreground mt-2">
          Pinpoint the location on the map.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[350px_1fr]">
        {/* Sidebar / Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="building-name">Building Name (Optional)</Label>
                <Input
                  id="building-name"
                  placeholder="e.g. The Shard"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Location Search</Label>
                <LocationInput
                  value={selectedAddress}
                  onLocationSelected={handleLocationSelected}
                  placeholder="Search for address..."
                  searchTypes={[]}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Search or click on the map to set location.
                </p>
              </div>

              <Button
                onClick={proceedToStep2}
                disabled={!markerPosition || checkingDuplicates}
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
            </CardContent>
          </Card>

          {/* Duplicates List */}
          {duplicates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {duplicates.length}
                  </Badge>
                  Nearby Buildings
                </CardTitle>
                <CardDescription className="text-xs">
                  We found similar buildings in the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">

                {/* Location Matches */}
                {duplicates.some(d => d.dist_meters <= 50) && (
                    <div className="space-y-2">
                        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                           <MapPin className="h-3 w-3" /> Same Location
                        </div>
                        {duplicates.filter(d => d.dist_meters <= 50).map(building => (
                             <div
                                key={building.id}
                                className="flex flex-col gap-2 p-3 rounded-md border border-amber-200/50 bg-amber-50/50 text-sm hover:bg-amber-100/50 transition-colors"
                              >
                                <div
                                  className="cursor-pointer flex gap-3"
                                  onClick={() => navigate(`/building/${building.id}`)}
                                >
                                  <Avatar className="h-10 w-10 rounded-md">
                                    <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                                    <AvatarFallback className="rounded-md">
                                      <Building2 className="h-5 w-5 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium flex justify-between items-start">
                                      <span className="truncate pr-1">{building.name}</span>
                                      <span className="text-xs text-amber-700 font-bold whitespace-nowrap">
                                        {building.dist_meters.toFixed(0)}m
                                      </span>
                                    </div>
                                    {building.address && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{building.address}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex gap-2 w-full">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1 h-8 text-xs gap-1 bg-white hover:bg-white/80"
                                        onClick={() => handleAddToMyList(building.id, 'pending')}
                                    >
                                        <Bookmark className="h-3 w-3" />
                                        Bucket List
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1 h-8 text-xs gap-1 bg-white hover:bg-white/80"
                                        onClick={() => handleAddToMyList(building.id, 'visited')}
                                    >
                                        <Check className="h-3 w-3" />
                                        Visited
                                    </Button>
                                </div>
                              </div>
                        ))}
                    </div>
                )}

                {/* Name Matches */}
                {duplicates.some(d => d.dist_meters > 50) && (
                    <div className="space-y-2 pt-2">
                        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                           Similar Names (Far Away)
                        </div>
                         {duplicates.filter(d => d.dist_meters > 50).map(building => (
                             <div
                                key={building.id}
                                className="flex flex-col gap-2 p-3 rounded-md border text-sm hover:bg-muted/50 transition-colors"
                              >
                                <div
                                  className="cursor-pointer flex gap-3"
                                  onClick={() => navigate(`/building/${building.id}`)}
                                >
                                  <Avatar className="h-10 w-10 rounded-md">
                                    <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                                    <AvatarFallback className="rounded-md">
                                      <Building2 className="h-5 w-5 text-muted-foreground" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium flex justify-between items-start">
                                      <span className="truncate pr-1">{building.name}</span>
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {(building.dist_meters / 1000).toFixed(1)}km
                                      </span>
                                    </div>
                                    {building.address && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">{building.address}</p>
                                    )}
                                  </div>
                                </div>
                                 <div className="flex gap-2 w-full">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => handleAddToMyList(building.id, 'pending')}
                                    >
                                        <Bookmark className="h-3 w-3" />
                                        Bucket List
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="flex-1 h-8 text-xs gap-1"
                                        onClick={() => handleAddToMyList(building.id, 'visited')}
                                    >
                                        <Check className="h-3 w-3" />
                                        Visited
                                    </Button>
                                </div>
                              </div>
                        ))}
                    </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map Area */}
        <div className="h-[600px] rounded-xl overflow-hidden border shadow-sm relative bg-muted">
          <MapGL
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            mapLib={maplibregl}
            style={{ width: "100%", height: "100%" }}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
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
                    <MapPin className="h-8 w-8 text-red-600 fill-red-600 drop-shadow-md" />
                    <div className="w-2 h-1 bg-black/30 rounded-full blur-[1px]"></div>
                </div>
              </Marker>
            )}

            {/* Duplicates */}
            {duplicates.map((building) => {
              const status = userBuildingsMap?.get(building.id);
              const pinColor = status === 'visited' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500';
              const label = status === 'visited' ? 'V' : status === 'pending' ? 'P' : 'B';

              return (
              <Marker
                key={building.id}
                longitude={building.location_lng}
                latitude={building.location_lat}
                anchor="bottom"
                onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    navigate(`/building/${building.id}`);
                }}
                className="cursor-pointer hover:z-10"
              >
                 <div className="group relative flex flex-col items-center">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap">
                        <div className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-lg">
                            {building.name} {status && `(${status})`}
                        </div>
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
                    </div>

                    <div className={`w-6 h-6 rounded-full ${pinColor} border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold`}>
                        {label}
                    </div>
                 </div>
              </Marker>
            )})}
          </MapGL>

          {/* Overlay Legend or Status */}
          <div className="absolute top-4 left-4 bg-background/95 backdrop-blur px-3 py-2 rounded-md border shadow-sm text-xs space-y-1">
             <div className="flex items-center gap-2">
                 <MapPin className="h-3 w-3 text-red-600" />
                 <span>Selected Location</span>
             </div>
             <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-blue-500 border border-white"></div>
                 <span>Existing Building</span>
             </div>
             {checkingDuplicates && (
                 <div className="flex items-center gap-2 text-muted-foreground pt-1 border-t mt-1">
                     <Loader2 className="h-3 w-3 animate-spin" />
                     <span>Checking nearby...</span>
                 </div>
             )}
          </div>
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
                {duplicates.some(d => d.dist_meters <= 50) && (
                    <div className="space-y-2">
                        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> Same Location
                        </div>
                        {duplicates.filter(d => d.dist_meters <= 50).map(building => (
                            <div
                                key={building.id}
                                className="flex flex-col gap-2 p-3 rounded-md border border-amber-200/50 bg-amber-50/50 text-sm hover:bg-amber-100/50 transition-colors"
                            >
                                <div
                                    className="cursor-pointer flex gap-3"
                                    onClick={() => navigate(`/building/${building.id}`)}
                                >
                                    <Avatar className="h-10 w-10 rounded-md">
                                        <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                                        <AvatarFallback className="rounded-md">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium flex justify-between items-start">
                                            <span className="truncate pr-1">{building.name}</span>
                                            <span className="text-xs text-amber-700 font-bold whitespace-nowrap">
                                                {building.dist_meters.toFixed(0)}m
                                            </span>
                                        </div>
                                        {building.address && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 truncate">{building.address}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full h-8 text-xs gap-1 bg-white hover:bg-white/80"
                                        onClick={() => handleAddToMyList(building.id, 'pending')}
                                    >
                                        <Bookmark className="h-3 w-3" />
                                        Add to Bucket List
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full h-8 text-xs gap-1 bg-white hover:bg-white/80"
                                        onClick={() => handleAddToMyList(building.id, 'visited')}
                                    >
                                        <Check className="h-3 w-3" />
                                        Mark as Visited
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {duplicates.some(d => d.dist_meters > 50) && (
                    <div className="space-y-2 pt-2">
                        <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                            Similar Names (Far Away)
                        </div>
                        {duplicates.filter(d => d.dist_meters > 50).map(building => (
                            <div
                                key={building.id}
                                className="flex flex-col gap-2 p-3 rounded-md border text-sm hover:bg-muted/50 transition-colors"
                            >
                                <div
                                    className="cursor-pointer flex gap-3"
                                    onClick={() => navigate(`/building/${building.id}`)}
                                >
                                    <Avatar className="h-10 w-10 rounded-md">
                                        <AvatarImage src={building.main_image_url || undefined} alt={building.name} className="object-cover" />
                                        <AvatarFallback className="rounded-md">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium flex justify-between items-start">
                                            <span className="truncate pr-1">{building.name}</span>
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                {(building.dist_meters / 1000).toFixed(1)}km
                                            </span>
                                        </div>
                                        {building.address && (
                                            <p className="text-xs text-muted-foreground line-clamp-1 truncate">{building.address}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full h-8 text-xs gap-1"
                                        onClick={() => handleAddToMyList(building.id, 'pending')}
                                    >
                                        <Bookmark className="h-3 w-3" />
                                        Bucket List
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="w-full h-8 text-xs gap-1"
                                        onClick={() => handleAddToMyList(building.id, 'visited')}
                                    >
                                        <Check className="h-3 w-3" />
                                        Mark as Visited
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <DialogFooter className="sm:justify-start">
                <Button variant="ghost" className="text-muted-foreground text-xs" onClick={forceProceedToStep2}>
                    No, I want to create a new entry <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedBuildingForVisit && (
        <RecommendDialog
            open={showVisitDialog}
            onOpenChange={(open) => {
                setShowVisitDialog(open);
                if (!open && selectedBuildingForVisit) {
                    navigate(`/building/${selectedBuildingForVisit.id}`);
                }
            }}
            building={selectedBuildingForVisit}
            mode="visit_with"
        />
      )}
    </div>
  );
}
