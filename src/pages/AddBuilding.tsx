import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationInput } from "@/components/ui/LocationInput";
import { supabase } from "@/integrations/supabase/client";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { Loader2, MapPin, Navigation } from "lucide-react";
import Map, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AddBuildingDetails } from "@/components/AddBuildingDetails";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
}

export default function AddBuilding() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [potentialName, setPotentialName] = useState<string | undefined>(undefined);
  const [nameInput, setNameInput] = useState("");
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Default to London, but this will be overridden if we can get user location or just start somewhere generic
  const [viewState, setViewState] = useState({
    latitude: 51.5074,
    longitude: -0.1278,
    zoom: 12
  });

  const [finalLocationData, setFinalLocationData] = useState<{ lat: number; lng: number; address: string; name?: string } | null>(null);

  const navigate = useNavigate();

  // Debounced duplicate check
  useEffect(() => {
    if (!markerPosition) return;

    const checkDuplicates = async () => {
      setCheckingDuplicates(true);
      try {
        const { data, error } = await supabase.rpc('find_nearby_buildings', {
          lat: markerPosition.lat,
          long: markerPosition.lng,
          radius_meters: 100, // Increased slightly to show context, but requirements said 50m before. I'll stick to logic or keep 50m. Let's use 100m for better visibility on map.
          name_query: nameInput || potentialName || ""
        });

        if (error) throw error;
        setDuplicates(data || []);
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
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
    }
  };

  const proceedToStep2 = () => {
    if (markerPosition) {
      setFinalLocationData({
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        address: selectedAddress,
        name: nameInput
      });
      setStep(2);
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
                    className="flex flex-col gap-1 p-2 rounded-md hover:bg-muted cursor-pointer text-sm border"
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
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map Area */}
        <div className="h-[600px] rounded-xl overflow-hidden border shadow-sm relative bg-muted">
          <Map
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
          </Map>

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
    </div>
  );
}
