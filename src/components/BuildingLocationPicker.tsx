import { useState, useEffect } from "react";
import { LocationInput } from "@/components/ui/LocationInput";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin } from "lucide-react";
import Map, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { extractLocationDetails } from "@/lib/location-utils";
import { Label } from "@/components/ui/label";

interface BuildingLocationPickerProps {
  initialLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  onLocationChange: (location: {
    lat: number;
    lng: number;
    address: string;
    city: string | null;
    country: string | null;
  }) => void;
}

export function BuildingLocationPicker({ initialLocation, onLocationChange }: BuildingLocationPickerProps) {
  const [selectedAddress, setSelectedAddress] = useState(initialLocation.address);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number }>({
    lat: initialLocation.lat,
    lng: initialLocation.lng,
  });

  const [viewState, setViewState] = useState({
    latitude: initialLocation.lat,
    longitude: initialLocation.lng,
    zoom: 15,
  });

  // Update view state if initialLocation changes (e.g. data loaded)
  useEffect(() => {
    setViewState(prev => ({
        ...prev,
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
    }));
    setMarkerPosition({
        lat: initialLocation.lat,
        lng: initialLocation.lng
    });
    setSelectedAddress(initialLocation.address);
  }, [initialLocation.lat, initialLocation.lng, initialLocation.address]);


  const handleLocationSelected = async (address: string, countryCode: string, placeName?: string) => {
    setSelectedAddress(address);

    // Only move map if this seems like a genuine selection
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

          onLocationChange({
            lat,
            lng,
            address: results[0].formatted_address,
            city: details.city,
            country: details.country
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
        const address = results[0].formatted_address;
        setSelectedAddress(address);
        const details = extractLocationDetails(results[0]);

        onLocationChange({
            lat,
            lng,
            address,
            city: details.city,
            country: details.country
        });
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      // Even if reverse geocoding fails, we update lat/lng
      // We might want to keep the old address or clear it?
      // For now, let's just trigger update with old address or empty
       onLocationChange({
            lat,
            lng,
            address: selectedAddress, // keep old address or maybe should set to "Custom Location"
            city: null, // unsure
            country: null // unsure
        });
    }
  };

  const handleMarkerDragEnd = async (event: any) => {
      const { lat, lng } = event.lngLat;
      setMarkerPosition({ lat, lng });

      try {
        const results = await getGeocode({ location: { lat, lng } });
        if (results && results.length > 0) {
            const address = results[0].formatted_address;
            setSelectedAddress(address);
            const details = extractLocationDetails(results[0]);

            onLocationChange({
                lat,
                lng,
                address,
                city: details.city,
                country: details.country
            });
        }
      } catch (error) {
          console.error("Reverse geocoding error:", error);
           onLocationChange({
            lat,
            lng,
            address: selectedAddress,
            city: null,
            country: null
        });
      }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[350px_1fr]">
       <div className="space-y-4">
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
              Search or drag the pin on the map to change location.
            </p>
          </div>
       </div>

       <div className="h-[400px] rounded-xl overflow-hidden border shadow-sm relative bg-muted">
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
            <Marker
                longitude={markerPosition.lng}
                latitude={markerPosition.lat}
                anchor="bottom"
                draggable
                onDragEnd={handleMarkerDragEnd}
            >
                <div className="flex flex-col items-center">
                    <MapPin className="h-8 w-8 text-red-600 fill-red-600 drop-shadow-md" />
                    <div className="w-2 h-1 bg-black/30 rounded-full blur-[1px]"></div>
                </div>
            </Marker>
          </Map>
       </div>
    </div>
  );
}
