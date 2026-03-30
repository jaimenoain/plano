import { useState, useEffect, useRef } from "react";
import { LocationInput } from "@/components/ui/LocationInput";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { MapPin, Layers } from "lucide-react";
import Map, { Marker, NavigationControl, MapMouseEvent } from "react-map-gl";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { extractLocationDetails } from "@/lib/location-utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface BuildingLocationPickerProps {
  initialLocation: {
    lat: number | null;
    lng: number | null;
    address: string;
    city?: string | null;
    country?: string | null;
  };
  initialPrecision?: 'exact' | 'approximate';
  onLocationChange: (location: {
    lat: number;
    lng: number;
    address: string;
    city: string | null;
    country: string | null;
    precision: 'exact' | 'approximate';
  }) => void;
}

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    "satellite-tiles": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      tileSize: 256,
      attribution: "&copy; Esri"
    }
  },
  layers: [
    {
      id: "satellite-layer",
      type: "raster",
      source: "satellite-tiles",
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

export function BuildingLocationPicker({ initialLocation, initialPrecision = 'exact', onLocationChange }: BuildingLocationPickerProps) {
  const [selectedAddress, setSelectedAddress] = useState(initialLocation.address);
  const [locationPrecision, setLocationPrecision] = useState<'exact' | 'approximate'>(initialPrecision);
  const [isSatellite, setIsSatellite] = useState(true);
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(
    initialLocation.lat !== null && initialLocation.lng !== null
      ? { lat: initialLocation.lat, lng: initialLocation.lng }
      : null
  );

  // Store details to re-emit when precision changes
  const [locationDetails, setLocationDetails] = useState<{city: string | null, country: string | null}>({
      city: initialLocation.city || null,
      country: initialLocation.country || null
  });

  const [viewState, setViewState] = useState({
    latitude: initialLocation.lat ?? 51.5074,
    longitude: initialLocation.lng ?? -0.1278,
    zoom: 15,
  });

  // Update view state if initialLocation changes (e.g. data loaded)
  useEffect(() => {
    if (initialLocation.lat !== null && initialLocation.lng !== null) {
      setViewState(prev => ({
          ...prev,
          latitude: initialLocation.lat!,
          longitude: initialLocation.lng!,
      }));
      setMarkerPosition({
          lat: initialLocation.lat,
          lng: initialLocation.lng
      });
    }
    setSelectedAddress(initialLocation.address);
    if (initialLocation.city !== undefined) {
        setLocationDetails({
            city: initialLocation.city || null,
            country: initialLocation.country || null
        });
    }

    // Auto-geocode if location is missing but address is present
    if ((initialLocation.lat === null || initialLocation.lng === null) && initialLocation.address) {
      const attemptGeocode = async () => {
         try {
             const results = await getGeocode({ address: initialLocation.address });
             if (results && results.length > 0) {
                 const { lat, lng } = await getLatLng(results[0]);
                 const details = extractLocationDetails(results[0]);

                 setMarkerPosition({ lat, lng });
                 setViewState(prev => ({ ...prev, latitude: lat, longitude: lng }));
                 setLocationDetails(details);

                 onLocationChange({
                     lat,
                     lng,
                     address: results[0].formatted_address,
                     city: details.city,
                     country: details.country,
                     precision: locationPrecision
                 });
             }
         } catch (err) {
             console.log("Auto-geocode on load failed:", err);
         }
      };

      attemptGeocode();
    }
  }, [initialLocation.lat, initialLocation.lng, initialLocation.address, initialLocation.city, initialLocation.country]);

  // Handle precision change specifically
  const handlePrecisionChange = (checked: boolean) => {
      const newPrecision = checked ? 'approximate' : 'exact';
      setLocationPrecision(newPrecision);

      if (markerPosition) {
          onLocationChange({
              lat: markerPosition.lat,
              lng: markerPosition.lng,
              address: selectedAddress,
              city: locationDetails.city,
              country: locationDetails.country,
              precision: newPrecision
          });
      }
  };

  const updateLocation = (
      lat: number,
      lng: number,
      address: string,
      details: {city: string | null, country: string | null}
  ) => {
      setMarkerPosition({ lat, lng });
      setSelectedAddress(address);
      setLocationDetails(details);

      onLocationChange({
          lat,
          lng,
          address,
          city: details.city,
          country: details.country,
          precision: locationPrecision
      });
  };


  const handleLocationSelected = async (address: string, countryCode: string, placeName?: string) => {
    setSelectedAddress(address);

    // Only move map if this seems like a genuine selection
    if (countryCode || placeName) {
      try {
        const results = await getGeocode({ address });
        if (results && results.length > 0) {
          const { lat, lng } = await getLatLng(results[0]);
          setViewState({
            latitude: lat,
            longitude: lng,
            zoom: 16
          });

          const details = extractLocationDetails(results[0]);
          updateLocation(lat, lng, results[0].formatted_address, details);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    }
  };

  const handleMapClick = async (event: MapMouseEvent) => {
    const { lat, lng } = event.lngLat;
    // Optimistic update
    setMarkerPosition({ lat, lng });

    try {
      const results = await getGeocode({ location: { lat, lng } });
      if (results && results.length > 0) {
        const address = results[0].formatted_address;
        const details = extractLocationDetails(results[0]);
        updateLocation(lat, lng, address, details);
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
       // Fallback with existing address or empty
       updateLocation(lat, lng, selectedAddress, { city: null, country: null });
    }
  };

  const handleMarkerDragEnd = async (event: any) => {
      const { lat, lng } = event.lngLat;
      setMarkerPosition({ lat, lng });

      try {
        const results = await getGeocode({ location: { lat, lng } });
        if (results && results.length > 0) {
            const address = results[0].formatted_address;
            const details = extractLocationDetails(results[0]);
            updateLocation(lat, lng, address, details);
        }
      } catch (error) {
          console.error("Reverse geocoding error:", error);
          updateLocation(lat, lng, selectedAddress, { city: null, country: null });
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

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
                id="approximate-location-picker"
                checked={locationPrecision === 'approximate'}
                onCheckedChange={handlePrecisionChange}
            />
            <div className="grid gap-1.5 leading-none">
                <Label
                    htmlFor="approximate-location-picker"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    Approximate Location
                </Label>
                <p className="text-xs text-muted-foreground">
                    Check this if the exact location is unknown. The pin will represent a general area (e.g. city center).
                </p>
            </div>
          </div>
       </div>

       <div className="h-[400px] rounded-xl overflow-hidden border shadow-sm relative bg-muted">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            mapLib={maplibregl}
            style={{ width: "100%", height: "100%" }}
            mapStyle={isSatellite ? SATELLITE_STYLE : DEFAULT_MAP_STYLE}
            cursor="crosshair"
          >
            <NavigationControl position="top-right" />
            {markerPosition && (
              <Marker
                  longitude={markerPosition.lng}
                  latitude={markerPosition.lat}
                  anchor="bottom"
                  draggable
                  onDragEnd={handleMarkerDragEnd}
              >
                  <div className="flex flex-col items-center">
                      {locationPrecision === 'approximate' ? (
                          <div className="w-6 h-6 rounded-full bg-[#EEFF41] border-2 border-background drop-shadow-md transition-transform" />
                      ) : (
                          <MapPin
                            className="h-8 w-8 text-[#EEFF41] fill-[#EEFF41] drop-shadow-md transition-colors"
                          />
                      )}
                      <div className="w-2 h-1 bg-black/30 rounded-full blur-[1px]"></div>
                  </div>
              </Marker>
            )}
          </Map>

          <button
            onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
            }}
            className="absolute top-2 left-2 p-2 bg-background/90 backdrop-blur rounded-md border shadow-sm hover:bg-muted transition-colors z-10 flex items-center gap-2"
            title={isSatellite ? "Show Map" : "Show Satellite"}
            type="button"
          >
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium">{isSatellite ? "Map" : "Satellite"}</span>
          </button>
       </div>
    </div>
  );
}
