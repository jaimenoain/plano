import { useRef, useCallback, useEffect } from 'react';
/**
 * useStableMapUpdate
 *
 * Manages the friction between "High Frequency Map Dragging" and "Low Frequency URL Updates".
 *
 * @param setURL Function to update the URL state.
 * @param delay Debounce delay in milliseconds (default 500ms).
 */
export function useStableMapUpdate(setURL, delay = 500) {
    const timerRef = useRef(null);
    const latestStateRef = useRef(null);
    // Clear timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);
    const updateMapState = useCallback((newState, immediate = false) => {
        latestStateRef.current = newState;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (immediate) {
            setURL(newState);
        }
        else {
            timerRef.current = setTimeout(() => {
                setURL(newState);
                timerRef.current = null;
            }, delay);
        }
    }, [setURL, delay]);
    return { updateMapState };
}
