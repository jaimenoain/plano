import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationInput } from "@/components/ui/LocationInput";
import { supabase } from "@/integrations/supabase/client";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { Loader2, MapPin, Navigation, Plus, ArrowRight, Bookmark, Check } from "lucide-react";
import MapGL, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/hooks/useAuth";

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

  const { user } = useAuth();
  const navigate = useNavigate();

  // Default to London, but this will be overridden if we can get user location or just start somewhere generic
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

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

        const locationCheckPromise = supabase.rpc('find_nearby_buildings', {
            lat: markerPosition.lat,
            long: markerPosition.lng,
            radius_meters: 50,
            name_query: "" // Don't filter by name for collision detection
        });

        // Only run name check if we have a name to check
        const nameCheckPromise = (queryName.length > 2)
            ? supabase.rpc('find_nearby_buildings', {
                lat: markerPosition.lat,
                long: markerPosition.lng,
                radius_meters: 5000, // Wider 5km radius
                name_query: queryName
            })
            : Promise.resolve({ data: [] as NearbyBuilding[], error: null });

        const [locationResult, nameResult] = await Promise.all([locationCheckPromise, nameCheckPromise]);

        if (locationResult.error) throw locationResult.error;
        if (nameResult.error) throw nameResult.error;

        const locationData = locationResult.data || [];
        const nameData = nameResult.data || [];

        // Filter name results to ensure relevance (e.g. good similarity score)
        // If the RPC logic is "dist < radius OR match", then passing 5000 might return everything.
        // We filter client-side to be safe: keep if dist < 50 (covered by location check anyway) OR similarity > 0.3
        const validNameMatches = nameData.filter(d =>
            d.dist_meters <= 50 || (d.similarity_score && d.similarity_score > 0.3)
        );

        // Merge and deduplicate by ID
        const allDuplicates = [...locationData, ...validNameMatches];
        const uniqueDuplicates = Array.from(new window.Map(allDuplicates.map(item => [item.id, item])).values());

        // Sort: Closer ones first, then by similarity
        uniqueDuplicates.sort((a, b) => a.dist_meters - b.dist_meters);

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
      const { error } = await supabase
        .from("user_buildings")
        .upsert({
          user_id: user.id,
          building_id: buildingId,
          status: status,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, building_id' });

      if (error) throw error;

      const action = status === 'pending' ? "Bucket List" : "Visited list";
      toast.success(`Building added to your ${action}!`);
      navigate(`/building/${buildingId}`);
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
                disabled={!markerPosition}
                className="w-full"
              >
                Continue
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
                  These buildings are already in the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {duplicates.map((building) => (
                  <div
                    key={building.id}
                    className="flex flex-col gap-2 p-3 rounded-md border text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/building/${building.id}`)}
                    >
                        <div className="font-medium flex justify-between items-start">
                        <span>{building.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {building.dist_meters.toFixed(0)}m
                        </span>
                        </div>
                        {building.address && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{building.address}</p>
                        )}
                    </div>

                    <div className="flex gap-2 w-full">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 h-8 text-xs gap-1"
                            onClick={() => handleAddToMyList(building.id, 'pending')}
                            title="Add to Bucket List"
                        >
                            <Bookmark className="h-3 w-3" />
                            Bucket List
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            className="flex-1 h-8 text-xs gap-1"
                            onClick={() => handleAddToMyList(building.id, 'visited')}
                            title="Mark as Visited"
                        >
                            <Check className="h-3 w-3" />
                            Visited
                        </Button>
                    </div>
                  </div>
                ))}
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
            {duplicates.map((building) => (
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
                            {building.name}
                        </div>
                        <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground"></div>
                    </div>

                    <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold">
                        B
                    </div>
                 </div>
              </Marker>
            ))}
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
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 my-2">
                {duplicates.map((building) => (
                  <div
                    key={building.id}
                    className="flex flex-col gap-2 p-3 rounded-md border text-sm hover:bg-muted/50 transition-colors"
                  >
                    <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/building/${building.id}`)}
                    >
                        <div className="font-medium flex justify-between items-start">
                        <span>{building.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {building.dist_meters.toFixed(0)}m
                        </span>
                        </div>
                        {building.address && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{building.address}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            size="sm"
                            variant="default"
                            className="w-full h-8 text-xs gap-1"
                            onClick={() => handleAddToMyList(building.id, 'pending')}
                        >
                            <Bookmark className="h-3 w-3" />
                            Add to Bucket List
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
            <DialogFooter className="sm:justify-start">
                <Button variant="ghost" className="text-muted-foreground text-xs" onClick={forceProceedToStep2}>
                    No, I want to create a new entry <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
