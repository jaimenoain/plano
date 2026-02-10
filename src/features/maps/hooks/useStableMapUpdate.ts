import { useRef, useCallback, useEffect } from 'react';

/**
 * useStableMapUpdate
 *
 * Manages the friction between "High Frequency Map Dragging" and "Low Frequency URL Updates".
 *
 * @param setURL Function to update the URL state.
 * @param delay Debounce delay in milliseconds (default 500ms).
 */
export function useStableMapUpdate<T>(
  setURL: (state: T) => void,
  delay: number = 500
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestStateRef = useRef<T | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const updateMapState = useCallback((newState: T, immediate: boolean = false) => {
    latestStateRef.current = newState;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (immediate) {
      setURL(newState);
    } else {
      timerRef.current = setTimeout(() => {
        setURL(newState);
        timerRef.current = null;
      }, delay);
    }
  }, [setURL, delay]);

  return { updateMapState };
}
