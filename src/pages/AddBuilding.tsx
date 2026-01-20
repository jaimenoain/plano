import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationInput } from "@/components/ui/LocationInput";
import { supabase } from "@/integrations/supabase/client";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { Loader2, AlertCircle } from "lucide-react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
}

export default function AddBuilding() {
  const [selectedAddress, setSelectedAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const navigate = useNavigate();

  const handleLocationSelected = async (address: string) => {
    setSelectedAddress(address);
    // Don't trigger check on typing, only on selection (handled via a button or specific action)
    // But LocationInput calls this on type as well.
    // We will trigger the check only when user explicitly confirms or we detect a "complete" selection.
    // However, `LocationInput` logic is a bit mixed. It calls onLocationSelected on type AND on select.
    // We'll rely on the "Continue" button or a specific effect if we want auto-detection.
    // For now, let's add a "Next" button that triggers the check.
  };

  const handleNext = async () => {
    if (!selectedAddress) return;

    setIsChecking(true);
    setDuplicates([]);
    setShowDuplicates(false);

    try {
      // 1. Get coordinates for the address
      const results = await getGeocode({ address: selectedAddress });
      if (!results || results.length === 0) {
        toast.error("Could not find coordinates for this address.");
        setIsChecking(false);
        return;
      }

      const { lat, lng } = await getLatLng(results[0]);
      setSelectedLocation({ lat, lng });

      // 2. Query nearby buildings
      const { data, error } = await supabase.rpc('find_nearby_buildings', {
        lat,
        long: lng,
        radius_meters: 100 // 100m radius
      });

      if (error) {
        console.error("Error checking duplicates:", error);
        toast.error("Failed to check for duplicates.");
        setIsChecking(false);
        return;
      }

      if (data && data.length > 0) {
        setDuplicates(data);
        setShowDuplicates(true);
      } else {
        // No duplicates, proceed to step 2
        proceedToStep2(lat, lng, selectedAddress);
      }

    } catch (error) {
      console.error("Error in duplicate check flow:", error);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsChecking(false);
    }
  };

  const proceedToStep2 = (lat: number, lng: number, address: string) => {
    console.log("Proceeding to step 2 with:", { lat, lng, address });
    // In a real app, we would navigate to the next step, passing state.
    // For this task, we log it or show a success message.
    toast.success("Location verified! Proceeding to next step...");
    // navigate("/add-building/details", { state: { lat, lng, address } });
  };

  return (
    <div className="container max-w-2xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add a Building</h1>
        <p className="text-muted-foreground mt-2">
          Step 1: Where is it? Search for the building's location.
        </p>
      </div>

      {!showDuplicates ? (
        <Card>
          <CardHeader>
            <CardTitle>Location Search</CardTitle>
            <CardDescription>
              Search for the building by address or name. We'll check if it already exists.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LocationInput
              value={selectedAddress}
              onLocationSelected={handleLocationSelected}
              placeholder="e.g. Empire State Building, New York"
              // Pass empty array for searchTypes to allow "establishment" and "geocode" (all types)
              searchTypes={[]}
              className="w-full"
            />

            <Button
              onClick={handleNext}
              disabled={!selectedAddress || isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking for duplicates...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Potential Duplicates Found</AlertTitle>
            <AlertDescription>
              We found existing buildings near this location. Is it one of these?
            </AlertDescription>
          </Alert>

          <div className="h-[400px] w-full rounded-lg overflow-hidden border relative">
            {selectedLocation && (
              <Map
                initialViewState={{
                  longitude: selectedLocation.lng,
                  latitude: selectedLocation.lat,
                  zoom: 16
                }}
                mapLib={maplibregl}
                style={{ width: "100%", height: "100%" }}
                mapStyle="https://tiles.openfreemap.org/styles/liberty"
              >
                <NavigationControl />

                {/* User Selected Location */}
                <Marker
                  longitude={selectedLocation.lng}
                  latitude={selectedLocation.lat}
                  color="#EF4444" // Red
                />

                {/* Existing Buildings */}
                {duplicates.map((building) => (
                    <Marker
                        key={building.id}
                        longitude={building.location_lng}
                        latitude={building.location_lat}
                        color="#3B82F6" // Blue
                        onClick={() => navigate(`/building/${building.id}`)}
                        className="cursor-pointer"
                    >
                         {/* Simple tooltip on hover could be added here if needed, or just rely on marker interaction */}
                    </Marker>
                ))}
              </Map>
            )}
            <div className="absolute bottom-4 left-4 bg-background/90 p-2 rounded text-xs space-y-1 shadow backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Your Selection</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Existing Building</span>
                </div>
            </div>
          </div>

          <div className="grid gap-4">
            {duplicates.map((building) => (
                <Card key={building.id} className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/building/${building.id}`)}>
                    <div>
                        <h4 className="font-semibold">{building.name}</h4>
                        <p className="text-sm text-muted-foreground">{building.address}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {(building.dist_meters).toFixed(1)}m away
                        </p>
                    </div>
                    <Button variant="outline" size="sm">
                        View Existing
                    </Button>
                </Card>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowDuplicates(false)}>
                Back to Search
            </Button>
            <Button onClick={() => selectedLocation && proceedToStep2(selectedLocation.lat, selectedLocation.lng, selectedAddress)}>
                No, create new building
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
