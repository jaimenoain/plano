import { useState, useEffect, useRef, useCallback } from "react";

/** Shape aligned with legacy AutocompletePrediction fields used in the app UI */
export type PlaceAutocompletePrediction = {
  place_id: string;
  description: string;
  structured_formatting?: { main_text: string };
};

/**
 * Maps legacy AutocompletionRequest.type groups to new Places Autocomplete
 * {@link google.maps.places.AutocompleteRequest.includedPrimaryTypes} (max 5).
 */
function legacyTypesToIncludedPrimary(types: string[] | undefined): string[] | undefined {
  if (!types?.length) return undefined;
  if (types.includes("(regions)")) {
    return [
      "locality",
      "administrative_area_level_1",
      "country",
      "postal_code",
      "administrative_area_level_2",
    ];
  }
  if (types.includes("(cities)")) {
    return ["locality", "postal_code"];
  }
  /** Venues + street-level components (events “Where”, building address search). */
  if (types.includes("(addresses)")) {
    return ["establishment", "point_of_interest", "premise", "street_address", "route"];
  }
  const flat = types.filter((t) => !t.startsWith("("));
  if (!flat.length) return undefined;
  return flat.slice(0, 5);
}

function canUseNewAutocomplete(): boolean {
  const places = window.google?.maps?.places;
  return typeof places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions === "function";
}

// Tracks whether the new Places API has been confirmed working.
// Starts as true (optimistic), gets flipped to false on first failure so
// subsequent requests go directly to the legacy AutocompleteService.
let newApiConfirmed = true;

/** Soft bias for autocomplete — nudges results toward a point, never restricts. */
export type LocationBias = { lat: number; lng: number; radiusMeters?: number };

async function fetchSuggestionsNew(
  input: string,
  types: string[] | undefined,
  locationBias: LocationBias | undefined,
): Promise<PlaceAutocompletePrediction[]> {
  const includedPrimaryTypes = legacyTypesToIncludedPrimary(types);
  const request: google.maps.places.AutocompleteRequest = {
    input,
    ...(includedPrimaryTypes?.length ? { includedPrimaryTypes } : {}),
    ...(locationBias
      ? {
          locationBias: {
            center: { lat: locationBias.lat, lng: locationBias.lng },
            radius: locationBias.radiusMeters ?? 50000,
          },
        }
      : {}),
  };
  const { suggestions: raw } =
    await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
  const data: PlaceAutocompletePrediction[] = [];
  for (const s of raw) {
    const pp = s.placePrediction;
    if (!pp) continue;
    data.push({
      place_id: pp.placeId,
      description: pp.text.text,
      structured_formatting: { main_text: pp.mainText?.text ?? pp.text.text },
    });
  }
  return data;
}

function fetchSuggestionsLegacy(
  input: string,
  types: string[] | undefined,
): Promise<PlaceAutocompletePrediction[]> {
  return new Promise((resolve, reject) => {
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, types }, (predictions, status) => {
      const S = google.maps.places.PlacesServiceStatus;
      if (status === S.ZERO_RESULTS || !predictions) {
        resolve([]);
        return;
      }
      if (status !== S.OK) {
        reject(new Error(status));
        return;
      }
      resolve(
        predictions.map((p) => ({
          place_id: p.place_id,
          description: p.description,
          structured_formatting: p.structured_formatting
            ? { main_text: p.structured_formatting.main_text }
            : undefined,
        })),
      );
    });
  });
}

async function fetchSuggestions(
  input: string,
  types: string[] | undefined,
  legacyFallback: boolean,
  locationBias: LocationBias | undefined,
): Promise<PlaceAutocompletePrediction[]> {
  if (legacyFallback) {
    if (newApiConfirmed && canUseNewAutocomplete()) {
      try {
        const result = await fetchSuggestionsNew(input, types, locationBias);
        return result;
      } catch {
        // New API unavailable (e.g. 403 — "Places API (New)" not enabled on this key).
        // Fall back to the legacy AutocompleteService for the rest of the session.
        newApiConfirmed = false;
      }
    }
    return fetchSuggestionsLegacy(input, types);
  }

  if (!canUseNewAutocomplete()) {
    throw new Error("NEW_PLACES_AUTOCOMPLETE_UNAVAILABLE");
  }
  return fetchSuggestionsNew(input, types, locationBias);
}

export function useAutocompleteSuggestions(options: {
  types?: string[];
  debounce?: number;
  initOnMount?: boolean;
  defaultValue?: string;
  /**
   * When false, only {@link google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions}
   * is used (Places API New). When true (default), falls back to legacy AutocompleteService after failures.
   */
  legacyAutocompleteFallback?: boolean;
  /**
   * Optional soft bias toward a map location (e.g. the current viewport centre),
   * so generic queries resolve to the right area. Only applied on the new Places
   * API path; never restricts results.
   */
  locationBias?: LocationBias;
}) {
  const {
    types,
    debounce = 200,
    initOnMount = true,
    defaultValue = "",
    legacyAutocompleteFallback = true,
    locationBias,
  } = options;
  const legacyFallbackRef = useRef(legacyAutocompleteFallback);
  legacyFallbackRef.current = legacyAutocompleteFallback;
  const locationBiasRef = useRef(locationBias);
  locationBiasRef.current = locationBias;
  const [ready, setReady] = useState(false);
  const [value, setValueState] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<{
    loading: boolean;
    status: string;
    data: PlaceAutocompletePrediction[];
  }>({ loading: false, status: "", data: [] });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const typesRef = useRef(types);
  typesRef.current = types;

  const init = useCallback(() => {
    if (typeof window === "undefined") return;
    const allowLegacy = legacyFallbackRef.current;
    if (allowLegacy) {
      const hasLegacy = typeof window.google?.maps?.places?.AutocompleteService === "function";
      if (canUseNewAutocomplete() || hasLegacy) setReady(true);
    } else if (canUseNewAutocomplete()) {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!initOnMount) return;
    init();
  }, [initOnMount, init]);

  const clearSuggestions = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    requestSeqRef.current += 1;
    setSuggestions({ loading: false, status: "", data: [] });
  }, []);

  const runFetch = useCallback(
    async (input: string) => {
      if (!input.trim()) {
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        requestSeqRef.current += 1;
        setSuggestions({ loading: false, status: "", data: [] });
        return;
      }
      const allowLegacy = legacyFallbackRef.current;
      const hasLegacy = typeof window.google?.maps?.places?.AutocompleteService === "function";
      if (!canUseNewAutocomplete() && (!allowLegacy || !hasLegacy)) return;

      const seq = ++requestSeqRef.current;
      setSuggestions((s) => ({ ...s, loading: true }));

      try {
        const data = await fetchSuggestions(
          input,
          typesRef.current,
          allowLegacy,
          locationBiasRef.current,
        );
        if (seq !== requestSeqRef.current) return;
        setSuggestions({
          loading: false,
          status: data.length > 0 ? "OK" : "ZERO_RESULTS",
          data,
        });
      } catch {
        if (seq !== requestSeqRef.current) return;
        setSuggestions({ loading: false, status: "ERROR", data: [] });
      }
    },
    [],
  );

  const setValue = useCallback(
    (next: string, shouldFetch = true) => {
      setValueState(next);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (!shouldFetch) return;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void runFetch(next);
      }, debounce);
    },
    [debounce, runFetch],
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  return {
    ready,
    value,
    setValue,
    suggestions,
    clearSuggestions,
    init,
  };
}
