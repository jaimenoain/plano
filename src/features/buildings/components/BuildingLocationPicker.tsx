import { useState, useEffect } from "react";
import { LocationInput } from "@/components/ui/LocationInput";
import { getGeocode, getLatLng } from "@/lib/googleMapsGeocoding";
import { Layers, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuildingFormLabel } from "@/features/buildings/components/building-form-ui";
import Map, { Marker, NavigationControl, MapMouseEvent, type MarkerDragEvent } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { extractLocationDetails } from "@/lib/location-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { SATELLITE_MAP_STYLE } from "@/features/maps/constants/satelliteMapStyle";

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
    countryCode: string | null;
    precision: 'exact' | 'approximate';
  }) => void;
}

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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
  const [locationDetails, setLocationDetails] = useState<{city: string | null, country: string | null, countryCode: string | null}>({
      city: initialLocation.city || null,
      country: initialLocation.country || null,
      countryCode: null
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
            country: initialLocation.country || null,
            countryCode: null
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
                     countryCode: details.countryCode,
                     precision: locationPrecision
                 });
             }
         } catch (_err) {
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
              countryCode: locationDetails.countryCode,
              precision: newPrecision
          });
      }
  };

  const updateLocation = (
      lat: number,
      lng: number,
      address: string,
      details: {city: string | null, country: string | null, countryCode: string | null}
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
          countryCode: details.countryCode,
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
      } catch (_error) {
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
    } catch (_error) {
// Fallback with existing address or empty
       updateLocation(lat, lng, selectedAddress, { city: null, country: null, countryCode: null });
    }
  };

  const handleMarkerDragEnd = async (event: MarkerDragEvent) => {
      const { lat, lng } = event.lngLat;
      setMarkerPosition({ lat, lng });

      try {
        const results = await getGeocode({ location: { lat, lng } });
        if (results && results.length > 0) {
            const address = results[0].formatted_address;
            const details = extractLocationDetails(results[0]);
            updateLocation(lat, lng, address, details);
        }
      } catch (_error) {
updateLocation(lat, lng, selectedAddress, { city: null, country: null, countryCode: null });
      }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[350px_1fr]">
       <div className="space-y-4">
          <div className="space-y-2">
            <BuildingFormLabel>Location search</BuildingFormLabel>
            <LocationInput
              value={selectedAddress}
              onLocationSelected={handleLocationSelected}
              placeholder="Search for address..."
              searchTypes={[]}
              className="w-full"
            />
            <p className="text-xs text-text-secondary">
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
                <BuildingFormLabel
                    htmlFor="approximate-location-picker"
                    className="normal-case tracking-normal text-sm text-text-primary"
                >
                    Approximate location
                </BuildingFormLabel>
                <p className="text-xs text-text-secondary">
                    Check this if the exact location is unknown. The pin will represent a general area (e.g. city center).
                </p>
            </div>
          </div>
       </div>

       <div className="h-[400px] rounded-sm overflow-hidden border border-border-default relative bg-surface-muted">
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            onClick={handleMapClick}
            mapLib={maplibregl}
            style={{ width: "100%", height: "100%" }}
            mapStyle={isSatellite ? SATELLITE_MAP_STYLE : DEFAULT_MAP_STYLE}
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
                        <div className="w-7 h-7 rounded-full bg-text-primary border-[3px] border-surface-card drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-transform" />
                    ) : (
                        <MapPin
                          className="h-9 w-9 text-surface-card fill-text-primary drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] transition-colors"
                          strokeWidth={1.5}
                        />
                    )}
                  </div>
              </Marker>
            )}
          </Map>

          <div className="absolute bottom-4 left-4 z-10">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsSatellite(!isSatellite);
              }}
              className="bg-surface-default/90 backdrop-blur border border-border-default hover:bg-surface-muted"
            >
              <Layers className="h-4 w-4 mr-2" />
              {isSatellite ? "Map" : "Satellite"}
            </Button>
          </div>
       </div>
    </div>
  );
}
