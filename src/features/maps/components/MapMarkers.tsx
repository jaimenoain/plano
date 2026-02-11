import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Marker, useMap, Popup } from 'react-map-gl';
import { ClusterResponse } from '../hooks/useMapData';
import { BuildingPopupContent } from './BuildingPopupContent';

interface MapMarkersProps {
  clusters: ClusterResponse[];
  highlightedId?: string | null;
  setHighlightedId: (id: string | null) => void;
}

export function MapMarkers({ clusters, highlightedId, setHighlightedId }: MapMarkersProps) {
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
      c.id === highlightedId // Match the ID directly
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

        return (
          <Marker
            key={key}
            longitude={cluster.lng}
            latitude={cluster.lat}
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
              } else {
                if (cluster.slug) {
                    window.open(`/building/${cluster.slug}`, '_blank');
                } else if (cluster.id) {
                    window.open(`/building/${cluster.id}`, '_blank');
                }
              }
            }}
          >
            <div
              className={`
                flex items-center justify-center rounded-full border border-white shadow-md transition-all hover:scale-110
                ${cluster.is_cluster
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-background text-foreground'
                }
              `}
              style={{
                width: cluster.is_cluster
                  ? cluster.count > 1000
                    ? '64px'
                    : cluster.count > 100
                      ? '48px'
                      : '32px'
                  : '32px',
                height: cluster.is_cluster
                  ? cluster.count > 1000
                    ? '64px'
                    : cluster.count > 100
                      ? '48px'
                      : '32px'
                  : '32px',
              }}
              onMouseEnter={() => !cluster.is_cluster && handleMouseEnter(String(cluster.id))}
              onMouseLeave={() => !cluster.is_cluster && handleMouseLeave()}
              data-testid={cluster.is_cluster ? "map-marker-cluster" : "map-marker-building"}
            >
              {cluster.is_cluster ? (
                cluster.count
              ) : (
                <div className="flex flex-col items-center justify-center text-[10px] font-medium leading-none">
                   {/* Show rating if available, otherwise a generic icon */}
                   {cluster.rating && cluster.rating > 0 ? (
                      <span>{cluster.rating.toFixed(1)}</span>
                   ) : (
                      <div className="h-2 w-2 rounded-full bg-foreground" />
                   )}
                </div>
              )}
            </div>
          </Marker>
        );
      }),
    [clusters, map, handleMouseEnter, handleMouseLeave]
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
          />
        </Popup>
      )}
    </>
  );
}
