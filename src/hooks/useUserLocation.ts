import { useState } from "react";
import { toast } from "sonner";

interface Location {
  lat: number;
  lng: number;
}

export function useUserLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = (): Promise<Location | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const msg = "Geolocation is not supported by your browser";
        setError(msg);
        toast.error(msg);
        resolve(null);
        return;
      }

      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(newLocation);
          setIsLoading(false);
          toast.success("Location updated");
          resolve(newLocation);
        },
        (err) => {
          setError(err.message);
          setIsLoading(false);
          toast.error("Unable to retrieve location: " + err.message);
          resolve(null);
        }
      );
    });
  };

  return { location, error, isLoading, requestLocation };
}
