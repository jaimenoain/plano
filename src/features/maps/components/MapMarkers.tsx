import { useMemo, useRef, useEffect, useCallback } from 'react';
import { Marker, useMap, Popup } from 'react-map-gl';
import { ClusterResponse } from '../hooks/useMapData';
import { BuildingPopupContent } from './BuildingPopupContent';
import { getPinStyle } from '../utils/pinStyling';
import { MapPin } from './MapPin';
import '../../../App.css';

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
  setHighlightedId: (id: string | null) => void;
  onRemoveFromCollection?: (id: string) => void;
  onAddCandidate?: (id: string) => void;
}

export function MapMarkers({
  clusters,
  highlightedId,
  setHighlightedId,
  onRemoveFromCollection,
  onAddCandidate
}: MapMarkersProps) {
  const { current: map } = useMap();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = useCallback((id: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setHighlightedId(id);
  }, [setHighlightedId]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setHighlightedId(null);
      timeoutRef.current = null;
    }, 300);
  }, [setHighlightedId]);

  // Find the active cluster based on the highlightedId
  const activeCluster = useMemo(() => {
    if (!highlightedId || !clusters.length) return null;

    const found = clusters.find(c =>
      !c.is_cluster && // Only single items
      String(c.id) === String(highlightedId) // Match the ID directly (ensure string comparison)
    );

    return found || null;
  }, [clusters, highlightedId]);

  const markers = useMemo(
    () =>
      clusters.map((cluster) => {
        // Determine the unique key for the marker
        const key = cluster.is_cluster
          ? `cluster-${cluster.id}-${cluster.count}`
          : `marker-${cluster.id}`;

        const isCluster = cluster.is_cluster;
        const buildingUrl = !isCluster ? (cluster.slug ? `/building/${cluster.slug}` : `/building/${cluster.id}`) : '#';

        const pinStyle = getPinStyle(cluster);
        const isHovered = String(highlightedId) === String(cluster.id);

        // Boost Z-Index if hovered
        const finalZIndex = isHovered ? 999 : pinStyle.zIndex;

        const content = (
          <MapPin
              style={pinStyle}
              isHovered={isHovered}
          >
              {/* Logic for children */}
              {cluster.is_cluster ? (
                  <span>{cluster.count}</span>
              ) : (
                  pinStyle.showContent && (
                     /* Keep existing Rating or fallback dot logic here if needed,
                        or leave empty if the Pin Style handles the visuals (e.g. dots)
                     */
                    // If it's a candidate, show a yellow dot inside
                    cluster.is_candidate ? (
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    ) : null
                  )
              )}
          </MapPin>
        );

        // Wrap non-cluster content with mouse handlers for hover effect
        const interactiveContent = (
          <div
            onMouseEnter={() => !isCluster && handleMouseEnter(String(cluster.id))}
            onMouseLeave={() => !isCluster && handleMouseLeave()}
            className="cursor-pointer" // Ensure pointer cursor
          >
            {content}
          </div>
        );

        return (
          <Marker
            key={key}
            longitude={cluster.lng}
            latitude={cluster.lat}
            style={{ zIndex: finalZIndex }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (cluster.is_cluster) {
                const expansionZoom = Math.min(
                  (map?.getZoom() || 0) + 2,
                  20
                );

                map?.flyTo({
                  center: [cluster.lng, cluster.lat],
                  zoom: expansionZoom,
                  duration: 500,
                });
              }
            }}
          >
            {isCluster ? (
                interactiveContent
            ) : (
                <a
                  href={buildingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-inherit no-underline"
                  aria-label={`View details for ${cluster.name || 'Building'}`}
                  onClick={(e) => {
                      // If it's a custom marker, prevent navigation and just select (highlight)
                      if (cluster.is_custom_marker) {
                          e.preventDefault();
                          handleMouseEnter(String(cluster.id));
                          return;
                      }

                      // On first tap/click, if not already highlighted, prevent navigation and show popup
                      if (String(highlightedId) !== String(cluster.id)) {
                          e.preventDefault();
                          handleMouseEnter(String(cluster.id));
                      }
                  }}
                  onMouseEnter={() => handleMouseEnter(String(cluster.id))}
                  onMouseLeave={() => handleMouseLeave()}
                >
                    {content}
                </a>
            )}
          </Marker>
        );
      }),
    [clusters, map, handleMouseEnter, handleMouseLeave, highlightedId]
  );

  return (
    <>
      {markers}
      {activeCluster && (
        <Popup
          longitude={activeCluster.lng}
          latitude={activeCluster.lat}
          offset={20}
          closeButton={false}
          closeOnClick={false}
          className="z-[100] map-popup-test"
          maxWidth="300px"
        >
          <BuildingPopupContent
            cluster={activeCluster}
            onMouseEnter={() => handleMouseEnter(String(activeCluster.id))}
            onMouseLeave={handleMouseLeave}
            onRemoveFromCollection={onRemoveFromCollection}
            onAddCandidate={onAddCandidate}
          />
        </Popup>
      )}
    </>
  );
}
