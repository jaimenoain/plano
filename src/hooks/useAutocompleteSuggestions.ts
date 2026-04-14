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

export function useAutocompleteSuggestions(options: {
  types?: string[];
  debounce?: number;
  initOnMount?: boolean;
  defaultValue?: string;
}) {
  const { types, debounce = 200, initOnMount = true, defaultValue = "" } = options;
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
    if (canUseNewAutocomplete()) setReady(true);
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
      if (!canUseNewAutocomplete()) return;

      const seq = ++requestSeqRef.current;
      setSuggestions((s) => ({ ...s, loading: true }));

      const includedPrimaryTypes = legacyTypesToIncludedPrimary(typesRef.current);
      const request: google.maps.places.AutocompleteRequest = {
        input,
        ...(includedPrimaryTypes?.length ? { includedPrimaryTypes } : {}),
      };

      try {
        const { suggestions: raw } =
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (seq !== requestSeqRef.current) return;

        const data: PlaceAutocompletePrediction[] = [];
        for (const s of raw) {
          const pp = s.placePrediction;
          if (!pp) continue;
          data.push({
            place_id: pp.placeId,
            description: pp.text.text,
            structured_formatting: {
              main_text: pp.mainText?.text ?? pp.text.text,
            },
          });
        }
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
