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

  const requestLocation = () => {
    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
        toast.success("Location updated");
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
        toast.error("Unable to retrieve location: " + err.message);
      }
    );
  };

  return { location, error, isLoading, requestLocation };
}
