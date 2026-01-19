import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

interface AvailabilityData {
  stream: Provider[];
  rent: Provider[];
  buy: Provider[];
}

export function useFilmAvailability(
  filmId: string | null,
  tmdbId: number | null,
  type: string | undefined,
  userCountry: string,
  initialData?: AvailabilityData
) {
  const [availability, setAvailability] = useState<AvailabilityData | null>(initialData || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we have initial data (seeded from tmdb-movie), use it and ensure it's cached
    if (initialData) {
      setAvailability(initialData);
      if (filmId && userCountry) {
        cacheAvailability(filmId, userCountry, initialData);
      }
      return;
    }

    if (!filmId || !tmdbId || !userCountry) return;

    const fetchAvailability = async () => {
      setLoading(true);
      try {
        // 1. Check DB
        const { data: dbData } = await supabase
          .from("film_availability")
          .select("stream, rent, buy, last_updated")
          .eq("film_id", filmId)
          .eq("country_code", userCountry)
          .maybeSingle();

        // Check if stale (older than 7 days)
        const isStale = dbData && (new Date().getTime() - new Date(dbData.last_updated).getTime() > 7 * 24 * 60 * 60 * 1000);

        if (dbData && !isStale) {
          setAvailability({
            stream: (dbData.stream as any) || [],
            rent: (dbData.rent as any) || [],
            buy: (dbData.buy as any) || [],
          });
        } else {
          // 2. Fetch from Edge Function
          const { data: tmdbResponse, error } = await supabase.functions.invoke("tmdb-providers", {
            body: { tmdbId, type: type === "tv" ? "tv" : "movie" },
          });

          if (error) throw error;

          const results = tmdbResponse.results?.[userCountry];
          const newData: AvailabilityData = {
            stream: results?.flatrate || [],
            rent: results?.rent || [],
            buy: results?.buy || [],
          };

          setAvailability(newData);

          // 3. Update Cache
          await cacheAvailability(filmId, userCountry, newData);
        }
      } catch (error) {
        console.error("Error fetching availability:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [filmId, tmdbId, type, userCountry, initialData]); // Dependencies

  return { availability, loading };
}

async function cacheAvailability(filmId: string, country: string, data: AvailabilityData) {
  try {
     await supabase.from("film_availability").upsert({
         film_id: filmId,
         country_code: country,
         stream: data.stream,
         rent: data.rent,
         buy: data.buy,
         last_updated: new Date().toISOString()
     }, { onConflict: 'film_id, country_code' });
  } catch (err) {
      console.error("Error caching availability:", err);
  }
}
