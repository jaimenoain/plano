import { useState } from "react";
import { toast } from "sonner";
export function useUserLocation() {
    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const requestLocation = (options) => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                const msg = "Geolocation is not supported by your browser";
                setError(msg);
                if (!options?.silent)
                    toast.error(msg);
                resolve(null);
                return;
            }
            setIsLoading(true);
            navigator.geolocation.getCurrentPosition((position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setLocation(newLocation);
                setIsLoading(false);
                if (!options?.silent)
                    toast.success("Location updated");
                resolve(newLocation);
            }, (err) => {
                setError(err.message);
                setIsLoading(false);
                if (!options?.silent)
                    toast.error("Unable to retrieve location: " + err.message);
                resolve(null);
            });
        });
    };
    return { location, error, isLoading, requestLocation };
}
